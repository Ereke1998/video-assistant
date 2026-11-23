"""Общие функции для всех шагов. Этот файл запускать не нужно."""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
AUDIO = ROOT / "audio"
PHRASES_DIR = AUDIO / "phrases"
SCENES = ROOT / "scenes"
MUSIC = ROOT / "music"
BUILD = ROOT / "build"

TIMINGS_FILE = AUDIO / "timings.json"
PLAN_FILE = ROOT / "scene_plan.json"


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_project():
    return load_json(ROOT / "project.json")


def fail(message):
    print(f"\n❌ {message}\n")
    sys.exit(1)


def get_key(name):
    """Берёт ключ из файла .env, который лежит рядом со скриптами."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        fail("Не установлен модуль python-dotenv. Выполните: pip install -r requirements.txt")
    load_dotenv(ROOT / ".env")
    value = os.environ.get(name, "").strip()
    if not value or value.startswith("ВСТАВЬТЕ"):
        fail(f"Нет ключа {name}. Откройте файл .env в папке проекта "
             f"и вставьте ключ после знака «=» в строке {name}=")
    return value


def check_tools():
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            fail(f"Не найдена программа {tool}. Установите ffmpeg (см. README.md).")


def run(cmd, cwd=None):
    """Запускает команду (обычно ffmpeg). При ошибке показывает её текст."""
    res = subprocess.run([str(c) for c in cmd], cwd=cwd, capture_output=True, text=True)
    if res.returncode != 0:
        print(res.stderr[-3000:])
        fail("Команда завершилась с ошибкой: " + " ".join(str(c) for c in cmd[:4]) + " …")
    return res


def media_duration(path):
    res = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "csv=p=0", path])
    return float(res.stdout.strip())


def ask_yes(question, auto_yes=False):
    """Спрашивает подтверждение перед платным действием."""
    if auto_yes:
        print(question + " → да (запущено с --yes)")
        return True
    answer = input(question + " Напишите «да» и нажмите Enter: ").strip().lower()
    return answer in ("да", "д", "yes", "y")


def fmt(t):
    """Секунды → MM:SS.ss"""
    return f"{int(t // 60):02d}:{t % 60:05.2f}"
