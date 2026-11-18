#!/usr/bin/env bash
# Полный прогон: сценарий → озвучка → тайминги слов → субтитры → HyperFrames → Remotion-рендер.
# Офлайн-превью без сети: в project.config.json voiceover.engine = "preview".
set -euo pipefail
cd "$(dirname "$0")"
python3 generate_script.py
python3 voiceover.py
python3 align.py
python3 subtitles.py
# HyperFrames-сцены (если включены). Сверь флаги с `npx hyperframes --help`.
python3 - <<'PY' | while read -r file out; do (cd .. && npx hyperframes render "$file" -o "$out"); done
from common import load_config, active_scenes
for s in active_scenes(load_config()):
    if s["visual"]["engine"] == "hyperframes": print(s["visual"]["file"], s["visual"]["render"])
PY
python3 sync_remotion.py
cd ../graphics/remotion && npx remotion render Main ../../build/renders/final.mp4 --codec=h264 --crf=18
