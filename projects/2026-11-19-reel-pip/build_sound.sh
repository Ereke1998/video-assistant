#!/usr/bin/env bash
# Звук «ДО → ПОСЛЕ» на каждый план (ffmpeg-only). Планы и тайминги — из shots.conf.
#   В каждом плане: «ДО» — сырая стройка (ветер, город, молотки); шторка — короткий whoosh;
#   «ПОСЛЕ» — стройка глушится (LP 1.5 кГц, −6 дБ), приходит тёплый пад Am7 + «воздух зала», «динь» в конце шторки.
#   Главный слой — синхронный звук исходника (голос), фон приглушается под него (sidechain).
#   /tmp/work/audio/<wind|city|site|pad|whoosh|ding>*.wav — лицензированные замены (шаблоны).
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); source "$HERE/shots.conf"
W=/tmp/work; S=$W/stems; O=$W/out; A=$W/audio; mkdir -p "$S" "$O" "$A"
VIDEO=${VIDEO:-$O/reel_pip.mp4}
SRC_AUDIO=${SRC_AUDIO:-$O/reel_src_audio.wav}
REF=${REF:-$(ls /mnt/user-data/uploads/*9115463577967884462*.MP4 /root/.claude/uploads/*/*9115463577967884462*.MP4 /tmp/work/ref/ref.mp4 2>/dev/null | head -1 || true)}
SR=48000; FF="ffmpeg -nostdin -hide_banner -loglevel error -y"
LOG=$O/sound_report.txt; : > "$LOG"; log(){ echo "$*" | tee -a "$LOG"; }
D=18; [ -f "$VIDEO" ] && D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO"); D=$(printf '%.3f' "$D")

lufs(){ ffmpeg -nostdin -hide_banner -i "$1" -af ebur128=peak=true -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/I:/{print $2; exit}'; }
tpeak(){ ffmpeg -nostdin -hide_banner -i "$1" -af ebur128=peak=true -f null - 2>&1 | awk '/True peak/{f=1} f&&/Peak:/{print $2; exit}'; }
lra(){ ffmpeg -nostdin -hide_banner -i "$1" -af ebur128 -f null - 2>&1 | awk '/Loudness range/{f=1} f&&/LRA:/{print $2; exit}'; }
speak(){ ffmpeg -nostdin -hide_banner -i "$1" -af astats=measure_perchannel=none -f null - 2>&1 | awk '/Peak level dB/{print $NF; exit}'; }
level(){ local f=$1 tgt=$2 cur g; cur=$(lufs "$f"); g=$(awk -v t="$tgt" -v c="$cur" 'BEGIN{printf "%.2f", t-c}')
         $FF -i "$f" -af "volume=${g}dB" -c:a pcm_f32le "$f.tmp.wav" && mv "$f.tmp.wav" "$f"; log "  $(basename "$f"): $cur → $tgt LUFS"; }
peakto(){ local f=$1 tgt=$2; $FF -i "$f" -af "volume=$(awk -v p="$(speak "$f")" -v t=$tgt 'BEGIN{printf "%.2f", t-p}')dB" -c:a pcm_f32le "$f.tmp.wav" && mv "$f.tmp.wav" "$f"; }
lic(){ ls "$A"/$1* 2>/dev/null | head -1 || true; }
noise(){ echo "anoisesrc=c=$1:r=$SR:d=$D:n=256:seed=$2"; }
mkir(){ local rt=$1 out=$2 len; len=$(awk -v r="$rt" 'BEGIN{print r*1.3}')
  $FF -f lavfi -i "anoisesrc=c=white:r=$SR:d=$len:n=64:seed=3" -f lavfi -i "anoisesrc=c=white:r=$SR:d=$len:n=64:seed=7" \
      -filter_complex "[0][1]join=inputs=2:channel_layout=stereo,highpass=f=150,lowpass=f=6500,volume='exp(-6.9078*t/$rt)':eval=frame,adelay=20:all=1" -c:a pcm_f32le "$out"; }
verb(){ $FF -i "$1" -i "$3" -filter_complex "[0]asplit[d][w];[w][1]afir=gtype=none:irgain=0.06,volume=$4[wv];[d]volume=$(awk -v w="$4" 'BEGIN{print 1-w}')[dv];[dv][wv]amix=inputs=2:normalize=0:duration=first" -c:a pcm_f32le "$2"; }
mkir 1.8 $S/ir18.wav; mkir 2.8 $S/ir28.wav

# ---------- огибающие из shots.conf ----------
# M(t): 0 в «ДО», 0→1 на шторке, 1 в «ПОСЛЕ», спад 30 мс к склейке (сырой ↔ глушёный)
# G(t): гейт пада/воздуха: атака 0.6 с от начала шторки, отпуск 0.25 с в следующий план
# (момент шторки — из shots.conf, свой у каждого плана; «-» = без проявления)
M="0"; G="0"; REV=()
while read -r st len rv _; do
  [ "$rv" = "-" ] && continue                       # план без «ПОСЛЕ» (заголовок) — только сырой звук
  r=$(awk -v a=$st -v b=$rv 'BEGIN{print a+b}'); e=$(awk -v a=$st -v b=$len 'BEGIN{print a+b}'); REV+=("$r")
  M+="+between(t,$st,$e)*clip((t-$r)/$REVEAL_DUR,0,1)*clip(($e-t)/0.03,0,1)"
  G+="+between(t,$r,$e+0.25)*min(clip((t-$r)/0.6,0,1),clip(($e+0.25-t)/0.25,0,1))"
done < <(shot_starts)
log "duration=$D s; проявления: ${REV[*]} (шторка ${REVEAL_DUR} с)"
log "== Стемы =="

# ---------- «ДО»: сырая стройка ----------
if f=$(lic wind) && [ -n "$f" ]; then $FF -stream_loop -1 -i "$f" -af "aresample=$SR,aformat=channel_layouts=stereo,atrim=0:$D" -c:a pcm_f32le $S/wind.wav; log "  wind: ЛИЦЕНЗИЯ ← $f"; else
$FF -f lavfi -i "$(noise brown 11)" -f lavfi -i "$(noise brown 12)" -f lavfi -i "$(noise pink 13)" -filter_complex \
 "[0][1]join=inputs=2:channel_layout=stereo,highpass=f=50,lowpass=f=1100,volume='0.6+0.4*sin(2*PI*0.13*t+1)*sin(2*PI*0.07*t)':eval=frame[w];
  [2]bandpass=f=1700:width_type=q:w=4,volume='0.25*(0.5+0.5*sin(2*PI*0.09*t))':eval=frame,aformat=channel_layouts=stereo[s];[w][s]amix=inputs=2:normalize=0" -c:a pcm_f32le $S/wind.wav; fi
level $S/wind.wav -24
if f=$(lic city) && [ -n "$f" ]; then $FF -stream_loop -1 -i "$f" -af "aresample=$SR,aformat=channel_layouts=stereo,atrim=0:$D" -c:a pcm_f32le $S/city.wav; else
$FF -f lavfi -i "$(noise pink 21)" -f lavfi -i "$(noise pink 22)" -filter_complex "[0][1]join=inputs=2:channel_layout=stereo,highpass=f=60,lowpass=f=450" -c:a pcm_f32le $S/city.wav; fi
level $S/city.wav -31
if f=$(lic site) && [ -n "$f" ]; then $FF -stream_loop -1 -i "$f" -af "aresample=$SR,aformat=channel_layouts=stereo,atrim=0:$D" -c:a pcm_f32le $S/site.wav; else
K1='exp(-30*mod(t-0.2,1.13))*(sin(2*PI*1150*mod(t-0.2,1.13))+0.6*sin(2*PI*2730*mod(t-0.2,1.13))+0.3*sin(2*PI*4120*mod(t-0.2,1.13)))*gt(sin(floor((t-0.2)/1.13)*12.9898),-0.3)*gte(t,0.2)'
K2='0.7*exp(-34*mod(t-0.65,1.71))*(sin(2*PI*900*mod(t-0.65,1.71))+0.5*sin(2*PI*2210*mod(t-0.65,1.71)))*gt(sin(floor((t-0.65)/1.71)*78.233),0)*gte(t,0.65)'
$FF -f lavfi -i "aevalsrc='0.8*($K1)+0.4*($K2)|0.4*($K1)+0.8*($K2)':s=$SR:d=$D" -f lavfi -i "$(noise brown 41)" -filter_complex \
 "[0]lowpass=f=3500[k];[1]lowpass=f=140,tremolo=f=12:d=0.5,volume=3,aformat=channel_layouts=stereo[e];[k][e]amix=inputs=2:normalize=0:weights=0.5 1" -c:a pcm_f32le $S/site_dry.wav
verb $S/site_dry.wav $S/site.wav $S/ir18.wav 0.45; rm $S/site_dry.wav; fi
level $S/site.wav -30
# шина стройки: сухая (1−M) ↔ глушёная LP 1.5 кГц −6 дБ (M)
$FF -i $S/wind.wav -i $S/city.wav -i $S/site.wav -filter_complex \
 "[0][1][2]amix=inputs=3:normalize=0,asetnsamples=n=64,asplit[a][b];
  [a]volume='1-($M)':eval=frame[dry];
  [b]lowpass=f=1500:p=2,lowpass=f=1500:p=2,volume='0.5*($M)':eval=frame[lp];
  [dry][lp]amix=inputs=2:normalize=0" -c:a pcm_f32le $S/bus_site.wav
log "  bus_site.wav: «ДО» сухая стройка → «ПОСЛЕ» LP 1.5 кГц −6 дБ (по огибающей M)"

# ---------- шторка: whoosh на каждое проявление ----------
WL=$(awk -v r=$REVEAL_DUR 'BEGIN{print r+0.35}')   # длина шаблона: 0.35 с до шторки + шторка
if f=$(lic whoosh) && [ -n "$f" ]; then $FF -i "$f" -af "aresample=$SR,aformat=channel_layouts=stereo,atrim=0:$WL" -c:a pcm_f32le $S/whoosh_t.wav; else
CMD=$S/whoosh.cmd; awk -v L=$WL 'BEGIN{pk=L*0.65; for(t=0;t<=L;t+=0.02){ if(t<pk) f=500*exp(log(3500/500)*t/pk); else f=3500*exp(log(1000/3500)*(t-pk)/(L-pk)); printf "%.3f bandpass@bl f %.0f, bandpass@br f %.0f;\n", t, f, f*1.08 }}' > $CMD
WE="if(lt(t,$WL*0.65),pow(clip(t/($WL*0.65),0,1),2),pow(clip(1-(t-$WL*0.65)/($WL*0.35),0,1),1.5))"
$FF -f lavfi -i "anoisesrc=c=white:r=$SR:d=$WL:n=128:seed=51" -f lavfi -i "anoisesrc=c=white:r=$SR:d=$WL:n=128:seed=52" -filter_complex \
 "[0]asendcmd=f=$CMD,bandpass@bl=f=500:width_type=q:w=1.2,volume='$WE':eval=frame[l];[1]bandpass@br=f=540:width_type=q:w=1.2,volume='$WE':eval=frame[r];
  [l][r]join=inputs=2:channel_layout=stereo,afade=t=out:st=$(awk -v l=$WL 'BEGIN{print l-0.03}'):d=0.03" -c:a pcm_f32le $S/whoosh_t.wav; fi
peakto $S/whoosh_t.wav -16
# «динь»: 1200 + 2400 Гц, затухание 1.2 с, атака 3 мс + лёгкий реверб
if f=$(lic ding) && [ -n "$f" ]; then $FF -i "$f" -af "aresample=$SR,aformat=channel_layouts=stereo" -c:a pcm_f32le $S/ding_t.wav; else
$FF -f lavfi -i "aevalsrc='(sin(2*PI*1200*t)+0.5*sin(2*PI*2400*t))*exp(-5.756*t)*min(t/0.003,1)':s=$SR:d=1.6:c=mono" -af "aformat=channel_layouts=stereo,apad=pad_dur=1.5" -c:a pcm_f32le $S/ding_dry.wav
verb $S/ding_dry.wav $S/ding_t.wav $S/ir18.wav 0.3; rm $S/ding_dry.wav; fi
peakto $S/ding_t.wav -22
# раскладка шаблонов по таймлайну
place(){ local tpl=$1 out=$2 off=$3; local ins=() fc="" i=0
  for r in "${REV[@]}"; do ins+=(-i "$tpl"); ms=$(awk -v r=$r -v o=$off 'BEGIN{v=(r+o)*1000; if(v<0)v=0; printf "%d", v}'); fc+="[$i]adelay=${ms}:all=1[d$i];"; i=$((i+1)); done
  fc+="$(for j in $(seq 0 $((i-1))); do printf '[d%d]' $j; done)amix=inputs=$i:normalize=0,apad,atrim=0:$D"
  $FF "${ins[@]}" -filter_complex "$fc" -c:a pcm_f32le "$out"; }
place $S/whoosh_t.wav $S/whoosh.wav -0.35          # заканчивается вместе со шторкой
place $S/ding_t.wav   $S/ding.wav   $REVEAL_DUR    # в конце шторки
log "  whoosh ×${#REV[@]} (пик −16 dBFS, 500→3500→1000 Гц), «динь» ×${#REV[@]} в конце шторки (пик −22 dBFS)"

# ---------- «ПОСЛЕ»: тёплый пад Am7 + «воздух зала» (по гейту G) ----------
voice(){ echo "(sin(2*PI*$1*$2*t)+0.25*sin(4*PI*$1*$2*t)+0.08*sin(6*PI*$1*$2*t))"; }
chord(){ echo "($(voice 110 $1)+0.8*$(voice 164.81 $1)+0.7*$(voice 196 $1)+0.6*$(voice 261.63 $1)+0.45*$(voice 329.63 $1))"; }
if f=$(lic pad) && [ -n "$f" ]; then $FF -stream_loop -1 -i "$f" -af "aresample=$SR,aformat=channel_layouts=stereo,atrim=0:$D" -c:a pcm_f32le $S/pad_raw.wav; else
$FF -f lavfi -i "aevalsrc='$(chord 0.9985)|$(chord 1.0015)':s=$SR:d=$D" -af "lowpass=f=1800,chorus=0.6:0.9:50|60:0.3|0.25:0.25|0.3:2|2.3" -c:a pcm_f32le $S/pad_raw.wav; fi
$FF -i $S/pad_raw.wav -af "asetnsamples=n=64,volume='$G':eval=frame" -c:a pcm_f32le $S/pad_dry.wav
verb $S/pad_dry.wav $S/pad.wav $S/ir18.wav 0.4; rm $S/pad_raw.wav $S/pad_dry.wav
level $S/pad.wav -21
$FF -f lavfi -i "aevalsrc='(0.5*sin(2*PI*880*t)+0.35*sin(2*PI*1318.5*t)+0.15*sin(2*PI*1760*t))*(0.7+0.3*sin(2*PI*0.5*t))|(0.5*sin(2*PI*881*t)+0.35*sin(2*PI*1319.5*t)+0.15*sin(2*PI*1761*t))*(0.7+0.3*sin(2*PI*0.43*t))':s=$SR:d=$D:n=64" \
    -af "volume='$G':eval=frame" -c:a pcm_f32le $S/air_dry.wav
verb $S/air_dry.wav $S/air.wav $S/ir28.wav 1.0; rm $S/air_dry.wav
level $S/air.wav -33
log "  pad.wav (Am7, реверб 1.8 с) и air.wav (зал, RT60 2.8 с) звучат только в «ПОСЛЕ»"

# ---------- голос исходника ----------
HAVE_VOICE=0
if [ -f "$SRC_AUDIO" ]; then
  $FF -i "$SRC_AUDIO" -af "aresample=$SR,aformat=channel_layouts=stereo,adeclick,highpass=f=80,lowpass=f=9000,afftdn=nf=-40:nr=15:tn=1,dynaudnorm=f=150:g=11:m=3:p=0.9,agate=threshold=0.02:ratio=2:range=0.25:attack=5:release=250,acompressor=threshold=0.1:ratio=3:attack=10:release=150:makeup=2,deesser=i=0.8:m=0.7:f=0.35,treble=g=-3:f=7000:w=0.7,apad,atrim=0:$D" -c:a pcm_f32le $S/voice.wav
  level $S/voice.wav -16; HAVE_VOICE=1
  log "  voice.wav: ИСХОДНИК ← $SRC_AUDIO (adeclick, полоса 80 Гц–9 кГц, afftdn −15 дБ, dynaudnorm ≤×3, гейт пауз −12 дБ, компрессор 3:1, де-эссер), фон приглушается под голос"
else log "  звук исходника не найден → только звуковой дизайн"; fi

# ---------- сведение ----------
log "== Сведение =="
mixit(){ local vin=() bed="[0][1][2][3][4][5]amix=inputs=6:normalize=0"
  if [ $HAVE_VOICE = 1 ]; then vin=(-i $S/voice.wav)
    bed+="[bed];[6]asplit[vo][sc];[bed][sc]sidechaincompress=threshold=0.03:ratio=5:attack=30:release=400:makeup=1[duck];[duck][vo]amix=inputs=2:normalize=0"; fi
  $FF -i $S/bus_site.wav -i $S/whoosh.wav -i $S/ding.wav -i $S/pad.wav -i $S/air.wav -f lavfi -i "anullsrc=r=$SR:cl=stereo:d=$D" "${vin[@]}" -filter_complex \
   "$bed,afade=t=in:d=0.3,afade=t=out:st=$(awk -v d=$D 'BEGIN{print d-1}'):d=1,
    bass=g=-6:f=150:w=0.6,equalizer=f=1000:width_type=o:w=2:g=2.5,treble=g=-1.5:f=3000:w=0.6,
    volume=${1}dB,aresample=192000,alimiter=limit=0.79:attack=3:release=60:level=disabled,aresample=$SR,atrim=0:$D" -c:a pcm_f32le "$2"; }
mixit 0 $S/premix.wav
I0=$(lufs $S/premix.wav); G0=$(awk -v i="$I0" 'BEGIN{printf "%.2f", -14-i}')
mixit "$G0" $S/master.wav
I1=$(lufs $S/master.wav); G1=$(awk -v g="$G0" -v i="$I1" 'BEGIN{printf "%.2f", g+(-14-i)}')
mixit "$G1" $S/master.wav
log "  premix ${I0} LUFS → мастер-гейн ${G1} dB, EQ под тон референса, alimiter −2 dBFS на 4× оверсемплинге"

$FF -i $S/master.wav -c:a aac -b:a 192k -aac_ms 0 -ar $SR -ac 2 $O/reel_pip_audio.m4a   # M/S-кодирование давало выброс TP +4.6 дБ
if [ -f "$VIDEO" ]; then
  $FF -i "$VIDEO" -i $O/reel_pip_audio.m4a -map 0:v:0 -map 1:a:0 -c:v copy -c:a copy -movflags +faststart -shortest $O/reel_pip_final.mp4; FINAL=$O/reel_pip_final.mp4
else FINAL=$O/reel_pip_audio.m4a; log "  ВНИМАНИЕ: видео $VIDEO не найдено — muxing не выполнен"; fi

# ---------- проверка ----------
log "== Проверка: $FINAL =="
IF=$(lufs "$FINAL"); TF=$(tpeak "$FINAL"); LF=$(lra "$FINAL")
log "  Integrated: $IF LUFS (цель −14 ±1)   True peak: $TF dBTP (цель ≤ −1)   LRA: $LF LU"
awk -v i="$IF" -v p="$TF" 'BEGIN{ok=(i>=-15&&i<=-13&&p<=-1); print "  РЕЗУЛЬТАТ: " (ok?"PASS":"FAIL")}' | tee -a "$LOG"
k=1; while read -r st len _; do e=$(awk -v a=$st -v b=$len 'BEGIN{print a+b}')
  m=$(ffmpeg -nostdin -hide_banner -i "$FINAL" -af "atrim=$st:$e,ebur128" -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/I:/{print $2; exit}')
  log "  план $k ($st–$e с): $m LUFS"; k=$((k+1)); done < <(shot_starts)
if [ -f "$REF" ]; then
  log "== Референс: $(basename "$REF") — Integrated $(lufs "$REF") LUFS, TP $(tpeak "$REF") dBTP, LRA $(lra "$REF") LU =="
  for b in "lowpass=f=150 low<150" "bandpass=f=900:width_type=h:w=1500 mid" "highpass=f=2500 high>2.5k"; do set -- $b
    r=$(ffmpeg -nostdin -hide_banner -i "$REF" -af "$1,astats=measure_perchannel=none" -f null - 2>&1 | awk '/RMS level dB/{printf "%.1f", $NF; exit}')
    m=$(ffmpeg -nostdin -hide_banner -i "$FINAL" -af "$1,astats=measure_perchannel=none" -f null - 2>&1 | awk '/RMS level dB/{printf "%.1f", $NF; exit}')
    log "  полоса $2: реф $r dB / наш $m dB"; done; fi
ffmpeg -nostdin -hide_banner -loglevel error -y -i $S/master.wav -lavfi "showspectrumpic=s=1600x600:legend=1:scale=log:fscale=log:start=20:stop=16000" $O/spectrogram.png
log "готово: $FINAL"
