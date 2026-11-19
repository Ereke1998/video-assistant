#!/usr/bin/env bash
# Готовый интерьер проявляется ПРЯМО В КАДРЕ (на весь экран) поверх чернового плана.
# ИИ-клип — тот же план (та же камера и героиня), поэтому наложение совпадает 1:1.
#
#   BASE=/tmp/work/out/reel_base.mp4 bash compose_reveal.sh /путь/ai_clip.mp4
#   T    — начало проявления, с        [12.5]
#   DUR  — длительность перехода, с    [1.0]
#   MODE — wipe   : мягкая шторка слева-снизу → вправо-вверх (по умолчанию)
#          fade   : наплыв (растворение) по всему кадру
# Подпись (CAPTION) рисуется поверх всего: 12.0–16.0 с, по центру, y=1250 (безопасная зона).
# Выход: /tmp/work/out/reel_pip.mp4 (без звука → дальше build_sound.sh)
set -euo pipefail
BASE=${BASE:-/tmp/work/out/reel_base.mp4}
OUT=${OUT:-/tmp/work/out/reel_pip.mp4}
T=${T:-12.5}; DUR=${DUR:-1.0}; MODE=${MODE:-wipe}; EDGE=${EDGE:-0.18}
CAPTION=${CAPTION:-Сюда — готовый интерьер}; CAP_IN=${CAP_IN:-12.0}; CAP_OUT=${CAP_OUT:-16.0}
FONT_R=$(fc-match -f '%{file}' 'Inter:semibold')
AIC=${1:?нужен клип готового интерьера}
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$BASE")
P="clip((T-$T)/$DUR,0,1)"                                  # прогресс 0→1
case $MODE in
  wipe) S="(X/W*0.8+(1-Y/H)*0.2)"                            # фронт идёт слева направо с лёгким наклоном
        A="255*clip(($P*(1+$EDGE)-$S)/$EDGE,0,1)" ;;
  fade) A="255*$P" ;;
  *) echo "MODE: wipe|fade"; exit 1 ;;
esac
ffmpeg -nostdin -hide_banner -loglevel error -y -i "$BASE" -i "$AIC" -filter_complex \
 "[1:v]scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,unsharp=5:5:0.5,setsar=1,fps=30,
       setpts=PTS-STARTPTS+$T/TB,format=yuva444p,geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='$A'[ai];
  [0:v][ai]overlay=0:0:eof_action=repeat:enable='gte(t,$T)',
       drawtext=fontfile=$FONT_R:text='$CAPTION':fontsize=50:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=16:x=(w-tw)/2:y=1250:enable='between(t,$CAP_IN,$CAP_OUT)':alpha='clip(min((t-$CAP_IN)/0.25,($CAP_OUT-t)/0.3),0,1)',format=yuv420p[v]" \
 -map "[v]" -an -c:v libx264 -preset slow -crf 17 -r 30 -movflags +faststart -t "$D" "$OUT"
echo "reveal: $MODE ${DUR}s с ${T}s, на весь кадр → $OUT"
