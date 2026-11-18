"""Шаг 4b. Динамичные субтитры: блоки по 2–4 слова, акценты на ключевых словах.
Вход: transcript.json (для смонтированного видео — запусти transcribe.py на build/cuts/main_cut.mp4).
Выход: subtitles.srt (ключевые слова в <b>) и subtitles.json (для Remotion-композиции Subtitles)."""
import json, re
from common import load_config, p, sec_to_srt

cfg = load_config(); s = cfg["subtitles"]
words = json.loads(p(cfg["whisper"]["output_json"]).read_text(encoding="utf-8"))
kw = {k.lower() for k in s["keywords"]}
lo, hi = s["words_per_block"]["min"], s["words_per_block"]["max"]
PREPS = {"в", "на", "с", "к", "о", "и", "а", "не", "за", "по", "до", "из", "у", "от", "для", "без"}

def is_accent(w):
    c = re.sub(r"[^\w%]", "", w)
    return (c.lower() in kw
            or (s["auto_accent"]["numbers"] and any(ch.isdigit() for ch in c))
            or (s["auto_accent"]["caps_words"] and len(c) > 2 and c.isupper()))

blocks, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    nxt = words[i + 1] if i + 1 < len(words) else None
    span = cur[-1]["end"] - cur[0]["start"]
    end_phrase = bool(re.search(r"[.!?,:;—]$", w["word"]))
    gap = nxt is not None and nxt["start"] - w["end"] > 0.3
    hanging = w["word"].lower().strip(",.") in PREPS  # предлог не оставляем в конце блока
    if nxt is None or len(cur) >= hi or span >= s["max_block_sec"] or \
       ((end_phrase or gap) and len(cur) >= lo and not hanging):
        blocks.append(cur); cur = []

out = []
for b in blocks:
    start, end = b[0]["start"], max(b[-1]["end"], b[0]["start"] + s["min_block_sec"])
    toks = [{"text": re.sub(r"[,.;:]$", "", w["word"]), "accent": is_accent(w["word"]),
             "start": w["start"], "end": w["end"]} for w in b]
    if not any(t["accent"] for t in toks):  # минимум 1 акцент: самое длинное слово
        max(toks, key=lambda t: len(t["text"]))["accent"] = True
    out.append({"start": round(start, 3), "end": round(end, 3), "words": toks})
for a, b in zip(out, out[1:]):  # без наложений
    a["end"] = min(a["end"], b["start"])

srt = "\n".join(
    f"{i}\n{sec_to_srt(b['start'])} --> {sec_to_srt(b['end'])}\n" +
    " ".join(f"<b>{t['text']}</b>" if t["accent"] else t["text"] for t in b["words"]) + "\n"
    for i, b in enumerate(out, 1))
for key, data in (("output_srt", srt), ("output_json", json.dumps(out, ensure_ascii=False, indent=1))):
    f = p(s[key]); f.parent.mkdir(parents=True, exist_ok=True); f.write_text(data, encoding="utf-8")
# копия для Remotion
rp = p("graphics/remotion/public"); rp.mkdir(parents=True, exist_ok=True)
(rp / "subtitles.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
print(f"{len(out)} блоков -> {s['output_srt']}, {s['output_json']}")
