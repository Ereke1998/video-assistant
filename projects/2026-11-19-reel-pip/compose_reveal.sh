#!/usr/bin/env bash
# «ДО → ПОСЛЕ» в каждом плане: готовый интерьер проявляется ПРЯМО В КАДРЕ (на весь экран) шторкой.
# Для плана N берётся $AI_OUT/shotN.(mp4|mov|png|jpg); если нет — превью из build_base.sh.
# ИИ-клип = тот же план целиком (та же камера), выровнен по началу плана.
#   MODE=wipe (по умолчанию) | fade ;  EDGE — мягкость края шторки (доля кадра) [0.18]
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); source "$HERE/shots.conf"
O=/tmp/work/out; BASE=${BASE:-$O/reel_base.mp4}; OUT=${OUT:-$O/reel_pip.mp4}
MODE=${MODE:-wipe}; EDGE=${EDGE:-0.18}
FONT=$(fc-match -f '%{file}' 'Inter:bold')
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$BASE")
in=(-i "$BASE"); fc=""; prev="0:v"; k=1; used=()
while read -r st len; do
  f=""; for e in mp4 mov MP4 MOV png jpg jpeg; do [ -f "$AI_OUT/shot$k.$e" ] && { f="$AI_OUT/shot$k.$e"; break; }; done
  if [ -z "$f" ]; then f=$O/preview/shot$k.mp4; used+=("$k:превью"); else used+=("$k:ИИ"); fi
  case "$f" in *.png|*.jpg|*.jpeg) in+=(-loop 1 -t "$len" -framerate 30 -i "$f");; *) in+=(-i "$f");; esac
  r=$(awk -v a=$st -v b=$REVEAL_AT 'BEGIN{print a+b}'); e=$(awk -v a=$st -v b=$len 'BEGIN{print a+b}')
  P="clip((T-$r)/$REVEAL_DUR,0,1)"
  [ "$MODE" = fade ] && A="255*$P" || A="255*clip(($P*(1+$EDGE)-(X/W*0.8+(1-Y/H)*0.2))/$EDGE,0,1)"
  fc+="[$k:v]scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,setsar=1,fps=30,trim=duration=$len,setpts=PTS-STARTPTS+$st/TB,"
  fc+="format=yuva444p,geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='$A'[p$k];"
  fc+="[$prev][p$k]overlay=0:0:eof_action=pass:enable='between(t,$st,$e)'[v$k];"
  prev="v$k"; k=$((k+1))
done < <(shot_starts)
# заголовок поверх всего на первом плане
fc+="[$prev]drawtext=fontfile=$FONT:text='$TITLE':fontsize=96:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=24:x=(w-tw)/2:y=h*0.42:alpha='clip(min((t-0.15)/0.3,(2.85-t)/0.3),0,1)':enable='lt(t,3)',format=yuv420p[v]"
ffmpeg -nostdin -hide_banner -loglevel error -y "${in[@]}" -filter_complex "$fc" -map "[v]" -an \
  -c:v libx264 -preset slow -crf 17 -r 30 -movflags +faststart -t "$D" "$OUT"
echo "до/после: ${#SHOTS[@]} планов, шторка $MODE ${REVEAL_DUR}s через ${REVEAL_AT}s → $OUT  [${used[*]}]"
