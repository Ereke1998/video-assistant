"""ШАГ 5. Сборка ролика (бесплатно, всё делает ffmpeg на вашем компьютере).

Что делает:
  1. Подгоняет каждый клип из папки scenes/ под длину своей сцены:
     кадр 1080×1920, обрезка или лёгкое замедление.
     Если клипа ещё нет, ставит тёмную заглушку «СЦЕНА N». Так можно бесплатно проверить ритм.
  2. Делает субтитры (subtitles.ass и subtitles.srt) по времени слов из озвучки.
  3. Склеивает видео, озвучку, музыку (если положить файл в папку music/) и субтитры.

Результат: reels_final.mp4 (если есть все клипы) или reels_preview.mp4 (если каких-то нет).
Запуск:  python 4_build.py
"""
import re

from common import (BUILD, MUSIC, PLAN_FILE, ROOT, SCENES, TIMINGS_FILE, check_tools, fail,
                    fmt, load_json, load_project, media_duration, run)

AUDIO_EXT = (".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac")
SEG_ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p"]


# ---------- субтитры ----------

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
    by_id = {p["id"]: p for p in project["phrases"]}
    events = []
    for ph in timings["phrases"]:
        words = ph["words"]
        chunks = [c.strip() for c in by_id[ph["id"]].get("subtitles", "").split("|") if c.strip()]
        if sum(n_words(c) for c in chunks) != len(words):
            print(f"⚠️  Фраза {ph['id']}: в субтитрах другое число слов, чем в озвучке. "
                  f"Разбиваю автоматически.")
            chunks = auto_chunks(ph["text"])
        i = 0
        for c in chunks:
            n = n_words(c)
            if n == 0:
                continue
            ws = words[i:i + n]
            i += n
            events.append({"text": c, "start": max(0.0, ws[0]["start"] - 0.05), "last": ws[-1]["end"]})
    total = timings["total"]
    for k, ev in enumerate(events):
        nxt = events[k + 1]["start"] if k + 1 < len(events) else None
        if nxt is None:
            end = min(total, ev["last"] + 0.8)
        elif nxt - ev["last"] < 0.7:
            end = nxt                      # держим текст до следующего блока
        else:
            end = ev["last"] + 0.3
        if end - ev["start"] < 0.4 and (nxt is None or ev["start"] + 0.4 <= nxt):
            end = ev["start"] + 0.4
        ev["end"] = end
    return events


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


def write_subtitles(events, project):
    st, v = project["subtitles"], project["video"]
    color = ass_color(st["highlight_color"])
    ass = [
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {v['width']}", f"PlayResY: {v['height']}",
        "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, "
        "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Main,{st['font']},{st['font_size']},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,"
        f"-1,0,0,0,100,100,0,0,1,{st['outline']},{st['shadow']},2,140,140,{st['margin_bottom_px']},1",
        "", "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    srt = []
    for k, ev in enumerate(events, 1):
        text = ev["text"].upper() if st["uppercase"] else ev["text"]
        text = re.sub(r"[.,:;]+$", "", text)   # точки и запятые в конце не показываем
        styled = text
        for kw in st["keywords"]:
            styled = re.sub(re.escape(kw),
                            lambda m: "{\\1c" + color + "}" + m.group(0) + "{\\1c&HFFFFFF&}",
                            styled, flags=re.IGNORECASE)
        pop = r"{\fad(80,0)\fscx90\fscy90\t(0,110,\fscx100\fscy100)}"
        ass.append(f"Dialogue: 0,{ass_time(ev['start'])},{ass_time(ev['end'])},Main,,0,0,0,,{pop}{styled}")
        srt += [str(k), f"{srt_time(ev['start'])} --> {srt_time(ev['end'])}", text, ""]
    (ROOT / "subtitles.ass").write_text("\n".join(ass) + "\n", encoding="utf-8")
    (ROOT / "subtitles.srt").write_text("\n".join(srt), encoding="utf-8")


# ---------- видео ----------

def make_segment(sc, video, out):
    w, h, fps = video["width"], video["height"], video["fps"]
    frames = sc["frames"]
    need = frames / fps
    src = SCENES / f"scene_{sc['id']:02d}.mp4"
    if src.exists():
        d = media_duration(src)
        vf = [f"scale={w}:{h}:force_original_aspect_ratio=increase:flags=lanczos",
              f"crop={w}:{h}", "setsar=1"]
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
        txt = (f"drawtext=font={project_font}:text='СЦЕНА {sc['id']}':fontsize=120:fontcolor=white@0.35"
               f":x=(w-tw)/2:y=h*0.30,"
               f"drawtext=font={project_font}:text='клип ещё не готов':fontsize=48:fontcolor=white@0.3"
               f":x=(w-tw)/2:y=h*0.30+150")
        cmd = ["ffmpeg", "-y", "-f", "lavfi", "-i", bg, "-vf", txt, "-frames:v", frames, *SEG_ENC, out]
        note = "НЕТ КЛИПА → заглушка"
        has_clip = False
    run(cmd)
    return has_clip, note


def find_music():
    if MUSIC.exists():
        for f in sorted(MUSIC.iterdir()):
            if f.suffix.lower() in AUDIO_EXT:
                return f
    return None


def main():
    global project_font
    check_tools()
    if not PLAN_FILE.exists():
        fail("Сначала выполните шаги 2 и 3: python 1_voiceover.py, затем python 2_plan_scenes.py")
    project, timings, plan = load_project(), load_json(TIMINGS_FILE), load_json(PLAN_FILE)
    video = project["video"]
    project_font = project["subtitles"]["font"]
    fps = video["fps"]
    BUILD.mkdir(exist_ok=True)

    write_subtitles(subtitle_events(project, timings), project)
    print("Субтитры: subtitles.ass, subtitles.srt")

    print("\nСцена | Начало   | Длит.  | Что взято")
    all_clips = True
    for sc in plan["scenes"]:
        has_clip, note = make_segment(sc, video, BUILD / f"seg_{sc['id']:02d}.mp4")
        all_clips &= has_clip
        print(f"  {sc['id']}   | {fmt(sc['start'])} | {sc['frames'] / fps:5.2f}с | {note}")
    (BUILD / "segments.txt").write_text(
        "".join(f"file 'seg_{sc['id']:02d}.mp4'\n" for sc in plan["scenes"]), encoding="utf-8")

    total = sum(sc["frames"] for sc in plan["scenes"]) / fps
    fi, fo = video["fade_in_sec"], video["fade_out_sec"]
    vf = (f"[0:v]fade=t=in:st=0:d={fi},fade=t=out:st={total - fo:.3f}:d={fo},"
          f"ass=subtitles.ass[v]")
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", BUILD / "segments.txt",
           "-i", ROOT / "audio" / "voiceover.wav"]
    music = find_music()
    loud = "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000"
    if music:
        m = project["music"]
        cmd += ["-stream_loop", "-1", "-i", music]
        af = (f"[1:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[vo][sc];"
              f"[2:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration={total:.3f},"
              f"asetpts=PTS-STARTPTS,afade=t=in:d={m['fade_in_sec']},"
              f"afade=t=out:st={total - m['fade_out_sec']:.3f}:d={m['fade_out_sec']},"
              f"volume={m['volume']}[mu];"
              f"[mu][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[duck];"
              f"[vo][duck]amix=inputs=2:duration=first:normalize=0,{loud}[a]")
        print(f"\nМузыка: {music.name} (тише голоса, приглушается под речь)")
    else:
        af = f"[1:a]aresample=48000,aformat=channel_layouts=stereo,{loud}[a]"
        print("\nМузыка: нет (положите mp3/wav в папку music/, если нужна)")

    out = ROOT / ("reels_final.mp4" if all_clips else "reels_preview.mp4")
    cmd += ["-filter_complex", vf + ";" + af, "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}",
            "-r", fps, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            "-movflags", "+faststart", out]
    run(cmd, cwd=ROOT)
    print(f"\n✅ Готово: {out}  ({media_duration(out):.2f} сек, 1080×1920)")
    if not all_clips:
        print("   Это превью: вместо недостающих клипов стоят заглушки.")


project_font = "Inter"

if __name__ == "__main__":
    main()
