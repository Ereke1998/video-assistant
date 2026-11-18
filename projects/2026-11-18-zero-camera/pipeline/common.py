"""Общие утилиты: чтение конфига, таймкоды, запуск ffmpeg."""
import json, re, subprocess, sys
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


def active_scenes(cfg):
    return [s for s in cfg["scenes"] if s.get("enabled", True)]


def duration(path) -> float:
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                      "-of", "csv=p=0", path]).stdout.strip())


def words_of(text: str):
    return [w for w in text.split() if any(ch.isalnum() for ch in w)]


MARK = {"*": "accent", "~": "strike", "^": "big", "_": "kicker"}


SAY = re.compile(r"^(.*?)\{([^}]+)\}(.*)$")  # 0{нөл} — на экране «0», в озвучке «нөл»


def tokenize(voice: str, offset: int = 0):
    """Разметка заголовка: *акцент* ~зачёркнуто~ ^КРУПНО^ _подводка_, « | » — перенос строки,
    текст{произношение} — показать одно, озвучить другое (цифры, аббревиатуры).
    Возвращает (tokens, plain): tokens для Remotion (wi — индекс слова в общей озвучке), plain — чистый текст для TTS."""
    tokens, style, wi = [], "normal", offset
    for raw in voice.split():
        if raw == "|":
            tokens.append({"text": "", "style": "normal", "wi": None, "br": True}); continue
        t, s = raw, style
        if t[0] in MARK:
            s = style = MARK[t[0]]; t = t[1:]
        close = bool(t) and t[-1] in MARK and MARK[t[-1]] == s
        if close:
            t = t[:-1]
        say = None
        m = SAY.match(t)
        if m:
            t, say = m.group(1) + m.group(3), m.group(2) + m.group(3)
        is_word = any(ch.isalnum() for ch in t)
        tok = {"text": t, "style": s, "wi": wi if is_word else None}
        if say:
            tok["say"] = say
        tokens.append(tok)
        wi += is_word
        if close:
            style = "normal"
    plain = " ".join(x.get("say", x["text"]) for x in tokens if not x.get("br") and x["text"])
    return tokens, plain
