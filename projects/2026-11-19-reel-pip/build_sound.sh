#!/usr/bin/env bash
# Шаг 2.5 — саундтрек «стройка → готовый интерьер» (ffmpeg-only).
# Подхватывает исходники, если они есть; иначе всё синтезируется.
#   VIDEO      — смонтированный ролик (без/с черновым звуком)  [/tmp/work/out/reel_pip.mp4]
#   SRC_MOV    — исходный MOV с аэро/наземным звуком          [первый *.MOV/*.mov в /tmp/work, /mnt/user-data/uploads]
#   REF        — референс для замера громкости/спектра         [/mnt/user-data/uploads/696508c2-9115463577967884462.MP4]
#   INSERT_AUDIO — звук ИИ-вставки (будет в реверберации)       [не задан]
#   /tmp/work/audio/<wind|city|drone|site|whoosh|pad|steps|ding>*.wav — лицензированные замены стемов
set -euo pipefail
W=/tmp/work; S=$W/stems; O=$W/out; A=$W/audio
mkdir -p "$S" "$O" "$A"
VIDEO=${VIDEO:-$O/reel_pip.mp4}
REF=${REF:-$(ls /mnt/user-data/uploads/*9115463577967884462*.MP4 /root/.claude/uploads/*/*9115463577967884462*.MP4 /tmp/work/ref/ref.mp4 2>/dev/null | head -1 || true)}
SRC_MOV=${SRC_MOV:-$(find $W /mnt/user-data/uploads -maxdepth 2 -iname '*.mov' 2>/dev/null | head -1 || true)}
INSERT_AUDIO=${INSERT_AUDIO:-}
SR=48000
FF="ffmpeg -nostdin -hide_banner -loglevel error -y"
LOG=$O/sound_report.txt; : > "$LOG"
log(){ echo "$*" | tee -a "$LOG"; }

D=18
[ -f "$VIDEO" ] && D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")
D=$(printf '%.3f' "$D")
T_CUT=12.0          # стройка → интерьер
T_PAD=12.2          # пауза 0.2 с перед падом
T_INS=12.5          # появление вставки (+0.5 с от начала сцены)
log "duration=$D s"

# ---------- утилиты ----------
lufs(){ ffmpeg -nostdin -hide_banner -i "$1" -af ebur128=peak=true -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/I:/{print $2; exit}'; }
tpeak(){ ffmpeg -nostdin -hide_banner -i "$1" -af ebur128=peak=true -f null - 2>&1 | awk '/True peak/{f=1} f&&/Peak:/{print $2; exit}'; }
lra(){ ffmpeg -nostdin -hide_banner -i "$1" -af ebur128 -f null - 2>&1 | awk '/Loudness range/{f=1} f&&/LRA:/{print $2; exit}'; }
speak(){ ffmpeg -nostdin -hide_banner -i "$1" -af astats=measure_perchannel=none -f null - 2>&1 | awk '/Peak level dB/{print $NF; exit}'; }
# нормировать стем к целевой громкости (LUFS) — сохраняет баланс микса
level(){ local f=$1 tgt=$2 cur g; cur=$(lufs "$f"); g=$(awk -v t="$tgt" -v c="$cur" 'BEGIN{printf "%.2f", t-c}')
         $FF -i "$f" -af "volume=${g}dB" -c:a pcm_f32le "$f.tmp.wav" && mv "$f.tmp.wav" "$f"; log "  $(basename "$f"): $cur → $tgt LUFS (${g} dB)"; }
lic(){ ls "$A"/$1* 2>/dev/null | head -1 || true; }   # лицензированный файл для стема
# лицензированный файл вместо синтеза: ставим с офсетом, режем по окну
use_lic(){ local src=$1 out=$2 st=$3 en=$4; local ms; ms=$(awk -v s="$st" 'BEGIN{printf "%d", s*1000}')
  $FF -i "$src" -af "aresample=$SR,aformat=channel_layouts=stereo,atrim=0:$(awk -v a="$en" -v b="$st" 'BEGIN{print a-b}'),afade=t=in:d=0.05,adelay=${ms}:all=1,apad,atrim=0:$D" -c:a pcm_f32le "$out"
  log "  $(basename "$out"): ЛИЦЕНЗИЯ ← $src"; }
noise2(){ echo "anoisesrc=c=$1:r=$SR:d=$D:n=256:seed=$2"; }   # моно-шум нужной длины

# ---------- реверберация (синтез IR: экспоненциальный шум, RT60) ----------
mkir(){ local rt=$1 out=$2 len; len=$(awk -v r="$rt" 'BEGIN{print r*1.3}')
  $FF -f lavfi -i "anoisesrc=c=white:r=$SR:d=$len:n=64:seed=3" -f lavfi -i "anoisesrc=c=white:r=$SR:d=$len:n=64:seed=7" \
      -filter_complex "[0][1]join=inputs=2:channel_layout=stereo,highpass=f=150,lowpass=f=6500,volume='exp(-6.9078*t/$rt)':eval=frame,adelay=20:all=1" \
      -c:a pcm_f32le "$out"; }
mkir 1.8 $S/ir18.wav
mkir 2.8 $S/ir28.wav
# wet/dry: verb IN OUT IR WET(0..1)
verb(){ $FF -i "$1" -i "$3" -filter_complex "[0]asplit[d][w];[w][1]afir=gtype=none:irgain=0.06,volume=$4[wv];[d]volume=$(awk -v w="$4" 'BEGIN{print 1-w}')[dv];[dv][wv]amix=inputs=2:normalize=0:duration=first" -c:a pcm_f32le "$2"; }

log "== Стемы =="
# ---------- 0–12 с: СТРОЙКА ----------
# ветер (порывы, стерео из двух сидов) + свист
if f=$(lic wind) && [ -n "$f" ]; then use_lic "$f" $S/wind.wav 0 $T_CUT; else
$FF -f lavfi -i "$(noise2 brown 11)" -f lavfi -i "$(noise2 brown 12)" -f lavfi -i "$(noise2 pink 13)" -filter_complex \
 "[0][1]join=inputs=2:channel_layout=stereo,highpass=f=50,lowpass=f=1100,volume='0.6+0.4*sin(2*PI*0.13*t+1)*sin(2*PI*0.07*t)':eval=frame[w];
  [2]bandpass=f=1700:width_type=q:w=4,volume='0.25*(0.5+0.5*sin(2*PI*0.09*t))':eval=frame,aformat=channel_layouts=stereo[s];
  [w][s]amix=inputs=2:normalize=0" -c:a pcm_f32le $S/wind.wav; fi
level $S/wind.wav -23

# далёкий город
if f=$(lic city) && [ -n "$f" ]; then use_lic "$f" $S/city.wav 0 $T_CUT; else
$FF -f lavfi -i "$(noise2 pink 21)" -f lavfi -i "$(noise2 pink 22)" -filter_complex \
 "[0][1]join=inputs=2:channel_layout=stereo,highpass=f=60,lowpass=f=450,volume='0.8+0.2*sin(2*PI*0.05*t)':eval=frame" -c:a pcm_f32le $S/city.wav; fi
level $S/city.wav -31

# sub 42→55 Гц, нарастает к 2.8 с, затем затухает
P='(42*min(t,2.8)+13*pow(min(t,2.8),2)/5.6+55*max(t-2.8,0))'
ENV='pow(min(t/2.8,1),2)*if(lt(t,2.8),1,exp(-(t-2.8)*3))'
$FF -f lavfi -i "aevalsrc='(sin(2*PI*$P)+0.2*sin(4*PI*$P))*$ENV':s=$SR:d=$D:c=mono" -af "aformat=channel_layouts=stereo,afade=t=in:d=0.05" -c:a pcm_f32le $S/sub.wav
$FF -i $S/sub.wav -af "volume=$(awk -v p="$(speak $S/sub.wav)" 'BEGIN{printf "%.2f", -15-p}')dB" -c:a pcm_f32le $S/sub.tmp.wav && mv $S/sub.tmp.wav $S/sub.wav
log "  sub.wav: пик −15 dBFS @ 2.8 с (42→55 Гц)"

# гул дрона 3–12: гармоники мотора (лёгкое плавание тона) + шум винтов с модуляцией лопастей
E_DR='clip((t-3)/1,0,1)*(1-0.45*clip((t-9)/2,0,1))'
if f=$(lic drone) && [ -n "$f" ]; then use_lic "$f" $S/drone.wav 3 $T_CUT; else
PH='(170*t-6/(2*PI*0.11)*cos(2*PI*0.11*t))'
$FF -f lavfi -i "aevalsrc='(sin(2*PI*$PH)+0.6*sin(4*PI*$PH)+0.35*sin(6*PI*$PH)+0.5*sin(8*PI*$PH)+0.2*sin(10*PI*$PH))*$E_DR|(sin(2*PI*1.003*$PH)+0.6*sin(4*PI*1.003*$PH)+0.35*sin(6*PI*1.003*$PH)+0.5*sin(8*PI*1.003*$PH)+0.2*sin(10*PI*1.003*$PH))*$E_DR':s=$SR:d=$D:n=256" \
    -f lavfi -i "$(noise2 white 31)" -f lavfi -i "$(noise2 white 32)" -filter_complex \
 "[0]lowpass=f=3500,volume=0.25[h];[1][2]join=inputs=2:channel_layout=stereo,bandpass=f=2200:width_type=h:w=1800,tremolo=f=46:d=0.3,volume='$E_DR':eval=frame[n];
  [h][n]amix=inputs=2:normalize=0:weights=1 0.6" -c:a pcm_f32le $S/drone.wav; fi
level $S/drone.wav -24

# стройплощадка 3–12: два молотка (неровный ритм, маскирование ударов) + холостой дизель, вдали + реверб
if f=$(lic site) && [ -n "$f" ]; then use_lic "$f" $S/site.wav 3 $T_CUT; else
K1='exp(-30*mod(t-3.2,1.13))*(sin(2*PI*1150*mod(t-3.2,1.13))+0.6*sin(2*PI*2730*mod(t-3.2,1.13))+0.3*sin(2*PI*4120*mod(t-3.2,1.13)))*gt(sin(floor((t-3.2)/1.13)*12.9898),-0.3)*between(t,3.2,11.9)'
K2='0.7*exp(-34*mod(t-3.65,1.71))*(sin(2*PI*900*mod(t-3.65,1.71))+0.5*sin(2*PI*2210*mod(t-3.65,1.71)))*gt(sin(floor((t-3.65)/1.71)*78.233),0)*between(t,3.65,11.9)'
$FF -f lavfi -i "aevalsrc='0.8*($K1)+0.4*($K2)|0.4*($K1)+0.8*($K2)':s=$SR:d=$D" -f lavfi -i "$(noise2 brown 41)" -filter_complex \
 "[0]lowpass=f=3500[k];[1]lowpass=f=140,tremolo=f=12:d=0.5,volume='3*clip((t-3)/1.5,0,1)':eval=frame,aformat=channel_layouts=stereo[e];
  [k][e]amix=inputs=2:normalize=0:weights=0.5 1" -c:a pcm_f32le $S/site_dry.wav
verb $S/site_dry.wav $S/site.wav $S/ir18.wav 0.45; rm $S/site_dry.wav; fi
level $S/site.wav -30

# звук исходника (синхронный, из build_base.sh) — главный слой, НЕ глушится в 12 с
SRC_AUDIO=${SRC_AUDIO:-$O/reel_src_audio.wav}
BUS_IN="[w][c][d][s]"; NB=4; EXTRA=(); HAVE_VOICE=0
if [ -f "$SRC_AUDIO" ]; then
  $FF -i "$SRC_AUDIO" -af "aresample=$SR,aformat=channel_layouts=stereo,highpass=f=80,afftdn=nf=-30:nr=10,lowpass=f=12000,dynaudnorm=f=150:g=11:m=8:p=0.9,acompressor=threshold=0.1:ratio=3:attack=10:release=150:makeup=2,apad,atrim=0:$D" -c:a pcm_f32le $S/voice.wav
  level $S/voice.wav -16
  HAVE_VOICE=1; log "  voice.wav: ИСХОДНИК ← $SRC_AUDIO (highpass 80, afftdn, dynaudnorm, компрессор 3:1); фон приглушается под него"
else log "  звук исходника не найден → только синтез"; fi

# шина стройки + «глушение» в 12 с: lowpass 1.5 кГц, −6 дБ, кроссфейд 30 мс (без щелчка), затем уход за 4 с
$FF -i $S/wind.wav -i $S/city.wav -i $S/drone.wav -i $S/site.wav "${EXTRA[@]}" -filter_complex \
 "[0]anull[w];[1]anull[c];[2]anull[d];[3]anull[s];${BUS_IN}amix=inputs=$NB:normalize=0,asplit[a][b];
  [a]afade=t=out:st=$(awk -v c=$T_CUT 'BEGIN{print c-0.015}'):d=0.03[pre];
  [b]lowpass=f=1500:p=2,lowpass=f=1500:p=2,volume=-6dB,afade=t=in:st=$(awk -v c=$T_CUT 'BEGIN{print c-0.015}'):d=0.03,afade=t=out:st=13:d=4[post];
  [pre][post]amix=inputs=2:normalize=0" -c:a pcm_f32le $S/bus_site.wav
log "  bus_site.wav: стройка; в ${T_CUT} с — lowpass 1.5 кГц (24 дБ/окт), −6 дБ, кроссфейд 30 мс"

# ---------- 9–12 с: ПЕРЕХОД ----------
# whoosh: шум с качающейся полосой (asendcmd), L чуть опережает R → движение
CMD=$S/whoosh.cmd; : > $CMD
awk 'BEGIN{for(t=10.2;t<=11.95;t+=0.025){ if(t<11.4) f=400*exp(log(3200/400)*(t-10.2)/1.2); else f=3200*exp(log(900/3200)*(t-11.4)/0.55);
      printf "%.3f bandpass@bl f %.0f, bandpass@br f %.0f;\n", t, f, f*1.08 }}' >> $CMD
WE='if(lt(t,11.4),pow(clip((t-10.3)/1.1,0,1),2),pow(clip(1-(t-11.4)/0.55,0,1),1.5))'
if f=$(lic whoosh) && [ -n "$f" ]; then use_lic "$f" $S/whoosh.wav 10.3 $T_CUT; else
$FF -f lavfi -i "$(noise2 white 51)" -f lavfi -i "$(noise2 white 52)" -filter_complex \
 "[0]asendcmd=f=$CMD,bandpass@bl=f=400:width_type=q:w=1.2,volume='$WE':eval=frame[l];
  [1]bandpass@br=f=430:width_type=q:w=1.2,volume='if(lt(t-0.06,11.4),pow(clip((t-0.06-10.3)/1.1,0,1),2),pow(clip(1-(t-0.06-11.4)/0.55,0,1),1.5))':eval=frame[r];
  [l][r]join=inputs=2:channel_layout=stereo,afade=t=out:st=11.95:d=0.04" -c:a pcm_f32le $S/whoosh.wav; fi
$FF -i $S/whoosh.wav -af "volume=$(awk -v p="$(speak $S/whoosh.wav)" 'BEGIN{printf "%.2f", -13-p}')dB" -c:a pcm_f32le $S/x.wav && mv $S/x.wav $S/whoosh.wav
log "  whoosh.wav: 10.3–11.95 с, полоса 400→3200→900 Гц, пик −13 dBFS"

# обратный реверс: удар (шум + A3/E4) в зеркальной точке → реверб 2.8 с (wet) → areverse ⇒ нарастание, обрывается в 12.0 с
TH=$(awk -v d=$D -v c=$T_CUT 'BEGIN{print d-c}')
$FF -f lavfi -i "aevalsrc='(0.6*sin(2*PI*220*(t-$TH))+0.4*sin(2*PI*329.63*(t-$TH)))*exp(-6*(t-$TH))*gte(t,$TH)':s=$SR:d=$D:c=mono" -f lavfi -i "$(noise2 pink 61)" -i $S/ir28.wav -filter_complex \
 "[1]volume='exp(-60*max(t-$TH,0))*gte(t,$TH)':eval=frame[n];[0][n]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo[h];
  [h][2]afir=gtype=none:irgain=0.06,areverse,afade=t=in:st=$(awk -v c=$T_CUT 'BEGIN{print c-2.6}'):d=1,afade=t=out:st=$(awk -v c=$T_CUT 'BEGIN{print c-0.035}'):d=0.03,atrim=0:$D" -c:a pcm_f32le $S/revverb.wav
$FF -i $S/revverb.wav -af "volume=$(awk -v p="$(speak $S/revverb.wav)" 'BEGIN{printf "%.2f", -15-p}')dB" -c:a pcm_f32le $S/x.wav && mv $S/x.wav $S/revverb.wav
log "  revverb.wav: reverse-reverb (RT60 2.8 с) 9.4→12.0 с, пик −15 dBFS"

# ---------- 12–18 с: ИНТЕРЬЕР ----------
# пад Am7 (A2 E3 G3 C4 E4), детюн L/R ±0.15 %, атака 1.5 с (косинус), старт 12.2 с
PA="if(lt(t,$T_PAD),0,0.5-0.5*cos(PI*min((t-$T_PAD)/1.5,1)))"
voice(){ local f=$1 k=$2; echo "(sin(2*PI*$f*$k*t)+0.25*sin(4*PI*$f*$k*t)+0.08*sin(6*PI*$f*$k*t))*(0.85+0.15*sin(2*PI*0.$((RANDOM%5+2))*t))"; }
chord(){ local k=$1; echo "($(voice 110 $k)+0.8*$(voice 164.81 $k)+0.7*$(voice 196 $k)+0.6*$(voice 261.63 $k)+0.45*$(voice 329.63 $k))"; }
if f=$(lic pad) && [ -n "$f" ]; then use_lic "$f" $S/pad.wav $T_PAD $D; else
$FF -f lavfi -i "aevalsrc='$(chord 0.9985)*$PA|$(chord 1.0015)*$PA':s=$SR:d=$D" -af "lowpass=f=1800,chorus=0.6:0.9:50|60:0.3|0.25:0.25|0.3:2|2.3" -c:a pcm_f32le $S/pad_dry.wav
verb $S/pad_dry.wav $S/pad.wav $S/ir18.wav 0.4; rm $S/pad_dry.wav; fi
level $S/pad.wav -20

# шаги по паркету: каблук (95 Гц) + дерево (520/1350 Гц) + носок через 75 мс + щелчок шума; чередование L/R; реверб 1.8 с
ST=12.7; IV=0.56
PHs="mod(t-$ST,$IV)"; G="between(t,$ST,17.0)"
STEP="(sin(2*PI*95*$PHs)*exp(-40*$PHs)+0.4*sin(2*PI*520*$PHs)*exp(-70*$PHs)+0.25*sin(2*PI*1350*$PHs)*exp(-110*$PHs)+0.5*gte($PHs,0.075)*(sin(2*PI*120*($PHs-0.075))*exp(-50*($PHs-0.075))+0.3*sin(2*PI*610*($PHs-0.075))*exp(-90*($PHs-0.075))))*$G"
LR="mod(floor((t-$ST)/$IV),2)"
if f=$(lic steps) && [ -n "$f" ]; then use_lic "$f" $S/steps.wav $ST $D; else
$FF -f lavfi -i "aevalsrc='$STEP*(0.7+0.3*$LR)|$STEP*(1-0.3*$LR)':s=$SR:d=$D" -f lavfi -i "$(noise2 white 71)" -filter_complex \
 "[1]bandpass=f=3000:width_type=q:w=0.8,volume='0.5*exp(-150*$PHs)*$G':eval=frame,aformat=channel_layouts=stereo[c];[0][c]amix=inputs=2:normalize=0,lowpass=f=7000" -c:a pcm_f32le $S/steps_dry.wav
verb $S/steps_dry.wav $S/steps.wav $S/ir18.wav 0.25; rm $S/steps_dry.wav; fi
level $S/steps.wav -26

# звук ИИ-вставки: реальный (если задан) или синтетический «воздух» — 100 % в большом зале (RT60 2.8 с)
IE="clip((t-$T_INS)/0.8,0,1)"
if [ -n "$INSERT_AUDIO" ] && [ -f "$INSERT_AUDIO" ]; then
  $FF -i "$INSERT_AUDIO" -vn -af "aresample=$SR,aformat=channel_layouts=stereo,highpass=f=100,adelay=$(awk -v s=$T_INS 'BEGIN{printf "%d",s*1000}'):all=1,apad,atrim=0:$D" -c:a pcm_f32le $S/ins_dry.wav
  verb $S/ins_dry.wav $S/insert.wav $S/ir28.wav 0.5; log "  insert.wav: ИСХОДНИК ← $INSERT_AUDIO (reverb 2.8 с, 50 %)"
else
  $FF -f lavfi -i "aevalsrc='(0.5*sin(2*PI*880*t)+0.35*sin(2*PI*1318.5*t)+0.15*sin(2*PI*1760*t))*$IE*(0.7+0.3*sin(2*PI*0.5*t))|(0.5*sin(2*PI*881*t)+0.35*sin(2*PI*1319.5*t)+0.15*sin(2*PI*1761*t))*$IE*(0.7+0.3*sin(2*PI*0.43*t))':s=$SR:d=$D" -c:a pcm_f32le $S/ins_dry.wav
  verb $S/ins_dry.wav $S/insert.wav $S/ir28.wav 1.0; log "  insert.wav: синтез «воздух зала» (A5/E6), 100 % wet, RT60 2.8 с"
fi; rm -f $S/ins_dry.wav
level $S/insert.wav -32

# «динь» 12.5 с: 1200 + 2400 Гц, затухание 1.2 с (−60 дБ), атака 3 мс, пик −18 dBFS, лёгкий реверб
X="(t-$T_INS)"
if f=$(lic ding) && [ -n "$f" ]; then use_lic "$f" $S/ding.wav $T_INS $D; else
$FF -f lavfi -i "aevalsrc='(sin(2*PI*1200*$X)+0.5*sin(2*PI*2400*$X))*exp(-5.756*$X)*min($X/0.003,1)*gte(t,$T_INS)':s=$SR:d=$D:c=mono" -af aformat=channel_layouts=stereo -c:a pcm_f32le $S/ding_dry.wav
verb $S/ding_dry.wav $S/ding.wav $S/ir18.wav 0.3; rm $S/ding_dry.wav; fi
DING_PK=-18

# ---------- СВЕДЕНИЕ ----------
log "== Сведение =="
mixit(){ # $1 = доп. гейн мастера (dB), $2 = выход
local vin=() bed="[0][1][2][3][4][5][6][dg]amix=inputs=8:normalize=0"
if [ $HAVE_VOICE = 1 ]; then vin=(-i $S/voice.wav)
  bed+="[bed];[8]asplit[vo][sc];[bed][sc]sidechaincompress=threshold=0.03:ratio=5:attack=30:release=400:makeup=1[duck];[duck][vo]amix=inputs=2:normalize=0"; fi
$FF -i $S/bus_site.wav -i $S/sub.wav -i $S/whoosh.wav -i $S/revverb.wav -i $S/pad.wav -i $S/steps.wav -i $S/insert.wav -i $S/ding.wav "${vin[@]}" -filter_complex \
 "[7]volume=$(awk -v p="$(speak $S/ding.wav)" -v t=$DING_PK -v m="$1" 'BEGIN{printf "%.2f", t-p-m}')dB[dg];
  $bed,
  afade=t=in:d=0.3,afade=t=out:st=$(awk -v d=$D 'BEGIN{print d-1}'):d=1,
  bass=g=-6:f=150:w=0.6,equalizer=f=1000:width_type=o:w=2:g=2.5,treble=g=-1.5:f=3000:w=0.6,
  volume=${1}dB,aresample=192000,alimiter=limit=0.79:attack=3:release=60:level=disabled,aresample=$SR" -c:a pcm_f32le "$2"; }
# «динь» держим на −18 dBFS в финале: компенсируем мастер-гейн
mixit 0 $S/premix.wav
I0=$(lufs $S/premix.wav); G=$(awk -v i="$I0" 'BEGIN{printf "%.2f", -14-i}')
mixit "$G" $S/master.wav
I1=$(lufs $S/master.wav); G=$(awk -v g="$G" -v i="$I1" 'BEGIN{printf "%.2f", g+(-14-i)}')   # 2-я итерация (лимитер съедает часть)
mixit "$G" $S/master.wav
log "  premix ${I0} LUFS → мастер-гейн ${G} dB, alimiter −2 dBFS на 4× оверсемплинге (≈ true peak)"

$FF -i $S/master.wav -c:a aac -b:a 192k -ar $SR -ac 2 $O/reel_pip_audio.m4a
if [ -f "$VIDEO" ]; then
  $FF -i "$VIDEO" -i $O/reel_pip_audio.m4a -map 0:v:0 -map 1:a:0 -c:v copy -c:a copy -movflags +faststart -shortest $O/reel_pip_final.mp4
  FINAL=$O/reel_pip_final.mp4
else
  FINAL=$O/reel_pip_audio.m4a
  log "  ВНИМАНИЕ: видео $VIDEO не найдено — muxing не выполнен, итог только аудио."
fi

# ---------- ПРОВЕРКА ----------
log "== Проверка: $FINAL =="
IF=$(lufs "$FINAL"); TF=$(tpeak "$FINAL"); LF=$(lra "$FINAL")
log "  Integrated: $IF LUFS (цель −14 ±1)   True peak: $TF dBTP (цель ≤ −1)   LRA: $LF LU"
awk -v i="$IF" -v p="$TF" 'BEGIN{ok=(i>=-15&&i<=-13&&p<=-1); print "  РЕЗУЛЬТАТ: " (ok?"PASS":"FAIL")}' | tee -a "$LOG"
for seg in "0 3" "3 9" "9 12" "12 18"; do set -- $seg
  m=$(ffmpeg -nostdin -hide_banner -i "$FINAL" -af "atrim=$1:$2,ebur128" -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/I:/{print $2; exit}')
  log "  участок $1–$2 с: $m LUFS"; done
if [ -f "$REF" ]; then
  log "== Референс: $REF =="
  log "  Integrated: $(lufs "$REF") LUFS   True peak: $(tpeak "$REF") dBTP   LRA: $(lra "$REF") LU"
  for b in "lowpass=f=150 low<150" "bandpass=f=900:width_type=h:w=1500 mid" "highpass=f=2500 high>2.5k"; do set -- $b
    r=$(ffmpeg -nostdin -hide_banner -i "$REF" -af "$1,astats=measure_perchannel=none" -f null - 2>&1 | awk '/RMS level dB/{print $NF; exit}')
    m=$(ffmpeg -nostdin -hide_banner -i "$FINAL" -af "$1,astats=measure_perchannel=none" -f null - 2>&1 | awk '/RMS level dB/{print $NF; exit}')
    log "  полоса $2: реф RMS $r dB / наш $m dB"; done
else log "== Референс не найден ($REF) — замер плотности/тона не выполнен =="; fi
ffmpeg -nostdin -hide_banner -loglevel error -y -i $S/master.wav -lavfi "showspectrumpic=s=1600x600:legend=1:scale=log:fscale=log:start=20:stop=16000" $O/spectrogram.png
log "готово: $FINAL, $O/spectrogram.png, отчёт $LOG"
