import numpy as np, json, wave
sr=48000; d=json.load(open('voice/timeline.json')); T=d['total']; n=int(T*sr); t=np.arange(n)/sr
r=np.random.default_rng(7)
def lp(x,fc):  # one-pole lowpass, run twice
    a=np.exp(-2*np.pi*fc/sr); y=np.empty_like(x); s=0.0
    from scipy.signal import lfilter
    return lfilter([1-a],[1,-a],lfilter([1-a],[1,-a],x))
mid=lambda m:440*2**((m-69)/12)
# progression: Am9 - Fmaj7 - Cmaj7 - Em7, 4 s each
chords=[[45,57,60,64,71],[41,53,57,60,64],[48,55,59,64,67],[40,52,55,59,62]]
pad=np.zeros(n); dur=4.0
for ci in range(int(T/dur)+2):
    ch=chords[ci%4]; t0=ci*dur
    i0=max(0,int((t0-1.0)*sr)); i1=min(n,int((t0+dur+1.0)*sr))
    if i0>=n: break
    tt=t[i0:i1]; env=np.clip((tt-(t0-1.0))/1.5,0,1)*np.clip(((t0+dur+1.0)-tt)/1.5,0,1)
    for m in ch:
        for det in (-0.07,0.0,0.06):
            f=mid(m)*2**(det/12); ph=r.random()*6.28
            x=2*((f*tt+ph/6.28)%1)-1  # saw
            pad[i0:i1]+=x*env*(0.5 if m<50 else 0.25)
pad=lp(pad,900)
sub=np.sin(2*np.pi*55*t)*0.0
# soft pluck arpeggio
arp=np.zeros(n); step=0.5
for k in range(int(T/step)):
    ch=chords[int(k*step/dur)%4]; m=ch[1:][k%4]+12; t0=k*step; i0=int(t0*sr); L=int(1.2*sr); i1=min(n,i0+L)
    tt=np.arange(i1-i0)/sr; arp[i0:i1]+=np.sin(2*np.pi*mid(m)*tt)*np.exp(-tt*5)*0.35
arp=lp(arp,3000)
mus=pad/np.abs(pad).max()*0.8+arp*0.5
fade=np.clip(t/1.5,0,1)*np.clip((T-t)/2.0,0,1); mus*=fade
# SFX
sfx=np.zeros(n)
from scipy.signal import butter, sosfilt
for b in [s['start']-0.25 for s in d['segments'][1:]]:
    i0=int((b-0.45)*sr); L=int(0.9*sr); tt=np.arange(L)/sr
    no=r.standard_normal(L); env=np.sin(np.pi*tt/0.9)**2
    sos=butter(2,[300,4000],'band',fs=sr,output='sos'); w=sosfilt(sos,no)*env
    sfx[i0:i0+L]+=w*0.25
# coin chime at counter end and ding at "Пікірге"
def ding(tc,f,a=0.35):
    i0=int(tc*sr); L=int(1.5*sr); tt=np.arange(min(L,n-i0))/sr
    sfx[i0:i0+len(tt)]+=a*(np.sin(2*np.pi*f*tt)+0.5*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*8))*np.exp(-tt*4)
w=d['words']
tf=[x for x in w if x['scene']==1 and x['t']=='Финал'][0]['e']; ding(tf,1568); ding(tf+0.08,2093,0.25)
tp=[x for x in w if x['scene']==6 and x['t']=='Пікірге'][0]['s']; ding(tp,1318,0.3)
for x in [x for x in w if x['scene']==5 and x['t']=='төрт']: ding(x['s'],988,0.25)
def save(fn,x):
    x=np.clip(x,-1,1); y=(np.stack([x,x],1)*32767).astype(np.int16)
    wv=wave.open(fn,'w'); wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sr); wv.writeframes(y.tobytes()); wv.close()
save('final/music.wav',mus/np.abs(mus).max()*0.9); save('final/sfx.wav',sfx)
print(T)
