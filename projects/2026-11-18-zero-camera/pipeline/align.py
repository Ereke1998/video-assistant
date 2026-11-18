"""Шаг 3. Пословные тайминги озвучки для субтитров.
faster-whisper по voiceover.mp3; при snap_to_script — слова заменяются на текст сценария (Whisper даёт тайминг,
сценарий — точное написание). Fallback 'estimate': тайминги распределяются по длине слов внутри сцены."""
import json, re, difflib
from common import load_config, p, words_of

cfg = load_config(); al = cfg["alignment"]
script = json.loads(p(cfg["script"]["output_json"]).read_text(encoding="utf-8"))
tl = json.loads(p(cfg["voiceover"]["timeline_json"]).read_text(encoding="utf-8"))
pad = cfg["voiceover"]["pad_after_sec"]


def estimate():
    out = []
    for s, t in zip(script["scenes"], tl["scenes"]):
        ws = words_of(s["voice_plain"]); span = t["end"] - t["start"] - pad
        weights = [len(w) + 2 for w in ws]; acc = t["start"]
        for w, k in zip(ws, weights):
            d = span * k / sum(weights)
            out.append({"word": w, "start": round(acc, 3), "end": round(acc + d, 3)}); acc += d
    return out


def whisper():
    from faster_whisper import WhisperModel  # pip install faster-whisper
    m = WhisperModel(al["model"], device="auto", compute_type="auto")
    segs, _ = m.transcribe(str(p(cfg["voiceover"]["output"])), language=cfg["project"]["language"], word_timestamps=True)
    got = [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)} for s in segs for w in (s.words or [])]
    if not al["snap_to_script"]:
        return got
    ref = [w for s in script["scenes"] for w in words_of(s["voice_plain"])]
    norm = lambda x: re.sub(r"[^\w]", "", x.lower())
    sm = difflib.SequenceMatcher(a=[norm(w["word"]) for w in got], b=[norm(w) for w in ref], autojunk=False)
    out = []
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op == "equal" or (a1 - a0) == (b1 - b0):
            out += [{**got[a0 + k], "word": ref[b0 + k]} for k in range(b1 - b0)]
        elif b1 > b0 and a1 > a0:  # разное число слов: растягиваем по интервалу
            s0, e0 = got[a0]["start"], got[a1 - 1]["end"]; d = (e0 - s0) / (b1 - b0)
            out += [{"word": ref[b0 + k], "start": round(s0 + k * d, 3), "end": round(s0 + (k + 1) * d, 3)} for k in range(b1 - b0)]
        elif b1 > b0:  # Whisper пропустил слова: вставляем между соседями, чтобы индексы караоке не съехали
            s0 = out[-1]["end"] if out else 0.0
            e0 = got[a0]["start"] if a0 < len(got) else s0 + .3 * (b1 - b0); d = max(e0 - s0, .05) / (b1 - b0)
            out += [{"word": ref[b0 + k], "start": round(s0 + k * d, 3), "end": round(s0 + (k + 1) * d, 3)} for k in range(b1 - b0)]
    assert len(out) == len(ref), "число слов не совпало со сценарием"
    return out


if cfg["voiceover"]["engine"] == "preview" or al["engine"] == "estimate":
    words, used = estimate(), "estimate"
else:
    try:
        words, used = whisper(), al["engine"]
    except ImportError:
        if al["fallback"] != "estimate": raise
        words, used = estimate(), "estimate (faster-whisper не установлен)"
f = p(al["output_json"]); f.parent.mkdir(parents=True, exist_ok=True)
f.write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(words)} слов, {used} -> {al['output_json']}")
