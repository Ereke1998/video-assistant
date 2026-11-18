#!/usr/bin/env bash
# Полный прогон: исходник -> транскрипт -> автонарезка -> транскрипт нарезки -> субтитры -> рендер Remotion.
set -euo pipefail
cd "$(dirname "$0")"
python3 transcribe.py                       # тайминги исходника (для поиска паразитов)
python3 autocut.py                          # build/cuts/main_cut.mp4
python3 transcribe.py build/cuts/main_cut.mp4   # тайминги уже смонтированного ряда
python3 subtitles.py
cp ../build/cuts/main_cut.mp4 ../graphics/remotion/public/main_cut.mp4
cd ../graphics/remotion && npx remotion render Main ../../build/renders/final.mp4 --codec=h264 --crf=18
