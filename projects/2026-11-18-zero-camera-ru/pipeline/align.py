"""Шаг 3. Пословные тайминги озвучки (для караоке-заголовка, рта маскота и SRT).
Порядок: tts (WordBoundary от edge-tts, точно и без сети) → faster-whisper → estimate (по длине слов).
Тайминги всегда привязываются к тексту сценария: время — из TTS/Whisper, написание и число слов — из сценария."""
import json, re, difflib
from common import load_config, p, words_of

cfg = load_config(); al = cfg["alignment"]
script = json.loads(p(cfg["script"]["output_json"]).read_text(encoding="utf-8"))
tl = json.loads(p(cfg["voiceover"]["timeline_json"]).read_text(encoding="utf-8"))
pad = cfg["voiceover"]["pad_after_sec"]
ref = [w for s in script["scenes"] for w in words_of(s["voice_plain"])]


def estimate():
    out = []
    for s, t in zip(script["scenes"], tl["scenes"]):
        ws = words_of(s["voice_plain"]); span = t["end"] - t["start"] - pad
        weights = [len(w) + 2 for w in ws]; acc = t["start"]
        for w, k in zip(ws, weights):
            d = span * k / sum(weights)
            out.append({"word": w, "start": round(acc, 3), "end": round(acc + d, 3)}); acc += d
    return out


def snap(got):
    """Сопоставить распознанные/синтезированные слова со сценарием; пропуски — интерполяция."""
    norm = lambda x: re.sub(r"[^\w]", "", x.lower())
    sm = difflib.SequenceMatcher(a=[norm(w["word"]) for w in got], b=[norm(w) for w in ref], autojunk=False)
    out = []
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op == "equal" or (a1 - a0) == (b1 - b0):
            out += [{"word": ref[b0 + k], "start": got[a0 + k]["start"], "end": got[a0 + k]["end"]} for k in range(b1 - b0)]
        elif b1 > b0 and a1 > a0:  # разное число слов: растягиваем по интервалу
            s0, e0 = got[a0]["start"], got[a1 - 1]["end"]; d = (e0 - s0) / (b1 - b0)
            out += [{"word": ref[b0 + k], "start": round(s0 + k * d, 3), "end": round(s0 + (k + 1) * d, 3)} for k in range(b1 - b0)]
        elif b1 > b0:  # слова нет в распознавании: вставляем между соседями, чтобы индексы караоке не съехали
            s0 = out[-1]["end"] if out else 0.0
            e0 = got[a0]["start"] if a0 < len(got) else s0 + .3 * (b1 - b0); d = max(e0 - s0, .05) / (b1 - b0)
            out += [{"word": ref[b0 + k], "start": round(s0 + k * d, 3), "end": round(s0 + (k + 1) * d, 3)} for k in range(b1 - b0)]
    assert len(out) == len(ref), "число слов не совпало со сценарием"
    return out


def whisper():
    from faster_whisper import WhisperModel  # pip install faster-whisper
    m = WhisperModel(al["model"], device="auto", compute_type="auto")
    segs, _ = m.transcribe(str(p(cfg["voiceover"]["output"])), language=cfg["project"]["language"], word_timestamps=True)
    return [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)} for s in segs for w in (s.words or [])]


tts_words = p("build/audio/tts_words.json")
if cfg["voiceover"]["engine"] == "preview" or al["engine"] == "estimate":
    words, used = estimate(), "estimate"
elif al["engine"] == "tts" and tts_words.exists():
    words, used = snap(json.loads(tts_words.read_text(encoding="utf-8"))), "tts WordBoundary"
else:
    try:
        words, used = snap(whisper()), "faster-whisper"
    except ImportError:
        if al["fallback"] != "estimate": raise
        words, used = estimate(), "estimate (faster-whisper не установлен)"
f = p(al["output_json"]); f.parent.mkdir(parents=True, exist_ok=True)
f.write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(words)} слов, {used} -> {al['output_json']}")
