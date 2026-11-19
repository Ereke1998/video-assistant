#!/usr/bin/env bash
# Базовый монтаж «ДО» (черновая) 1080×1920, 30 fps, без текста + синхронный звук исходника
# + ИИ-набор на каждый план + превью «ПОСЛЕ» (временная замена ИИ-клипов).
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); source "$HERE/shots.conf"
O=/tmp/work/out; AI=/tmp/work/ai_input; PV=$O/preview; mkdir -p $O $AI/style $PV
FONT_R=$(fc-match -f '%{file}' 'Inter:semibold')
FF="ffmpeg -nostdin -hide_banner -loglevel error -y"
UP="scale=1080:1920:flags=lanczos,unsharp=5:5:0.6,setsar=1,fps=30"
RAW="eq=saturation=0.85:contrast=1.06:gamma=0.97,colorbalance=bs=0.04:bm=0.03"   # холодный «сырой» грейд
N=${#SHOTS[@]}

# --- видео «ДО» ---
in=(); fc=""; k=0
for s in "${SHOTS[@]}"; do set -- $s; in+=(-ss "$1" -t "$2" -i "$SRC"); fc+="[$k:v]$UP,$RAW[s$k];"; k=$((k+1)); done
fc+="$(for j in $(seq 0 $((N-1))); do printf '[s%d]' $j; done)concat=n=$N:v=1:a=0,format=yuv420p[v]"
$FF "${in[@]}" -filter_complex "$fc" -map "[v]" -an -c:v libx264 -preset slow -crf 17 -r 30 -movflags +faststart $O/reel_base.mp4

# --- синхронный звук исходника: каждый план → −36 LUFS (±10 дБ), фейды 15 мс на склейках ---
ain=(); afc=""; k=0
for s in "${SHOTS[@]}"; do set -- $s; ain+=(-ss "$1" -t "$2" -i "$SRC")
  li=$(ffmpeg -nostdin -hide_banner -ss "$1" -t "$2" -i "$SRC" -vn -af ebur128 -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/I:/{print $2; exit}')
  g=$(awk -v i="$li" 'BEGIN{g=-36-i; if(g>10)g=10; if(g<-10)g=-10; printf "%.1f", g}')
  afc+="[$k:a]aresample=48000,aformat=channel_layouts=stereo,volume=${g}dB,apad,atrim=0:$2,afade=t=in:d=0.015,afade=t=out:st=$(awk -v d=$2 'BEGIN{print d-0.015}'):d=0.015[a$k];"; k=$((k+1)); done
afc+="$(for j in $(seq 0 $((N-1))); do printf '[a%d]' $j; done)concat=n=$N:v=0:a=1[a]"
$FF "${ain[@]}" -filter_complex "$afc" -map "[a]" -c:a pcm_f32le $O/reel_src_audio.wav
echo "база «ДО»: $O/reel_base.mp4 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 $O/reel_base.mp4) с), звук: $O/reel_src_audio.wav"

# --- ИИ-набор: на каждый план — исходный клип целиком + первый кадр ---
k=1; for s in "${SHOTS[@]}"; do set -- $s
  $FF -ss "$1" -t "$2" -i "$SRC" -an -c:v libx264 -crf 14 $AI/shot${k}_src.mp4
  $FF -ss "$1" -i "$SRC" -frames:v 1 $AI/shot${k}_first_frame.png
  # превью «ПОСЛЕ»: тот же план, тёплый светлый грейд + пометка (заменить ИИ-клипом)
  $FF -i $AI/shot${k}_src.mp4 -vf "eq=saturation=0.9:brightness=0.06:gamma=1.12:contrast=0.95,colorbalance=rm=0.06:gm=0.03:bm=-0.05:rh=0.04:bh=-0.04,drawbox=y=ih-58:w=iw:h=58:color=black@0.55:t=fill,drawtext=fontfile=$FONT_R:text='ПРЕВЬЮ $k/$N · заменить ИИ-клипом':fontsize=24:fontcolor=white:x=(w-tw)/2:y=h-42" -an -c:v libx264 -crf 16 $PV/shot$k.mp4
  k=$((k+1)); done
# --- стилевые референсы из видео интерьера ---
if [ -f "$STYLE" ]; then i=1; for t in 1.5 6.1 9.2 12.2 16.8 18.3 22.9 24.4; do $FF -ss $t -i "$STYLE" -frames:v 1 $AI/style/style_$i.png; i=$((i+1)); done; fi
echo "ИИ-набор: $AI (shotN_src.mp4, shotN_first_frame.png, style/), превью: $PV"
