"""Шаг 2. Автоматическая озвучка по сценам + таймлайн + пословные тайминги от самого TTS.
edge-tts: нейроголос (ru-RU / kk-KZ), отдаёт WordBoundary — точное время каждого слова (Whisper не нужен).
preview: тишина расчётной длины — для офлайн-превью без сети.
Длительность сцены = длина её аудио + pad_after_sec → build/timeline.json (кадры для Remotion)."""
import asyncio, json, os, shutil
from common import load_config, p, run, duration, words_of

cfg = load_config(); vo = cfg["voiceover"]; lang = cfg["project"]["language"]; fps = cfg["format"]["fps"]
script = json.loads(p(cfg["script"]["output_json"]).read_text(encoding="utf-8"))
tmp = p("build/audio/scenes"); shutil.rmtree(tmp, ignore_errors=True); tmp.mkdir(parents=True)

# За корпоративным/облачным HTTPS-прокси: edge-tts берёт CA из certifi — подменяем на SSL_CERT_FILE, если задан.
if os.environ.get("SSL_CERT_FILE") or os.path.exists("/root/.ccr/ca-bundle.crt"):
    import certifi
    _ca = os.environ.get("SSL_CERT_FILE") or "/root/.ccr/ca-bundle.crt"
    certifi.where = lambda: _ca
PROXY = os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY")

# Обработка голоса (voiceover.fx): announcer — «дикторская» цепочка: срез гула, тепло, присутствие,
# де-эссер, мягкая компрессия. Делает синтез менее «стерильным», ближе к студийной записи.
FX = {
    "none": "",
    "announcer": ("highpass=f=75,equalizer=f=160:t=q:w=1:g=2.5,equalizer=f=450:t=q:w=1.4:g=-1.5,"
                  "equalizer=f=3200:t=q:w=1.2:g=2,deesser=i=0.35,"
                  "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=140:makeup=2,"),
}
fx = FX.get(vo.get("fx", "none"), "")


def elevenlabs(text, out, prev_text="", next_text=""):
    """ElevenLabs: живая интонация и ударения. Возвращает [(слово, start, end)] из посимвольного выравнивания.
    Ключ: ELEVENLABS_API_KEY (в облачной сессии заголовок xi-api-key подставляет прокси)."""
    import base64, ssl, urllib.request
    el = vo["elevenlabs"]
    body = {"text": text, "model_id": el["model_id"], "previous_text": prev_text, "next_text": next_text,
            "voice_settings": {k: el[k] for k in ("stability", "similarity_boost", "style", "use_speaker_boost", "speed") if k in el}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{el['voice_id']}/with-timestamps?output_format=mp3_44100_192",
                                 data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json", "xi-api-key": os.environ.get("ELEVENLABS_API_KEY", "set-by-proxy")})
    ctx = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or ("/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None))
    with urllib.request.urlopen(req, context=ctx, timeout=120) as r:
        res = json.loads(r.read())
    open(out, "wb").write(base64.b64decode(res["audio_base64"]))
    al = res.get("alignment") or res.get("normalized_alignment")
    words, cur, s0, e0 = [], "", None, None
    for ch, a, b in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
        if ch.isspace():
            if cur.strip(): words.append((cur, s0, e0))
            cur, s0 = "", None; continue
        if s0 is None: s0 = a
        cur += ch; e0 = b
    if cur.strip(): words.append((cur, s0, e0))
    return [w for w in words if any(c.isalnum() for c in w[0])]


async def tts(text, out):
    """Синтез + WordBoundary. Возвращает [(слово, start, end)] в секундах от начала фразы."""
    import edge_tts  # pip install edge-tts
    c = edge_tts.Communicate(text, vo["voices"][lang], rate=vo["rate"], pitch=vo["pitch"],
                             boundary="WordBoundary", proxy=PROXY)
    words = []
    with open(out, "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                s = ch["offset"] / 1e7
                words.append((ch["text"], s, s + ch["duration"] / 1e7))
    return words


def tighten(raw, words, wav):
    """Убирает «мёртвый воздух» TTS: хвост после последнего слова и затянутые паузы между фразами.
    Режет строго в тишине по WordBoundary, возвращает пересчитанные тайминги слов."""
    tr = vo.get("trim", {}); tail = tr.get("tail_sec", .12); cap = tr.get("max_pause_sec", .38); lead = tr.get("lead_sec", .05)
    if not words or not tr.get("enabled", True):
        run(["ffmpeg", "-y", "-i", raw, "-af", f"{fx}apad=pad_dur={vo['pad_after_sec']}", "-ar", "48000", "-ac", "1", wav]); return words
    keep, a = [], max(0.0, words[0][1] - lead)          # интервалы исходника, которые оставляем
    for (w, s0, e0), (_, s1, _) in zip(words, words[1:]):
        if s1 - e0 > cap:                                  # длинная пауза → оставляем cap/2 с каждой стороны
            keep.append((a, e0 + cap / 2)); a = s1 - cap / 2
    keep.append((a, words[-1][2] + tail))
    fc = "".join(f"[0:a]atrim={x:.3f}:{y:.3f},asetpts=PTS-STARTPTS[s{i}];" for i, (x, y) in enumerate(keep))
    fc += "".join(f"[s{i}]" for i in range(len(keep))) + f"concat=n={len(keep)}:v=0:a=1,{fx}apad=pad_dur={vo['pad_after_sec']}[o]"
    run(["ffmpeg", "-y", "-i", raw, "-filter_complex", fc, "-map", "[o]", "-ar", "48000", "-ac", "1", wav])
    def remap(x):                                          # время исходника → время после вырезов
        acc = 0.0
        for k0, k1 in keep:
            if x <= k1: return acc + max(0.0, x - k0)
            acc += k1 - k0
        return acc
    return [(w, remap(s0), remap(e0)) for w, s0, e0 in words]


parts, timeline, bounds, t = [], [], [], 0.0
for i, s in enumerate(script["scenes"]):
    raw, wav = tmp / f"{i:02}_{s['id']}.mp3", tmp / f"{i:02}_{s['id']}.wav"
    if vo["engine"] == "elevenlabs" and s["voice_plain"].strip():
        sc = script["scenes"]
        ws = elevenlabs(s["voice_plain"], raw, sc[i - 1]["voice_plain"] if i else "", sc[i + 1]["voice_plain"] if i + 1 < len(sc) else "")
        ws = tighten(raw, ws, wav)
        bounds += [{"word": w, "start": round(t + a, 3), "end": round(t + b, 3), "scene": s["id"]} for w, a, b in ws]
    elif vo["engine"] == "edge-tts" and s["voice_plain"].strip():
        for attempt in range(3):
            try:
                ws = asyncio.run(tts(s["voice_plain"], raw)); break
            except Exception as e:  # сетевой сбой — повтор
                if attempt == 2: raise
                print(f"retry {s['id']}: {e}")
        ws = tighten(raw, ws, wav)
        bounds += [{"word": w, "start": round(t + a, 3), "end": round(t + b, 3), "scene": s["id"]} for w, a, b in ws]
    else:
        d = max(len(words_of(s["voice_plain"])) / script["pace_wps"], 1.0) + vo["pad_after_sec"]
        run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", f"{d:.3f}", wav])
    d = duration(wav)
    timeline.append({"id": s["id"], "start": round(t, 3), "end": round(t + d, 3),
                     "from": round(t * fps), "frames": round(d * fps)})
    parts.append(wav); t += d

lst = tmp / "list.txt"; lst.write_text("".join(f"file '{x.name}'\n" for x in parts))
out = p(vo["output"])
run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst,
     "-af", f"loudnorm=I={vo['lufs']}:TP=-1.5:LRA=11", "-ar", "48000", "-b:a", "192k", out])
tl = {"total_sec": round(t, 3), "total_frames": round(t * fps), "fps": fps, "engine": vo["engine"], "scenes": timeline}
p(vo["timeline_json"]).write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
bf = p("build/audio/tts_words.json")
if bounds: bf.write_text(json.dumps(bounds, ensure_ascii=False, indent=1), encoding="utf-8")
elif bf.exists(): bf.unlink()
print(f"озвучка {t:.1f} с ({vo['engine']}, {len(bounds)} слов с таймингом) -> {vo['output']}, {vo['timeline_json']}")
