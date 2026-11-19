#!/usr/bin/env bash
# Видео «ДО → ПОСЛЕ» прямо в кадре (1080×1920, 30 fps) + синхронный звук исходника.
# В каждом плане: исходник играет PRE с до кадра, совпадающего с картинкой «ПОСЛЕ»
# → интерьер ложится на весь кадр шторкой (REVEAL_DUR) и ДВИЖЕТСЯ дальше вместе с исходником (anim_N.mp4);
# для картинки after_N.png — стоп-кадр + наезд.
#   MODE=wipe (шторка, по умолчанию) | fade (наплыв);  EDGE — мягкость края шторки [0.18];  ZOOM — наезд [0.06]
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); source "$HERE/shots.conf"
O=/tmp/work/out; mkdir -p $O
MODE=${MODE:-wipe}; EDGE=${EDGE:-0.18}; ZOOM=${ZOOM:-0.06}   # кроп (анимация) / наезд (картинка)
FONT=$(fc-match -f '%{file}' 'Inter:bold')
FF="ffmpeg -nostdin -hide_banner -loglevel error -y"
UP="scale=1080:1920:flags=lanczos,unsharp=5:5:0.6,setsar=1,fps=30"
RAW="eq=saturation=0.85:contrast=1.06:gamma=0.97,colorbalance=bs=0.04:bm=0.03"   # холодный «сырой» грейд «ДО»
N=${#SHOTS[@]}; in=(); fc=""; k=0; ii=0; T1=$(set -- ${SHOTS[0]}; echo $2)   # длительность вступления (заголовок)
for s in "${SHOTS[@]}"; do set -- $s; st=$1 len=$2 rv=$3 img=$4
  if [ "$rv" = "-" ]; then
    in+=(-ss "$st" -t "$len" -i "$SRC"); fc+="[$ii:v]$UP,$RAW,scale=$(awk -v z=$ZOOM 'BEGIN{printf "%d:%d", int(1080*(1+z)/2)*2, int(1920*(1+z)/2)*2}'),crop=1080:1920,trim=duration=$len,setpts=PTS-STARTPTS[s$k];"; ii=$((ii+1))
  elif [[ "$img" == *.mp4 ]]; then
    # анимированное «ПОСЛЕ»: исходник играет весь план, клип интерьера (тот же момент и движение) проявляется шторкой
    in+=(-ss "$st" -t "$len" -i "$SRC" -i "$HERE/$img")
    P="clip((T-$rv)/$REVEAL_DUR,0,1)"
    [ "$MODE" = fade ] && A="255*$P" || A="255*clip(($P*(1+$EDGE)-(X/W*0.8+(1-Y/H)*0.2))/$EDGE,0,1)"
    fc+="[$ii:v]$UP,$RAW,trim=duration=$len,setpts=PTS-STARTPTS[b$k];"
    fc+="[$((ii+1)):v]scale=1080:1920,setsar=1,fps=30,setpts=PTS-STARTPTS+$rv/TB,format=yuva444p,geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='$A'[a$k];"
    # постоянный кроп ZOOM прячет края, куда картинка не дотягивается при движении камеры
    fc+="[b$k][a$k]overlay=0:0:eof_action=repeat:enable='gte(t,$rv)',format=yuv420p,scale=$(awk -v z=$ZOOM 'BEGIN{printf "%d:%d", int(1080*(1+z)/2)*2, int(1920*(1+z)/2)*2}'):flags=bicubic,crop=1080:1920,trim=duration=$len,setpts=PTS-STARTPTS[s$k];"
    ii=$((ii+2))
  else
    after=$(awk -v a=$len -v b=$rv 'BEGIN{print a-b}')
    in+=(-ss "$st" -t "$rv" -i "$SRC" -loop 1 -framerate 30 -t "$len" -i "$HERE/$img")
    P="clip((T-$rv)/$REVEAL_DUR,0,1)"
    [ "$MODE" = fade ] && A="255*$P" || A="255*clip(($P*(1+$EDGE)-(X/W*0.8+(1-Y/H)*0.2))/$EDGE,0,1)"
    fc+="[$ii:v]$UP,$RAW,trim=duration=$rv,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=$after[b$k];"
    fc+="[$((ii+1)):v]scale=1080:1920,setsar=1,fps=30,trim=duration=$len,setpts=PTS-STARTPTS,format=yuva444p,geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='$A'[a$k];"
    Z="1+$ZOOM*clip((t-$rv)/$after,0,1)"
    fc+="[b$k][a$k]overlay=0:0:shortest=1,format=yuv420p,scale=w='trunc(1080*($Z)/2)*2':h='trunc(1920*($Z)/2)*2':eval=frame:flags=bicubic,crop=1080:1920,trim=duration=$len,setpts=PTS-STARTPTS[s$k];"
    ii=$((ii+2))
  fi; k=$((k+1)); done
fc+="$(for j in $(seq 0 $((N-1))); do printf '[s%d]' $j; done)concat=n=$N:v=1:a=0,"
fc+="drawtext=fontfile=$FONT:text='$TITLE':fontsize=96:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=24:x=(w-tw)/2:y=h*0.42:alpha='clip(min((t-0.15)/0.3,($T1-0.1-t)/0.3),0,1)':enable='lt(t,$T1)',format=yuv420p[v]"
$FF "${in[@]}" -filter_complex "$fc" -map "[v]" -an -c:v libx264 -preset slow -crf 17 -r 30 -movflags +faststart $O/reel_pip.mp4
echo "видео: $O/reel_pip.mp4 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 $O/reel_pip.mp4) с), $N планов"

# --- синхронный звук исходника (идёт и во время стоп-кадра): каждый план → −36 LUFS (±10 дБ), фейды 15 мс ---
ain=(); afc=""; k=0
for s in "${SHOTS[@]}"; do set -- $s; ain+=(-ss "$1" -t "$2" -i "$SRC")
  li=$(ffmpeg -nostdin -hide_banner -ss "$1" -t "$2" -i "$SRC" -vn -af ebur128 -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/I:/{print $2; exit}')
  g=$(awk -v i="$li" 'BEGIN{g=-36-i; if(g>10)g=10; if(g<-10)g=-10; printf "%.1f", g}')
  afc+="[$k:a]aresample=48000,aformat=channel_layouts=stereo,volume=${g}dB,apad,atrim=0:$2,afade=t=in:d=0.015,afade=t=out:st=$(awk -v d=$2 'BEGIN{print d-0.015}'):d=0.015[a$k];"; k=$((k+1)); done
afc+="$(for j in $(seq 0 $((N-1))); do printf '[a%d]' $j; done)concat=n=$N:v=0:a=1[a]"
$FF "${ain[@]}" -filter_complex "$afc" -map "[a]" -c:a pcm_f32le $O/reel_src_audio.wav
echo "звук исходника: $O/reel_src_audio.wav"
