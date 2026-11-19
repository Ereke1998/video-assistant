#!/usr/bin/env bash
# Базовый монтаж 18 с (1080×1920, 30 fps, без звука) из исходника-обзора квартиры.
# + превью PiP (временная замена ИИ-клипа) + набор для генерации ИИ-клипа.
#   SRC   — исходник [/tmp/work/src/src.mp4]
#   TITLE — заголовок 0–3 с
set -euo pipefail
SRC=${SRC:-/tmp/work/src/src.mp4}
TITLE=${TITLE:-ЧЕРНОВАЯ ОТДЕЛКА}
O=/tmp/work/out; AI=/tmp/work/ai_input; mkdir -p $O $AI
FONT=$(fc-match -f '%{file}' 'Inter:bold'); FONT_R=$(fc-match -f '%{file}' 'Inter:semibold')
FF="ffmpeg -nostdin -hide_banner -loglevel error -y"
UP="scale=1080:1920:flags=lanczos,unsharp=5:5:0.6,setsar=1,fps=30"
RAW="eq=saturation=0.85:contrast=1.06:gamma=0.97,colorbalance=bs=0.04:bm=0.03"   # «сырой» холодный грейд стройки
#             начало(src) длит.  ролик
SHOTS=( "147.5 3"   # 0–3   вид из окна: небо, город, стройка (заголовок)
        "72.5  2"   # 3–5   вход в комнату, идёт вглубь
        "128.0 2"   # 5–7   коридор
        "18.0  2"   # 7–9   общий план большой комнаты
        "143.0 3"   # 9–12  эркер → окно, наезд + белая вспышка
        "184.0 6" ) # 12–18 общий план, героиня идёт на камеру (+ проявление интерьера)
in=(); fc=""; i=0
for s in "${SHOTS[@]}"; do set -- $s; in+=(-ss "$1" -t "$2" -i "$SRC"); i=$((i+1)); done
# 1: заголовок
fc+="[0:v]$UP,$RAW,drawtext=fontfile=$FONT:text='$TITLE':fontsize=84:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=22:x=(w-tw)/2:y=h*0.40:alpha='clip(min((t-0.3)/0.4,(2.9-t)/0.3),0,1)'[s0];"
# 2–4: проход (жёсткие склейки)
for k in 1 2 3; do fc+="[$k:v]$UP,$RAW[s$k];"; done
# 5: наезд 1.0→1.18 + вспышка в белое на последних 0.15 с
fc+="[4:v]$UP,$RAW,scale=w='trunc(1080*(1+0.18*t/3)/2)*2':h='trunc(1920*(1+0.18*t/3)/2)*2':eval=frame,crop=1080:1920,fade=t=out:st=2.85:d=0.15:color=white[s4];"
# 6: интерьер — нейтральный грейд, выход из белого 0.25 с, подпись — в compose_reveal.sh (поверх интерьера)
fc+="[5:v]$UP,eq=saturation=1.0:contrast=1.03,fade=t=in:st=0:d=0.25:color=white[s5];"
fc+="[s0][s1][s2][s3][s4][s5]concat=n=6:v=1:a=0,format=yuv420p[v]"
$FF "${in[@]}" -filter_complex "$fc" -map "[v]" -an -c:v libx264 -preset slow -crf 17 -r 30 -movflags +faststart $O/reel_base.mp4
# --- синхронный звук исходника под монтаж: тот же список планов, фейды 15 мс на склейках ---
ain=(); afc=""; k=0
for s in "${SHOTS[@]}"; do set -- $s; ain+=(-ss "$1" -t "$2" -i "$SRC")
  # выравнивание по громкости: каждый план → −36 LUFS (как в среднем по исходнику), гейн в пределах ±10 дБ
  li=$(ffmpeg -nostdin -hide_banner -ss "$1" -t "$2" -i "$SRC" -vn -af ebur128 -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/I:/{print $2; exit}')
  g=$(awk -v i="$li" 'BEGIN{g=-36-i; if(g>10)g=10; if(g<-10)g=-10; printf "%.1f", g}')
  afc+="[$k:a]aresample=48000,aformat=channel_layouts=stereo,volume=${g}dB,apad,atrim=0:$2,afade=t=in:d=0.015,afade=t=out:st=$(awk -v d=$2 'BEGIN{print d-0.015}'):d=0.015[a$k];"; k=$((k+1)); done
afc+="$(for j in $(seq 0 $((k-1))); do printf '[a%d]' $j; done)concat=n=$k:v=0:a=1[a]"
$FF "${ain[@]}" -filter_complex "$afc" -map "[a]" -c:a pcm_f32le $O/reel_src_audio.wav
echo "база: $O/reel_base.mp4 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 $O/reel_base.mp4) с)"

# --- набор для ИИ-генерации (video-to-video): тот же план, что в 12–18 с ---
$FF -ss 184.5 -t 5.5 -i "$SRC" -an -c:v libx264 -crf 14 $AI/scene4_src_576x1024.mp4     # клип для v2v (с 12.5 с ролика)
$FF -ss 184.5 -i "$SRC" -frames:v 1 $AI/scene4_first_frame.png                           # стартовый кадр для img2video
# --- ПРЕВЬЮ готового интерьера (на весь кадр): тот же план, «тёплый» грейд + пометка. Заменить ИИ-клипом. ---
$FF -i $AI/scene4_src_576x1024.mp4 -vf "eq=saturation=1.25:brightness=0.05:gamma=1.08,colorbalance=rm=0.08:gm=0.02:bm=-0.08:rh=0.05:bh=-0.05,drawbox=y=ih-58:w=iw:h=58:color=black@0.55:t=fill,drawtext=fontfile=$FONT_R:text='ПРЕВЬЮ · заменить ИИ-клипом':fontsize=26:fontcolor=white:x=(w-tw)/2:y=h-43" -an -c:v libx264 -crf 16 $O/interior_preview.mp4
echo "ИИ-набор: $AI/ ; превью интерьера: $O/interior_preview.mp4"
