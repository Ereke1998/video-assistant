"""ШАГ 5. Сборка ролика (бесплатно, всё делает ffmpeg на вашем компьютере).

Что делает:
  1. Подгоняет каждый клип из папки scenes/ под длину своей сцены:
     кадр 1080×1920, обрезка или лёгкое замедление.
     Если клипа ещё нет, ставит тёмную заглушку «СЦЕНА N».
  2. Делает анимированные субтитры (subtitles.ass + subtitles.srt): каждое слово
     проявляется в момент, когда его произносят. Стиль выбирается в project.json → subtitles.style:
       "cinema"    — широкий гротеск Unbounded + ключевые слова курсивной антиквой с золотым свечением
       "neon"      — неоновое караоке: фраза видна приглушённо, слова «зажигаются» под голос
       "reference" — как на референсе: жирный строчный Montserrat + ключевые слова на жёлтой плашке
  3. Сводит звук: голос + музыка (приглушается под речь) + звуковые акценты, итог −14 LUFS.
     Музыка: ваш файл из папки music/ или сгенерированная audio/music_generated.wav.

Результат: reels_final.mp4 (если есть все клипы) или reels_preview.mp4.
Запуск:
  python3 4_build.py                              — собрать ролик
  python3 4_build.py --subs-only --style neon     — только файл субтитров (для проб)
"""
import argparse
import re
import subprocess

from common import (AUDIO, BUILD, MUSIC, PLAN_FILE, ROOT, SCENES, TIMINGS_FILE, check_tools, fail,
                    fmt, load_json, load_project, media_duration, run)

AUDIO_EXT = (".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac")
SEG_ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p"]
VOICE_LUFS = -16.0


# =====================================================================
#  СУБТИТРЫ
# =====================================================================

def n_words(s):
    return sum(1 for tok in s.split() if any(c.isalnum() for c in tok))


def auto_chunks(text):
    chunks, cur = [], []
    for tok in text.split():
        cur.append(tok)
        if n_words(" ".join(cur)) >= 3 or tok[-1] in ".,?!:;":
            chunks.append(" ".join(cur))
            cur = []
    if cur:
        chunks.append(" ".join(cur))
    return chunks


def subtitle_events(project, timings):
    """Блоки субтитров (2–4 слова) со временем каждого слова."""
    by_id = {p["id"]: p for p in project["phrases"]}
    events = []
    for ph in timings["phrases"]:
        words = ph["words"]
        chunks = [c.strip() for c in by_id[ph["id"]].get("subtitles", "").split("|") if c.strip()]
        if sum(n_words(c) for c in chunks) != len(words):
            print(f"⚠️  Фраза {ph['id']}: в субтитрах другое число слов, чем в озвучке. Разбиваю автоматически.")
            chunks = auto_chunks(ph["text"])
        i = 0
        for c in chunks:
            n = n_words(c)
            if n == 0:
                continue
            ws = words[i:i + n]
            i += n
            events.append({"text": c, "words": ws, "start": max(0.0, ws[0]["start"] - 0.05), "last": ws[-1]["end"]})
    total = timings["total"]
    for k, ev in enumerate(events):
        nxt = events[k + 1]["start"] if k + 1 < len(events) else None
        if nxt is None:
            end = min(total, ev["last"] + 0.8)
        elif nxt - ev["last"] < 0.7:
            end = nxt
        else:
            end = ev["last"] + 0.3
        if end - ev["start"] < 0.4 and (nxt is None or ev["start"] + 0.4 <= nxt):
            end = ev["start"] + 0.4
        ev["end"] = end
    return events


def tokens(ev, keywords):
    """Слова блока: текст, время произнесения, входит ли в ключевую фразу."""
    toks, wi = [], 0
    for raw in ev["text"].split():
        if any(c.isalnum() for c in raw):
            toks.append({"text": raw, "t": ev["words"][wi]["start"], "kw": False})
            wi += 1
        elif toks:
            toks[-1]["text"] += " " + raw   # тире и т.п. — к предыдущему слову
    for t in toks:
        t["text"] = re.sub(r"[.,:;]+$", "", t["text"])   # точки и запятые не показываем
    plain = [re.sub(r"[^\w]", "", t["text"]).lower() for t in toks]
    for kw in keywords:
        kws = kw.lower().split()
        for i in range(len(plain) - len(kws) + 1):
            if plain[i:i + len(kws)] == kws:
                for j in range(i, i + len(kws)):
                    toks[j]["kw"] = True
    for i, t in enumerate(toks):   # отступы вокруг ключевой фразы (для плашки)
        t["pad_before"] = t["kw"] and (i == 0 or not toks[i - 1]["kw"])
        t["pad_after"] = t["kw"] and (i == len(toks) - 1 or not toks[i + 1]["kw"])
    return toks


def ass_time(t):
    cs = int(round(max(0.0, t) * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def srt_time(t):
    ms = int(round(max(0.0, t) * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def ass_color(hex_rgb):
    h = hex_rgb.lstrip("#").upper()
    return f"&H{h[4:6]}{h[2:4]}{h[0:2]}&"


def style_cinema(tok, rel, layer, c):
    """Кино: широкий Unbounded капсом + ключевые слова курсивной антиквой Playfair с золотым свечением."""
    if tok["kw"]:
        head, txt = r"\fnPlayfair Display\b900\i1\fs84\fsp0", tok["text"].lower()
    else:
        head, txt = r"\fnUnbounded\b700\i0\fs60\fsp3", tok["text"].upper()
    if layer == 0:   # мягкая тень под текстом — читается на любом фоне
        look = r"\1c&H000000&\3c&H000000&\bord7\blur16\alpha&HFF&" + rf"\t({rel},{rel + 260},\1a&H55&\3a&H80&)"
    elif tok["kw"]:
        look = (rf"\1c{c['yellow']}\3c{c['glow']}\bord6\blur10\alpha&HFF&"
                rf"\t({rel},{rel + 300},\1a&H00&\3a&H40&)")
    else:
        look = r"\1c&HFFFFFF&\bord0\blur9\alpha&HFF&" + rf"\t({rel},{rel + 260},\alpha&H00&\blur0)"
    return "{" + head + look + "}" + txt


def style_neon(tok, rel, layer, c):
    """Неоновое караоке: фраза видна приглушённо, слова «зажигаются» под голос."""
    head, txt = r"\fnUnbounded\b900\i0\fs56\fsp1", tok["text"].upper()
    if layer == 0:
        look = r"\1c&H000000&\3c&H000000&\bord7\blur16\1a&H70&\3a&H90&"
    elif tok["kw"]:
        look = (rf"\1c&HFFFFFF&\3c{c['glow']}\bord6\blur11\1a&HB0&\3a&HFF&"
                rf"\t({rel},{rel + 140},\1c{c['yellow']}\1a&H00&\3a&H30&)")
    else:
        look = (r"\1c&HFFFFFF&\3c&HFFC080&\bord3\blur7\1a&HB0&\3a&HFF&"
                rf"\t({rel},{rel + 140},\1a&H00&\3a&HA0&)")
    return "{" + head + look + "}" + txt


def style_reference(tok, rel, layer, c):
    """Как на референсе: жирный строчный Montserrat + ключевые слова чёрным на жёлтой плашке."""
    head = r"\fnMontserrat\b900\i0\fs74\fsp-1"
    if tok["kw"]:
        txt = ("\\h" if tok["pad_before"] else "") + tok["text"].upper() + ("\\h" if tok["pad_after"] else "")
        if layer == 0:
            look = r"\alpha&HFF&"
        else:
            look = (rf"\1c&H101010&\3c{c['yellow']}\4c&H000000&\bord15\shad7\blur0.8\alpha&HFF&"
                    rf"\t({rel},{rel + 160},\1a&H00&\3a&H00&\4a&H70&)")
    else:
        txt = tok["text"].lower()
        if layer == 0:
            look = r"\1c&H000000&\3c&H000000&\bord7\blur16\alpha&HFF&" + rf"\t({rel},{rel + 200},\1a&H55&\3a&H80&)"
        else:
            look = r"\1c&HFFFFFF&\bord0\blur7\alpha&HFF&" + rf"\t({rel},{rel + 200},\alpha&H00&\blur0)"
    return "{" + head + look + "}" + txt


STYLES = {"cinema": style_cinema, "neon": style_neon, "reference": style_reference}


def write_subtitles(events, project, style=None):
    st, v = project["subtitles"], project["video"]
    style = style or st.get("style", "cinema")
    if style not in STYLES:
        fail(f"Неизвестный стиль субтитров «{style}». Доступны: {', '.join(STYLES)}")
    render = STYLES[style]
    colors = {"yellow": ass_color(st["highlight_color"]), "glow": ass_color(st.get("glow_color", "#FF8A3D"))}
    x, y = v["width"] // 2, v["height"] - st["margin_bottom_px"]
    ass = [
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {v['width']}", f"PlayResY: {v['height']}",
        "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, "
        "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        "Style: Main,Unbounded,50,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,"
        "0,0,0,0,100,100,0,0,1,0,0,2,120,120,0,1",
        "", "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    srt = []
    for k, ev in enumerate(events, 1):
        toks = tokens(ev, st["keywords"])
        motion = rf"{{\an2\move({x},{y + 16},{x},{y},0,320)\fad(0,140)}}"
        for layer in (0, 1):
            body = " ".join(render(t, int((t["t"] - ev["start"]) * 1000), layer, colors) for t in toks)
            ass.append(f"Dialogue: {layer},{ass_time(ev['start'])},{ass_time(ev['end'])},Main,,0,0,0,,{motion}{body}")
        srt += [str(k), f"{srt_time(ev['start'])} --> {srt_time(ev['end'])}", " ".join(t["text"] for t in toks), ""]
    (ROOT / "subtitles.ass").write_text("\n".join(ass) + "\n", encoding="utf-8")
    (ROOT / "subtitles.srt").write_text("\n".join(srt), encoding="utf-8")
    return style


# =====================================================================
#  ВИДЕО
# =====================================================================

def make_segment(sc, video, out, font):
    w, h, fps = video["width"], video["height"], video["fps"]
    frames = sc["frames"]
    need = frames / fps
    src = SCENES / f"scene_{sc['id']:02d}.mp4"
    if src.exists():
        d = media_duration(src)
        vf = [f"scale={w}:{h}:force_original_aspect_ratio=increase:flags=lanczos", f"crop={w}:{h}", "setsar=1"]
        note = f"клип {d:.1f} с"
        if d < need:
            factor = min(need / d, video["max_slowdown"])
            vf.append(f"setpts={factor:.4f}*PTS")
            note += f", замедлен ×{factor:.2f}"
            if d * factor < need:
                vf.append(f"tpad=stop_mode=clone:stop_duration={need - d * factor + 0.2:.3f}")
                note += ", последний кадр удержан"
        else:
            note += f", обрезан до {need:.2f} с"
        vf.append(f"fps={fps}")
        cmd = ["ffmpeg", "-y", "-i", src, "-an", "-vf", ",".join(vf), "-frames:v", frames, *SEG_ENC, out]
        has_clip = True
    else:
        bg = (f"gradients=s={w}x{h}:r={fps}:c0=0x08142e:c1=0x2a1406:x0=0:y0=0:x1={w}:y1={h}"
              f":speed=0.008:d={need + 0.5:.3f}")
        txt = (f"drawtext=font={font}:text='СЦЕНА {sc['id']}':fontsize=120:fontcolor=white@0.35"
               f":x=(w-tw)/2:y=h*0.30,"
               f"drawtext=font={font}:text='клип ещё не готов':fontsize=48:fontcolor=white@0.3"
               f":x=(w-tw)/2:y=h*0.30+150")
        cmd = ["ffmpeg", "-y", "-f", "lavfi", "-i", bg, "-vf", txt, "-frames:v", frames, *SEG_ENC, out]
        note = "НЕТ КЛИПА → заглушка"
        has_clip = False
    run(cmd)
    return has_clip, note


# =====================================================================
#  ЗВУК
# =====================================================================

def lufs(path):
    res = subprocess.run(["ffmpeg", "-nostats", "-i", str(path), "-af", "ebur128", "-f", "null", "-"],
                         capture_output=True, text=True)
    found = re.findall(r"I:\s+(-?[\d.]+) LUFS", res.stderr)
    return float(found[-1]) if found else None


def find_music():
    if MUSIC.exists():
        for f in sorted(MUSIC.iterdir()):
            if f.suffix.lower() in AUDIO_EXT:
                return f, True
    gen = AUDIO / "music_generated.wav"
    return (gen, False) if gen.exists() else (None, False)


# =====================================================================

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--style", help="стиль субтитров: cinema / neon / reference")
    ap.add_argument("--subs-only", action="store_true", help="только записать subtitles.ass")
    args = ap.parse_args()

    check_tools()
    if not PLAN_FILE.exists():
        fail("Сначала выполните шаги 2 и 3: python3 1_voiceover.py, затем python3 2_plan_scenes.py")
    project, timings, plan = load_project(), load_json(TIMINGS_FILE), load_json(PLAN_FILE)
    video = project["video"]
    fps = video["fps"]
    BUILD.mkdir(exist_ok=True)

    style = write_subtitles(subtitle_events(project, timings), project, args.style)
    print(f"Субтитры: subtitles.ass, subtitles.srt (стиль «{style}»)")
    if args.subs_only:
        return

    print("\nСцена | Начало   | Длит.  | Что взято")
    all_clips = True
    for sc in plan["scenes"]:
        has_clip, note = make_segment(sc, video, BUILD / f"seg_{sc['id']:02d}.mp4", "Inter")
        all_clips &= has_clip
        print(f"  {sc['id']}   | {fmt(sc['start'])} | {sc['frames'] / fps:5.2f}с | {note}")
    (BUILD / "segments.txt").write_text(
        "".join(f"file 'seg_{sc['id']:02d}.mp4'\n" for sc in plan["scenes"]), encoding="utf-8")

    total = sum(sc["frames"] for sc in plan["scenes"]) / fps
    fi, fo = video["fade_in_sec"], video["fade_out_sec"]
    vf = (f"[0:v]fade=t=in:st=0:d={fi},fade=t=out:st={total - fo:.3f}:d={fo},"
          f"ass=subtitles.ass:fontsdir=fonts[v]")
    voice = ROOT / "audio" / "voiceover.wav"
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", BUILD / "segments.txt", "-i", voice]

    # громкость: голос → −16 LUFS, музыка и акценты — на заданное число дБ тише голоса
    v_gain = VOICE_LUFS - lufs(voice)
    chains = [f"[1:a]aresample=48000,aformat=channel_layouts=stereo,volume={v_gain:.2f}dB,asplit=2[vo][sc]"]
    mix_inputs, idx = "[vo]", 2
    music, is_user = find_music()
    if music:
        m = project["music"]
        if is_user:
            cmd += ["-stream_loop", "-1"]
        cmd += ["-i", music]
        m_gain = VOICE_LUFS - m.get("db_below_voice", 14) - lufs(music)
        fades = (f"afade=t=in:d={m['fade_in_sec']},afade=t=out:st={total - m['fade_out_sec']:.3f}:d={m['fade_out_sec']},"
                 if is_user else "")
        chains += [f"[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration={total:.3f},"
                   f"asetpts=PTS-STARTPTS,{fades}volume={m_gain:.2f}dB[mu]",
                   "[mu][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[duck]"]
        mix_inputs += "[duck]"
        idx += 1
        print(f"\nМузыка: {music.name}" + (" (ваш трек)" if is_user else " (сгенерирована)") +
              f", на {m.get('db_below_voice', 14)} дБ тише голоса, приглушается под речь")
    else:
        chains.append("[sc]anullsink")
        print("\nМузыка: нет")
    sfx = AUDIO / "sfx_generated.wav"
    if sfx.exists() and project.get("sfx", {}).get("enabled", True):
        cmd += ["-i", sfx]
        s_gain = VOICE_LUFS - project.get("sfx", {}).get("db_below_voice", 9) - lufs(sfx)
        chains.append(f"[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration={total:.3f},"
                      f"volume={s_gain:.2f}dB[fx]")
        mix_inputs += "[fx]"
        print("Акценты (SFX): sfx_generated.wav")
    n_in = mix_inputs.count("[")
    chains.append(f"{mix_inputs}amix=inputs={n_in}:duration=first:normalize=0,"
                  f"loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]")

    out = ROOT / ("reels_final.mp4" if all_clips else "reels_preview.mp4")
    cmd += ["-filter_complex", vf + ";" + ";".join(chains), "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}",
            "-r", fps, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            "-movflags", "+faststart", out]
    run(cmd, cwd=ROOT)
    print(f"\n✅ Готово: {out}  ({media_duration(out):.2f} сек, 1080×1920)")
    if not all_clips:
        print("   Это превью: вместо недостающих клипов стоят заглушки.")


if __name__ == "__main__":
    main()
