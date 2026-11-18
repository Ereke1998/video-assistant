"""Шаг 4a. Whisper с пословными таймингами.
Использование: python3 pipeline/transcribe.py [видео]   (по умолчанию — sources.main)
Выход: whisper.output_json  ->  [{"word","start","end"}, ...]"""
import json, sys
from common import load_config, p

cfg = load_config()
w = cfg["whisper"]
src = p(sys.argv[1] if len(sys.argv) > 1 else cfg["sources"]["main"])

from faster_whisper import WhisperModel  # pip install faster-whisper
model = WhisperModel(w["model"], device="auto", compute_type="auto")
segments, _ = model.transcribe(str(src), language=w["language"], word_timestamps=True, vad_filter=True)
words = [{"word": x.word.strip(), "start": round(x.start, 3), "end": round(x.end, 3)}
         for s in segments for x in (s.words or [])]
out = p(w["output_json"]); out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(words)} слов -> {out}")
