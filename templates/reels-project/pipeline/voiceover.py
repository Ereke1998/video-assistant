"""Шаг 2. Автоматическая озвучка по сценам + таймлайн.
edge-tts: нейроголос (ru-RU / kk-KZ). preview: тишина расчётной длины — для офлайн-превью без сети.
Длительность каждой сцены = длина её аудио + pad_after_sec → build/timeline.json (кадры для Remotion)."""
import asyncio, json, shutil
from common import load_config, p, run, duration, words_of

cfg = load_config(); vo = cfg["voiceover"]; lang = cfg["project"]["language"]; fps = cfg["format"]["fps"]
script = json.loads(p(cfg["script"]["output_json"]).read_text(encoding="utf-8"))
tmp = p("build/audio/scenes"); shutil.rmtree(tmp, ignore_errors=True); tmp.mkdir(parents=True)


async def tts(text, out):
    import edge_tts  # pip install edge-tts
    await edge_tts.Communicate(text, vo["voices"][lang], rate=vo["rate"], pitch=vo["pitch"]).save(str(out))


parts, timeline, t = [], [], 0.0
for i, s in enumerate(script["scenes"]):
    raw, wav = tmp / f"{i:02}_{s['id']}.mp3", tmp / f"{i:02}_{s['id']}.wav"
    if vo["engine"] == "edge-tts" and s["voice"].strip():
        asyncio.run(tts(s["voice"], raw))
        run(["ffmpeg", "-y", "-i", raw, "-af", f"apad=pad_dur={vo['pad_after_sec']}", "-ar", "48000", "-ac", "1", wav])
    else:
        d = max(len(words_of(s["voice"])) / script["pace_wps"], 1.0) + vo["pad_after_sec"]
        run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", f"{d:.3f}", wav])
    d = duration(wav)
    timeline.append({"id": s["id"], "start": round(t, 3), "end": round(t + d, 3),
                     "from": round(t * fps), "frames": round(d * fps)})
    parts.append(wav); t += d

lst = tmp / "list.txt"; lst.write_text("".join(f"file '{x.name}'\n" for x in parts))
out = p(vo["output"])
run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst,
     "-af", f"loudnorm=I={vo['lufs']}:TP=-1.5:LRA=11", "-b:a", "192k", out])
tl = {"total_sec": round(t, 3), "total_frames": round(t * fps), "fps": fps, "engine": vo["engine"], "scenes": timeline}
p(vo["timeline_json"]).write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"озвучка {t:.1f} с ({vo['engine']}) -> {vo['output']}, {vo['timeline_json']}")
