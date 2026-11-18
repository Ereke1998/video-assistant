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


parts, timeline, bounds, t = [], [], [], 0.0
for i, s in enumerate(script["scenes"]):
    raw, wav = tmp / f"{i:02}_{s['id']}.mp3", tmp / f"{i:02}_{s['id']}.wav"
    if vo["engine"] == "edge-tts" and s["voice_plain"].strip():
        for attempt in range(3):
            try:
                ws = asyncio.run(tts(s["voice_plain"], raw)); break
            except Exception as e:  # сетевой сбой — повтор
                if attempt == 2: raise
                print(f"retry {s['id']}: {e}")
        run(["ffmpeg", "-y", "-i", raw, "-af", f"apad=pad_dur={vo['pad_after_sec']}", "-ar", "48000", "-ac", "1", wav])
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
