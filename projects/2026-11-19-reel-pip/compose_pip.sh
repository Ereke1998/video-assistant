#!/usr/bin/env bash
# PiP-вставка в правом верхнем углу — геометрия снята с референса 696508c2-…9115463577967884462.MP4
# Референс (720×1280): вставка 9:16, ширина 36–42 % кадра, отступ сверху 7–12 %, справа 0–5 %,
# без рамки/тени/скругления, появляется «в лоб» (без анимации) через ~0.8–1.1 с после склейки.
#
# Использование:
#   BASE=/tmp/work/out/reel_base.mp4 bash compose_pip.sh 12.5:/tmp/work/ai_clip.mp4 [T:файл ...]
#   Каждая пара T:файл — момент появления (с) и клип вставки. Вставка держится до конца ролика
#   или до следующей вставки.
# Выход: /tmp/work/out/reel_pip.mp4 (видео без звука → дальше build_sound.sh делает reel_pip_final.mp4)
set -euo pipefail
BASE=${BASE:-/tmp/work/out/reel_base.mp4}
OUT=${OUT:-/tmp/work/out/reel_pip.mp4}
FW=1080; FH=1920
PW=${PW:-384}                     # ширина вставки: 35.5 % кадра (реф, сцена 1: 255 из 720)
PH=$(( PW*16/9 / 2 * 2 ))         # 9:16 → 682
MR=${MR:-54}                      # отступ справа: 5 % (реф: 36 из 720)
MT=${MT:-141}                     # отступ сверху: 7.3 % (реф: 94 из 1280)
PX=$(( FW - MR - PW )); PY=$MT
[ $# -ge 1 ] || { echo "нужна хотя бы одна пара T:файл"; exit 1; }
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$BASE")

ins=(); fc="[0:v]scale=${FW}:${FH}:force_original_aspect_ratio=increase,crop=${FW}:${FH},setsar=1,format=yuv420p[v0];"
n=$#; i=1; prev=v0; args=("$@")
for pair in "$@"; do
  t=${pair%%:*}; f=${pair#*:}
  [ $i -lt $n ] && end=${args[$i]%%:*} || end=$D
  ins+=(-i "$f")
  # вставка: заполнить 414×736 (центр-кроп), её 0-й кадр — в момент t, держать до end
  fc+="[$i:v]scale=${PW}:${PH}:force_original_aspect_ratio=increase,crop=${PW}:${PH},setsar=1,fps=30,setpts=PTS-STARTPTS+${t}/TB,format=yuv420p[p$i];"
  fc+="[$prev][p$i]overlay=x=${PX}:y=${PY}:eof_action=repeat:enable='between(t,${t},${end})'[v$i];"
  prev=v$i; i=$((i+1))
done
ffmpeg -nostdin -hide_banner -loglevel error -y -i "$BASE" "${ins[@]}" -filter_complex "${fc%;}" -map "[$prev]" -an \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -r 30 -movflags +faststart -t "$D" "$OUT"
echo "PiP: ${PW}×${PH} @ x=${PX} y=${PY} (кадр ${FW}×${FH}) → $OUT"
