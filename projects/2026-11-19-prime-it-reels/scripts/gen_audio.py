#!/usr/bin/env python3
"""Процедурные заглушки звука для PRIME IT Reels (без сторонних сэмплов).

Создаёт:
  public/audio/music.mp3        — tech/phonk-бит 140 BPM, 32 c, с нарастанием
  public/audio/voiceover.mp3    — тишина 32 c (заглушка под озвучку)
  public/audio/sfx/*.wav        — fan_takeoff, alarm, whoosh, crack_stone,
                                  system_freeze, fresh_air, tech_click, ding, click
Повторный запуск перезаписывает файлы. Замените их своими — имена должны совпадать.
"""
import os
import subprocess
import wave

import numpy as np

SR = 48000
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'audio')
rng = np.random.default_rng(7)


def t_arr(dur):
    return np.arange(int(dur * SR)) / SR


def write_wav(path, x, stereo=None):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1) if stereo is None else stereo
    peak = np.max(np.abs(x)) or 1.0
    x = x / peak * 0.89
    data = (x * 32767).astype('<i2')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def onepole_lp(x, fc):
    """Однополюсный ФНЧ, fc может быть массивом (модуляция)."""
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), x.shape)
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    s = 0.0
    for i in range(len(x)):
        s = (1 - a[i]) * x[i] + a[i] * s
        y[i] = s
    return y


def bandpass(x, fc, q=2.0):
    """SVF-полосовой фильтр с модулируемой частотой."""
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), x.shape)
    f = 2 * np.sin(np.pi * np.clip(fc, 20, SR / 6) / SR)
    damp = 1.0 / q
    low = band = 0.0
    y = np.empty_like(x)
    for i in range(len(x)):
        high = x[i] - low - damp * band
        band += f[i] * high
        low += f[i] * band
        y[i] = band
    return y


def env_ad(n, a, d, curve=4.0):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-6), np.exp(-(t - a) / max(d, 1e-6) * curve / 4))
    return e


def noise(n):
    return rng.standard_normal(n)


# ---------------------------------------------------------------- drums / synths

def kick(dur=0.5, f0=150, f1=45):
    t = t_arr(dur)
    f = f1 + (f0 - f1) * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) + 0.3 * noise(len(t)) * np.exp(-t * 300)


def clap(dur=0.35):
    t = t_arr(dur)
    n = bandpass(noise(len(t)), 1500, 1.2)
    e = np.zeros_like(t)
    for off in (0, 0.01, 0.022):
        e += (t >= off) * np.exp(-(t - off).clip(0) * (60 if off < 0.02 else 14))
    return n * e


def hat(dur=0.06, open_=False):
    t = t_arr(0.25 if open_ else dur)
    n = noise(len(t))
    n = n - onepole_lp(n, 7000)
    return n * np.exp(-t * (14 if open_ else 70))


def cowbell(freq, dur=0.32):
    t = t_arr(dur)
    sq = np.sign(np.sin(2 * np.pi * freq * t)) + np.sign(np.sin(2 * np.pi * freq * 1.48 * t))
    sq = bandpass(sq, freq * 1.6, 1.5)
    return sq * np.exp(-t * 11)


def bass808(freq, dur, glide_from=None):
    t = t_arr(dur)
    f = np.full_like(t, freq)
    if glide_from:
        f = freq + (glide_from - freq) * np.exp(-t * 18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph)
    x = np.tanh(2.2 * x)
    e = np.minimum(1, t / 0.005) * np.exp(-t * 1.6)
    return x * e


def place(buf, x, at, gain=1.0):
    i = int(at * SR)
    j = min(len(buf), i + len(x))
    if i < len(buf):
        buf[i:j] += x[: j - i] * gain


def music():
    dur = 32.0
    n = int(dur * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    bpm = 140
    beat = 60 / bpm
    bar = beat * 4

    # интро-райзер 0–3 c
    t = t_arr(3.0)
    rise = noise(len(t))
    rise = bandpass(rise, 300 + 5000 * (t / 3) ** 2, 3) * (t / 3) ** 2
    tone = np.sin(2 * np.pi * np.cumsum(80 + 300 * (t / 3) ** 2) / SR) * (t / 3) ** 1.5 * 0.5
    place(L, rise + tone, 0, 0.6)
    place(R, rise * 0.9 + tone, 0, 0.6)
    # sub-удар на дропе 3.0
    boom = kick(1.2, 120, 38)
    place(L, boom, 3.0, 1.0)
    place(R, boom, 3.0, 1.0)

    # бас-ноты (до-диез минор), по такту
    notes = [69.3, 69.3, 82.4, 61.7, 69.3, 69.3, 92.5, 82.4]
    # мелодия ковбелла (риф на 1/8)
    riff = [554, 0, 554, 659, 0, 554, 494, 0, 554, 0, 554, 740, 659, 0, 554, 0]

    t0 = 3.0
    k = 0
    while t0 + k * bar < 30.4:
        bt = t0 + k * bar
        section = 'dark' if 10 <= bt < 18 else ('bright' if bt >= 18 else 'main')
        lift = 1.0 + (0.35 if bt >= 26 else 0)
        # кик
        for b in (0, 1.5, 2, 3.25 if k % 2 else 2.75):
            place(L, kick(), bt + b * beat, 0.9 * lift)
            place(R, kick(), bt + b * beat, 0.9 * lift)
        # клэп на 2 и 4
        for b in (1, 3):
            c = clap()
            place(L, c, bt + b * beat, 0.45 * lift)
            place(R, c, bt + b * beat + 0.004, 0.45 * lift)
        # хэты 1/8, местами 1/16 триоли
        for s in range(8):
            hv = 0.16 if s % 2 else 0.22
            place(L, hat(), bt + s * beat / 2, hv)
            place(R, hat(), bt + s * beat / 2 + 0.002, hv * 0.8)
            if section != 'dark' and s in (6, 7):
                place(L, hat(0.04), bt + s * beat / 2 + beat / 4, 0.1)
                place(R, hat(0.04), bt + s * beat / 2 + beat / 4, 0.12)
        if k % 2 == 1:
            place(L, hat(open_=True), bt + 3.5 * beat, 0.12)
            place(R, hat(open_=True), bt + 3.5 * beat, 0.12)
        # 808
        f = notes[k % len(notes)]
        prev = notes[(k - 1) % len(notes)]
        b8 = bass808(f, bar * 0.95, glide_from=prev * 1.5 if k % 2 == 0 else None)
        place(L, b8, bt, 0.75 * lift)
        place(R, b8, bt, 0.75 * lift)
        # ковбелл
        if section != 'dark' or k % 2 == 0:
            for s, fr in enumerate(riff):
                if fr:
                    fr2 = fr * (1.122 if section == 'bright' else 1.0)
                    cb = cowbell(fr2)
                    pan = 0.6 + 0.3 * np.sin(s)
                    place(L, cb, bt + s * beat / 4, 0.16 * pan * lift)
                    place(R, cb, bt + s * beat / 4, 0.16 * (1.4 - pan) * lift)
        k += 1

    # подъём к 26 c: райзер 24–26
    t = t_arr(2.0)
    r2 = bandpass(noise(len(t)), 500 + 7000 * (t / 2) ** 2, 4) * (t / 2) ** 2
    place(L, r2, 24.0, 0.5)
    place(R, r2, 24.0, 0.5)
    place(L, kick(1.4, 130, 36), 26.0, 1.0)
    place(R, kick(1.4, 130, 36), 26.0, 1.0)
    # финальный аккорд-пэд 30.4–32
    t = t_arr(1.6)
    pad = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate((138.6, 164.8, 207.7, 277.2)))
    pad *= np.exp(-t * 1.8) * np.minimum(1, t / 0.02)
    place(L, pad, 30.4, 0.25)
    place(R, pad, 30.4, 0.25)
    # лёгкий клиппер + fade-out
    st = np.stack([L, R], axis=1)
    st = np.tanh(st * 1.3)
    fade = np.ones(n)
    fade[-int(0.6 * SR):] = np.linspace(1, 0, int(0.6 * SR))
    st *= fade[:, None]
    return st


# ---------------------------------------------------------------- SFX

def sfx_fan_takeoff():
    t = t_arr(3.2)
    prog = np.clip(t / 2.6, 0, 1)
    hum_f = 90 + 330 * prog ** 1.4
    hum = np.sin(2 * np.pi * np.cumsum(hum_f) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(hum_f * 7.1) / SR)
    air = bandpass(noise(len(t)), 400 + 3500 * prog, 1.2)
    e = np.minimum(1, t / 0.3) * np.where(t > 2.9, np.exp(-(t - 2.9) * 12), 1)
    return (0.35 * hum + 0.6 * air) * e * (0.4 + 0.6 * prog)


def sfx_alarm():
    t = t_arr(2.6)
    f = np.where((t * 4).astype(int) % 2 == 0, 880, 660)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5
    gate = ((t * 4) % 1 < 0.82).astype(float)
    x = onepole_lp(x * gate, 4500)
    return x * np.exp(-np.maximum(0, t - 2.0) * 6)


def sfx_whoosh(dur=0.9):
    t = t_arr(dur)
    p = t / dur
    e = np.sin(np.pi * p ** 0.7) ** 2
    x = bandpass(noise(len(t)), 300 + 4200 * np.sin(np.pi * p) ** 2, 1.6)
    L = x * e * (1 - 0.6 * p)
    R = x * e * (0.4 + 0.6 * p)
    return np.stack([L, R], axis=1)


def sfx_crack():
    t = t_arr(1.2)
    x = np.zeros(len(t))
    times = np.sort(rng.uniform(0, 0.55, 22))
    for k, tk in enumerate(times):
        c = bandpass(noise(int(0.04 * SR)), rng.uniform(1500, 6000), 3) * np.exp(-np.arange(int(0.04 * SR)) / SR * 140)
        i = int(tk * SR)
        x[i:i + len(c)] += c * (1.0 if k < 4 else rng.uniform(0.3, 0.8))
    thump = kick(0.6, 90, 40) * 0.8
    x[: len(thump)] += thump
    grind = bandpass(noise(len(t)), 900, 0.8) * np.exp(-t * 4) * 0.4
    return x + grind


def sfx_freeze():
    t = t_arr(1.3)
    grain = np.sign(np.sin(2 * np.pi * 220 * t[: int(0.05 * SR)])) * 0.6
    x = np.zeros(len(t))
    for i in range(14):
        g = grain * (1 if i % 3 else 0.5)
        s = int(i * 0.05 * SR)
        x[s:s + len(g)] += g
    x = np.round(x * 6) / 6  # bitcrush
    tail_t = t[int(0.7 * SR):] - 0.7
    f = 400 * np.exp(-tail_t * 5) + 30
    x[int(0.7 * SR):] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tail_t * 3) * 0.7
    return x + 0.15 * noise(len(t)) * (t < 0.7)


def sfx_fresh_air():
    t = t_arr(2.8)
    p = t / 2.8
    e = np.sin(np.pi * np.clip(p * 1.2, 0, 1)) ** 1.5
    x = bandpass(noise(len(t)), 2500 + 4000 * p, 0.9)
    sh = sum(np.sin(2 * np.pi * f * t) for f in (1760, 2217, 2637)) * 0.05 * e
    L = x * e + sh
    R = np.roll(x, 300) * e + sh
    return np.stack([L, R], axis=1)


def sfx_tech_click():
    t = t_arr(0.18)
    x = bandpass(noise(len(t)), 3500, 4) * np.exp(-t * 90)
    x += np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 60) * 0.5
    return x


def sfx_ding():
    t = t_arr(1.8)
    x = sum(a * np.sin(2 * np.pi * 1318 * r * t) * np.exp(-t * d)
            for a, r, d in ((1, 1, 2.2), (0.5, 2.0, 3.5), (0.3, 2.76, 5), (0.2, 5.4, 8)))
    return x * np.minimum(1, t / 0.002)


def sfx_click():
    t = t_arr(0.9)
    x = bandpass(noise(len(t)), 4000, 3) * np.exp(-t * 120)
    x += kick(0.9, 110, 42) * 0.7
    x += np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 40) * 0.3
    return x


def to_mp3(wav, mp3, br='192k'):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', br, mp3], check=True)
    os.remove(wav)


def main():
    sfx_dir = os.path.join(ROOT, 'sfx')
    os.makedirs(sfx_dir, exist_ok=True)
    write_wav(os.path.join(sfx_dir, 'fan_takeoff.wav'), sfx_fan_takeoff())
    write_wav(os.path.join(sfx_dir, 'alarm.wav'), sfx_alarm())
    wh = sfx_whoosh()
    write_wav(os.path.join(sfx_dir, 'whoosh.wav'), wh, stereo=wh)
    write_wav(os.path.join(sfx_dir, 'crack_stone.wav'), sfx_crack())
    write_wav(os.path.join(sfx_dir, 'system_freeze.wav'), sfx_freeze())
    fa = sfx_fresh_air()
    write_wav(os.path.join(sfx_dir, 'fresh_air.wav'), fa, stereo=fa)
    write_wav(os.path.join(sfx_dir, 'tech_click.wav'), sfx_tech_click())
    write_wav(os.path.join(sfx_dir, 'ding.wav'), sfx_ding())
    write_wav(os.path.join(sfx_dir, 'click.wav'), sfx_click())

    m = music()
    tmp = os.path.join(ROOT, '_music.wav')
    write_wav(tmp, m, stereo=m)
    to_mp3(tmp, os.path.join(ROOT, 'music.mp3'))

    # заглушка озвучки — тишина 32 c
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono',
                    '-t', '32', '-codec:a', 'libmp3lame', '-b:a', '64k',
                    os.path.join(ROOT, 'voiceover.mp3')], check=True)
    print('audio ok ->', os.path.abspath(ROOT))


if __name__ == '__main__':
    main()
