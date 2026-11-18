"""Шаг 2. Автонарезка: убирает паузы (ffmpeg silencedetect) и слова-паразиты (по таймингам Whisper).
Требует: build/audio/transcript.json (сначала transcribe.py на исходнике).
Выход: autocut.output + build/cuts/cut_map.json (старое время -> новое, для пересчёта субтитров)."""
import json, re
from common import load_config, p, run

cfg = load_config(); a = cfg["autocut"]
src = p(cfg["sources"]["main"])
dur = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]).stdout)

# 1) паузы
log = run(["ffmpeg", "-hide_banner", "-i", src, "-af",
           f"silencedetect=noise={a['silence_threshold_db']}dB:d={a['min_silence_sec']}", "-f", "null", "-"]).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
remove = [(s + a["keep_padding_sec"], e - a["keep_padding_sec"]) for s, e in zip(starts, ends + [dur])]

# 2) слова-паразиты (одно- и двухсловные)
if a["remove_fillers"]:
    lang = cfg["project"]["language"]
    fillers = {f.lower() for f in a["fillers"].get(lang, [])}
    words = json.loads(p(cfg["whisper"]["output_json"]).read_text(encoding="utf-8"))
    norm = lambda s: re.sub(r"[^\w\s]", "", s.lower()).strip()
    i = 0
    while i < len(words):
        pair = norm(words[i]["word"] + " " + words[i + 1]["word"]) if i + 1 < len(words) else None
        if pair in fillers:
            remove.append((words[i]["start"], words[i + 1]["end"])); i += 2; continue
        if norm(words[i]["word"]) in fillers:
            remove.append((words[i]["start"], words[i]["end"]))
        i += 1

# 3) слить вырезаемые интервалы -> интервалы, которые оставляем
remove = sorted((max(0, s), min(dur, e)) for s, e in remove if e > s)
merged = []
for s, e in remove:
    if merged and s <= merged[-1][1]: merged[-1][1] = max(merged[-1][1], e)
    else: merged.append([s, e])
keep, t = [], 0.0
for s, e in merged:
    if s - t >= a["min_segment_sec"]: keep.append((t, s))
    t = e
if dur - t >= a["min_segment_sec"]: keep.append((t, dur))

# 4) склейка через trim/atrim + concat
parts, labels = [], ""
for i, (s, e) in enumerate(keep):
    parts.append(f"[0:v]trim={s:.3f}:{e:.3f},setpts=PTS-STARTPTS[v{i}];"
                 f"[0:a]atrim={s:.3f}:{e:.3f},asetpts=PTS-STARTPTS[a{i}];")
    labels += f"[v{i}][a{i}]"
fc = "".join(parts) + f"{labels}concat=n={len(keep)}:v=1:a=1[v][a]"
script = p("build/cuts/filter.txt"); script.parent.mkdir(parents=True, exist_ok=True)
script.write_text(fc)
out = p(a["output"])
run(["ffmpeg", "-y", "-i", src, "-filter_complex_script", script, "-map", "[v]", "-map", "[a]",
     "-c:v", "libx264", "-crf", cfg["render"]["crf"], "-preset", "fast", "-c:a", "aac", "-b:a", "192k", out])

cut_map, acc = [], 0.0
for s, e in keep:
    cut_map.append({"src_start": round(s, 3), "src_end": round(e, 3), "dst_start": round(acc, 3)}); acc += e - s
p("build/cuts/cut_map.json").write_text(json.dumps(cut_map, indent=1))
print(f"{dur:.1f}s -> {acc:.1f}s  (−{dur - acc:.1f}s, {len(keep)} фрагментов) -> {out}")
