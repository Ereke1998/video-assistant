"""Общие утилиты: чтение конфига, таймкоды, запуск ffmpeg."""
import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # папка проекта


def load_config():
    return json.loads((ROOT / "project.config.json").read_text(encoding="utf-8"))


def p(rel):
    return ROOT / rel


def tc_to_sec(tc: str) -> float:
    """'MM:SS' или 'MM:SS.ms' -> секунды."""
    m, s = tc.split(":")
    return int(m) * 60 + float(s)


def sec_to_srt(t: float) -> str:
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def run(cmd):
    print("$", " ".join(map(str, cmd)), file=sys.stderr)
    return subprocess.run(list(map(str, cmd)), check=True, capture_output=True, text=True)
