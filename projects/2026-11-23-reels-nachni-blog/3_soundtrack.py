"""ШАГ 4. Фоновая музыка и звуковые акценты — синтез кодом (бесплатно).

Что делает:
  • audio/music_generated.wav — тёмный кинематографичный эмбиент:
      ре минор в холодных сценах → тёплый мажор со слова «Хватит» (как свет в сцене 4)
  • audio/sfx_generated.wav — акценты: свуши на склейках, «хаптики» ленты, тиканье часов,
      удары и колокольчики на «Час? Два?», песок, подъём к «Хватит», включение лампы,
      REC, глитч на экране, «поп» пузыря комментария
  • sound-design.md — звуковая партитура с таймкодами

Всё привязано ко времени слов (audio/timings.json) и сцен (scene_plan.json),
поэтому после переозвучки достаточно запустить скрипт снова.
Свой трек: положите mp3/wav в папку music/ — сборка возьмёт его вместо сгенерированной музыки.

Запуск:  python3 3_soundtrack.py
"""
import wave

import numpy as np

from common import AUDIO, PLAN_FILE, ROOT, TIMINGS_FILE, fail, fmt, load_json

SR = 48000
R = np.random.default_rng(7)


# ---------------- базовые кирпичики ----------------

def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


class Bus:
    """Стерео-дорожка, на которую «наклеиваются» звуки по времени."""
    def __init__(self, seconds):
        self.n = int(seconds * SR)
        self.x = np.zeros((2, self.n))

    def add(self, t, sig, gain=1.0):
        sig = np.atleast_2d(sig)
        if sig.shape[0] == 1:
            sig = np.vstack([sig, sig])
        i, j = int(round(t * SR)), 0
        if i < 0:
            j, i = -i, 0
        n = min(sig.shape[1] - j, self.n - i)
        if n > 0:
            self.x[:, i:i + n] += gain * sig[:, j:j + n]


def ramp(n):
    return 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, max(n, 1)))


def adsr(n, attack, release, hold):
    e = np.zeros(n)
    a = min(int(attack * SR), hold)
    e[:a] = ramp(a)
    e[a:hold] = 1
    r = min(int(release * SR), n - hold)
    if r > 0:
        e[hold:hold + r] = ramp(r)[::-1]
    return e


def band(x, lo=0, hi=None):
    """Мягкий фильтр через FFT (ниже lo и выше hi — тише)."""
    X = np.fft.rfft(x)
    f = np.maximum(np.fft.rfftfreq(len(x), 1 / SR), 1)
    m = np.ones_like(f)
    if lo:
        m /= 1 + (lo / f) ** 4
    if hi:
        m /= 1 + (f / hi) ** 4
    return np.fft.irfft(X * m, len(x))


def swept_noise(n, f0, f1, q=1.4, shape=lambda u: u):
    """Шум с полосой, которая плывёт от f0 к f1 (для свушей и подъёмов)."""
    hop = 512
    win = np.hanning(2 * hop)
    x = np.concatenate([R.standard_normal(n), np.zeros(2 * hop)])
    out = np.zeros(n + 2 * hop)
    freqs = np.fft.rfftfreq(2 * hop, 1 / SR)
    for s in range(0, n, hop):
        fc = f0 * (f1 / f0) ** shape(s / n)
        mask = np.exp(-0.5 * ((freqs - fc) / (fc / q)) ** 2)
        out[s:s + 2 * hop] += np.fft.irfft(np.fft.rfft(x[s:s + 2 * hop] * win) * mask, 2 * hop) * win
    out = out[:n]
    return out / (np.sqrt(np.mean(out ** 2)) + 1e-9)


def saw(f, n, bright, phase):
    """«Мягкая пила» без цифровой грязи: сумма гармоник со спадом выше bright."""
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, 60):
        if k * f > 12000:
            break
        w = (1 / k) / (1 + (k * f / bright) ** 3)
        if w < 0.003:
            break
        out += w * np.sin(2 * np.pi * k * f * t + phase * k)
    return out


# ---------------- музыкальные инструменты ----------------

def pad(bus, t0, t1, notes, bright, gain=1.0, attack=0.7, release=1.4):
    hold = int((t1 - t0) * SR)
    n = hold + int(release * SR)
    sig = np.zeros((2, n))
    for m in notes:
        for cents in (-9, -2, 6):
            for ch, side in ((0, -4), (1, 4)):
                sig[ch] += saw(midi(m) * 2 ** ((cents + side) / 1200), n, bright, R.uniform(0, 6.28))
    t = np.arange(n) / SR
    lfo = 1 + 0.07 * np.sin(2 * np.pi * 0.23 * t + R.uniform(0, 6))
    bus.add(t0, sig * adsr(n, attack, release, hold) * lfo * gain / (len(notes) * 3))


def sub(bus, t0, t1, m, gain):
    hold = int((t1 - t0) * SR)
    n = hold + int(0.8 * SR)
    t = np.arange(n) / SR
    f = midi(m)
    bus.add(t0, (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * adsr(n, 0.5, 0.8, hold) * gain)


def pluck(bus, t, m, gain, pan=0.0):
    n = int(1.8 * SR)
    tt = np.arange(n) / SR
    f = midi(m)
    s = sum(a * np.sin(2 * np.pi * k * f * tt) * np.exp(-tt * (2.6 + k * 2.4))
            for k, a in enumerate((1, .45, .25, .14, .08), 1))
    a = int(0.004 * SR)
    s[:a] *= ramp(a)
    bus.add(t, np.vstack([s * (1 - pan) ** 0.5, s * (1 + pan) ** 0.5]) * gain / 1.4)


def chime(bus, t, f0, gain):
    n = int(4.5 * SR)
    tt = np.arange(n) / SR
    L, Rr = np.zeros(n), np.zeros(n)
    for ratio, dec, a in ((1, 1.0, 1), (2.0, 1.5, .5), (2.76, 2.0, .42), (4.07, 2.8, .28), (5.4, 3.6, .18)):
        L += a * np.sin(2 * np.pi * f0 * ratio * tt) * np.exp(-tt * dec)
        Rr += a * np.sin(2 * np.pi * f0 * ratio * 1.002 * tt + 0.7) * np.exp(-tt * dec)
    a = int(0.003 * SR)
    L[:a] *= ramp(a)
    Rr[:a] *= ramp(a)
    bus.add(t, np.vstack([L, Rr]) * gain / 2.4)


def shimmer(bus, t0, t1, notes, gain):
    hold = int((t1 - t0) * SR)
    n = hold + int(1.5 * SR)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * midi(m) * t + i) * (1 + 0.5 * np.sin(2 * np.pi * (4.5 + i) * t)) for i, m in enumerate(notes))
    bus.add(t0, np.vstack([s, np.roll(s, 240)]) * adsr(n, 1.2, 1.5, hold) * gain / len(notes))


def kick(bus, t, gain):
    n = int(0.5 * SR)
    tt = np.arange(n) / SR
    f = 44 + 70 * np.exp(-tt * 30)
    bus.add(t, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7) * gain)


# ---------------- звуковые эффекты ----------------

def impact(bus, t, gain, f_hi=95, f_lo=36, decay=2.0):
    n = int(2.6 * SR)
    tt = np.arange(n) / SR
    f = f_lo + (f_hi - f_lo) * np.exp(-tt * 9)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * decay)
    crack = band(R.standard_normal(n), 200, 2500) * np.exp(-tt * 40) * 0.25
    bus.add(t, (boom + crack) * gain)


def whoosh(bus, t_peak, gain, dur=0.8, f0=350, f1=4200):
    n = int(dur * SR)
    u = np.arange(n) / n
    peak = 0.68
    env = np.where(u < peak, (u / peak) ** 2.2, np.exp(-(u - peak) * 14))
    shape = lambda v: v / peak if v < peak else 1 - (v - peak) / (1 - peak) * 0.6
    L, Rr = swept_noise(n, f0, f1, 1.3, shape), swept_noise(n, f0, f1, 1.3, shape)
    pan = np.linspace(-0.6, 0.6, n)
    bus.add(t_peak - dur * peak, np.vstack([L * (1 - pan), Rr * (1 + pan)]) * env * gain * 0.12)


def riser(bus, t0, t1, gain):
    n = int((t1 - t0) * SR)
    u = np.arange(n) / n
    noise = np.vstack([swept_noise(n, 180, 7000, 1.2, lambda v: v ** 1.6), swept_noise(n, 180, 7000, 1.2, lambda v: v ** 1.6)])
    f = midi(50) * 2 ** (24 * u ** 1.5 / 12)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.25
    env = u ** 2.3
    env[-int(0.015 * SR):] *= np.linspace(1, 0, int(0.015 * SR))
    bus.add(t0, (noise * 0.1 + tone) * env * gain)


def tick(bus, t, gain, hi=True):
    n = int(0.05 * SR)
    tt = np.arange(n) / SR
    f = 3300 if hi else 2500
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 180) + band(R.standard_normal(n), 2000) * np.exp(-tt * 600) * 0.4
    bus.add(t, s * gain)


def haptic(bus, t, gain):
    n = int(0.04 * SR)
    tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * 160 * tt) * np.exp(-tt * 140) + np.sin(2 * np.pi * 2200 * tt) * np.exp(-tt * 500) * 0.3
    bus.add(t, s * gain)


def sand(bus, t0, t1, gain, density=170):
    n = int((t1 - t0) * SR)
    out = np.zeros((2, n))
    g = int(0.003 * SR)
    grain = np.hanning(g)
    for _ in range(int(density * (t1 - t0))):
        i = R.integers(0, n - g)
        out[R.integers(0, 2), i:i + g] += R.standard_normal(g) * grain * R.uniform(0.2, 1)
    out = np.vstack([band(out[0], 3500, 11000), band(out[1], 3500, 11000)])
    env = adsr(n, 0.4, 0.5, n - int(0.5 * SR))
    bus.add(t0, out * env * gain * 3)


def buzz(bus, t0, flicker, hum_len, gain):
    n = int((flicker + hum_len) * SR)
    tt = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * 100 * k * tt) / k for k in (1, 3, 5, 7, 9))
    gate = np.where(tt < flicker, (np.floor(tt * 30) % 3 != 0).astype(float), 0.25 * np.exp(-(tt - flicker) * 1.8))
    click = np.zeros(n)
    c = int(0.01 * SR)
    click[:c] = band(R.standard_normal(c), 800) * np.exp(-np.arange(c) / c * 6)
    bus.add(t0, (s * gate * 0.35 + click) * gain)


def beep(bus, t, gain, f=1046.5, length=0.13):
    n = int(length * SR)
    s = np.sin(2 * np.pi * f * np.arange(n) / SR) * adsr(n, 0.005, 0.03, n - int(0.03 * SR))
    bus.add(t, s * gain)


def glitch(bus, t0, t1, gain):
    n = int((t1 - t0) * SR)
    out = np.zeros(n)
    i = 0
    while i < n:
        L = int(R.uniform(0.012, 0.04) * SR)
        kind = R.integers(0, 3)
        tt = np.arange(min(L, n - i)) / SR
        if kind == 0:   # «квадратный» писк
            out[i:i + len(tt)] = np.sign(np.sin(2 * np.pi * R.uniform(180, 1800) * tt)) * 0.5
        elif kind == 1:   # «цифровой» шум (sample & hold)
            hold = R.integers(6, 30)
            out[i:i + len(tt)] = np.repeat(R.uniform(-1, 1, len(tt) // hold + 1), hold)[:len(tt)] * 0.6
        i += L
    bus.add(t0, np.vstack([out, np.roll(out, 90)]) * gain)


def pop(bus, t, gain):
    n = int(0.16 * SR)
    tt = np.arange(n) / SR
    f = 380 + 700 * (1 - np.exp(-tt * 40))
    bus.add(t, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 28) * gain)


def reverb(x, seconds=2.4, wet=0.3, damp=3800):
    n_ir = int(seconds * SR)
    t = np.arange(n_ir) / SR
    out = np.zeros_like(x)
    N = 1 << int(np.ceil(np.log2(x.shape[1] + n_ir)))
    for ch in range(2):
        ir = band(R.standard_normal(n_ir), 0, damp) * np.exp(-6.9 * t / seconds)
        ir = np.concatenate([np.zeros(int(0.025 * SR)), ir])
        ir /= np.sqrt(np.sum(ir ** 2))
        y = np.fft.irfft(np.fft.rfft(x[ch], N) * np.fft.rfft(ir, N), N)[:x.shape[1]]
        out[ch] = (1 - wet) * x[ch] + wet * y
    return out


def voice_pocket(x, lo=180, hi=450, cut_db=-6):
    """Вырезает в музыке частоты голоса, чтобы речь была разборчивой."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    center, width = np.sqrt(lo * hi), np.log2(hi / lo) / 2
    g = 10 ** (cut_db / 20)
    m = 1 - (1 - g) * np.exp(-0.5 * (np.log2(np.maximum(f, 1) / center) / width) ** 2)
    return np.fft.irfft(X * m, len(x))


def save_wav(path, x):
    x = np.clip(x, -1, 1)
    data = (x.T * 32767).astype('<i2').tobytes()
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)


def db(v):
    return 20 * np.log10(max(v, 1e-9))


# ---------------- партитура ----------------

def main():
    if not (TIMINGS_FILE.exists() and PLAN_FILE.exists()):
        fail("Сначала: python3 1_voiceover.py и python3 2_plan_scenes.py")
    timings, plan = load_json(TIMINGS_FILE), load_json(PLAN_FILE)
    T = timings["total"]
    sc = {s["id"]: s for s in plan["scenes"]}
    c1, c2, c3, c4, c5 = (sc[i]["start"] for i in (2, 3, 4, 5, 6))
    words = [(w["text"].lower(), w["start"], w["end"]) for p in timings["phrases"] for w in p["words"]]

    def word(token):
        for text, s, _ in words:
            if text.strip('.,:;!?—') == token:
                return s
        fail(f"В озвучке не найдено слово «{token}» — проверьте project.json")

    w_svoi, w_net, w_chas, w_dva = word("свои"), word("нет"), word("час"), word("два")
    w_chuzh, w_den, w_hv, w_15 = word("чужой"), word("день"), word("хватит"), word("пятнадцати")
    w_odno, w_snim, w_pishi, w_chestno = word("одно"), word("снимать"), word("пиши"), word("честно")
    mid4 = (w_hv + c4) / 2

    music, fx = Bus(T + 4), Bus(T + 4)
    cues = []   # для партитуры

    # --- гармония: холодно → тепло ---
    sections = [
        (0.0, c1, [50, 53, 57], 650, "Dm — холодный вход"),
        (c1, c2, [46, 50, 53], 750, "B♭ — время утекает"),
        (c2, c3, [43, 46, 50, 62], 850, "Gm(add9) — напряжение"),
        (c3, w_hv, [45, 50, 52], 950, "Asus4 — ожидание"),
        (w_hv, mid4, [41, 45, 48, 53], 2000, "F — тепло, «Хватит»"),
        (mid4, c4, [48, 52, 55, 60], 2200, "C — уверенность"),
        (c4, w_snim, [46, 50, 53, 60], 1800, "B♭(add9) — выбор"),
        (w_snim, c5, [41, 45, 48, 57], 2400, "F — «снимать», кульминация"),
        (c5, w_pishi, [50, 53, 57], 1000, "Dm — вопрос зрителю"),
        (w_pishi, T, [46, 50, 53, 57], 1500, "B♭maj7 — открытый финал"),
    ]
    for i, (a, b, notes, bright, name) in enumerate(sections):
        start = a if i == 0 else a - 0.3
        end = min(b + 0.3, T - 0.2) if i < len(sections) - 1 else T - 0.9
        pad(music, start, end, [n + 12 for n in notes], bright * 2,
            attack=0.3 if i == 0 else 0.6, release=1.2 if i < len(sections) - 1 else 0.9)
        sub(music, start, end, notes[0] - 12, 0.3)
        cues.append((a, f"Музыка: {name}"))
    air = np.vstack([band(R.standard_normal(music.n), 5000, 12000), band(R.standard_normal(music.n), 5000, 12000)])
    tt = np.arange(music.n) / SR
    music.x += air * 0.012 * (1 + 0.4 * np.sin(2 * np.pi * 0.11 * tt))
    shimmer(music, c2, c3, [74, 81, 86], 0.05)
    shimmer(music, c5, T - 1.0, [74, 81, 88], 0.04)

    # пульс «сердце» с 80 BPM, со сцены 2
    beat = 0.75
    t = c1
    while t < T - 1.2:
        kick(music, t, 0.5 if t > w_hv else 0.35)
        t += beat
    cues.append((c1, "Музыка: пульс 80 BPM (как сердцебиение)"))

    # тёплое арпеджио после «Хватит»
    t, k = w_hv + 0.1, 0
    while t < c5 - 0.2:
        chord = next(n for a, b, n, *_ in sections if a <= t < b)
        pattern = [0, 1, 2, 1, 3 % len(chord), 2, 1, 2]
        pluck(music, t, chord[pattern[k % 8]] + 24, 0.09, pan=0.35 * np.sin(k * 0.9))
        t += beat / 2
        k += 1
    cues.append((w_hv, "Музыка: тёплое арпеджио восьмыми"))

    # колокольчики-«часы» на «Час? Два?» и в ключевых точках
    chime(music, w_chas + 0.02, midi(74), 0.35)
    chime(music, w_dva + 0.02, midi(81), 0.35)
    chime(music, w_snim + 0.02, midi(84), 0.25)
    chime(music, w_pishi + 0.05, midi(86), 0.15)

    # --- SFX ---
    impact(fx, 0.0, 0.35, f_hi=70)
    cues.append((0.0, "SFX: мягкий саб-удар на первом кадре"))
    # «хаптики» ленты в сцене 1: замедляются вместе с прокруткой
    t_stop = w_svoi - 0.05
    prev = None
    for ms in range(0, int(t_stop * 1000)):
        u = ms / 1000 / t_stop
        pos = 1500 * (1 - (1 - (1 - u) ** 3))
        cell = int(pos // 124)
        if prev is not None and cell != prev:
            haptic(fx, ms / 1000, 0.35)
        prev = cell
    cues.append((0.0, "SFX: «хаптики» прокрутки сторис, замедляются к остановке"))
    impact(fx, w_net, 0.55, f_hi=80)
    cues.append((w_net, "SFX: глухой удар на «нет?»"))

    for cut in (c1, c2, c3, c4, c5):
        whoosh(fx, cut, 0.9)
        cues.append((cut, "SFX: whoosh на склейке"))

    # тиканье часов: ускоряется к «Час?», после «Два?» — спокойно
    t, gap, hi = c1 + 0.12, 0.42, True
    while t < w_chas - 0.08:
        tick(fx, t, 0.3, hi)
        hi = not hi
        t += gap
        gap = max(0.1, gap * 0.86)
    t = w_dva + 0.5
    while t < c2 - 0.1:
        tick(fx, t, 0.22, hi)
        hi = not hi
        t += 0.5
    impact(fx, w_chas, 0.8)
    impact(fx, w_dva, 0.95)
    cues.append((c1 + 0.12, "SFX: тиканье часов, ускоряется"))
    cues.append((w_chas, "SFX: удар + колокол на «Час?»"))
    cues.append((w_dva, "SFX: удар + колокол выше на «Два?»"))

    sand(fx, c2, c3 + 0.2, 0.25)
    impact(fx, w_chuzh, 0.55, f_hi=120, decay=2.6)
    cues.append((c2, "SFX: шорох песка-иконок"))
    cues.append((w_chuzh, "SFX: удар на «чужой контент»"))

    whoosh(fx, w_den + 0.2, 0.5, dur=0.35, f0=1800, f1=8000)
    cues.append((w_den, "SFX: свист «зачёркивания» 3:00:00"))
    riser(fx, c3 + 0.4, w_hv, 0.35)
    impact(fx, w_hv, 1.0, f_hi=110, decay=1.6)
    buzz(fx, w_hv, 0.3, 1.8, 0.18)
    cues.append((c3 + 0.4, f"SFX: подъём (riser) до «Хватит» ({fmt(w_hv)})"))
    cues.append((w_hv, "SFX: большой удар + треск кольцевой лампы, свет теплеет"))
    beep(fx, w_odno, 0.22)
    cues.append((w_odno, "SFX: сигнал REC"))

    impact(fx, w_snim, 0.8, f_hi=100)
    beep(fx, w_snim + 0.05, 0.18, f=1318.5, length=0.1)
    cues.append((w_snim, "SFX: удар + REC на «снимать»"))

    s6 = c5
    for a, b in ((0.05, 0.45), (0.75, 0.95), (1.25, 1.55)):
        glitch(fx, s6 + a, s6 + b, 0.16)
    glitch(fx, w_chestno - 0.05, w_chestno + 0.18, 0.1)
    cues.append((s6 + 0.05, "SFX: цифровой глитч цифр Screen Time"))
    pop(fx, w_pishi, 0.6)
    t = w_pishi + 0.35
    while t < T - 0.8:
        haptic(fx, t, 0.08)
        t += 0.16
    cues.append((w_pishi, "SFX: «поп» пузыря + тихие щелчки печати"))

    # --- сведение стемов ---
    m = reverb(music.x, 2.6, 0.32)[:, :int(T * SR)]
    m = np.vstack([voice_pocket(m[0]), voice_pocket(m[1])])
    f = reverb(fx.x, 1.6, 0.15)[:, :int(T * SR)]
    fade = int(0.9 * SR)
    m[:, -fade:] *= ramp(fade)[::-1]
    f[:, -int(0.3 * SR):] *= ramp(int(0.3 * SR))[::-1]
    m *= 10 ** (-18 / 20) / np.sqrt(np.mean(m ** 2))   # музыка: RMS −18 dBFS
    m = np.tanh(m * 1.1) / 1.1
    f *= 0.8 / np.max(np.abs(f))                       # акценты: пик −2 dBFS
    AUDIO.mkdir(exist_ok=True)
    save_wav(AUDIO / "music_generated.wav", m)
    save_wav(AUDIO / "sfx_generated.wav", f)
    print(f"Музыка:  audio/music_generated.wav  RMS {db(np.sqrt(np.mean(m ** 2))):.1f} dBFS, пик {db(np.max(np.abs(m))):.1f} dBFS")
    print(f"Акценты: audio/sfx_generated.wav    пик {db(np.max(np.abs(f))):.1f} dBFS")

    # --- партитура ---
    cues.sort(key=lambda c: c[0])
    md = ["# Саунд-дизайн: Reels «Начни блог»", "",
          f"Длительность: {T:.1f} с | Музыка: cinematic dark ambient (синтез кодом), пульс 80 BPM, "
          "холод → тепло → открытый финал", "",
          "## Звуковая партитура", "", "| Таймкод | Событие |", "|---|---|"]
    md += [f"| {fmt(t)} | {c} |" for t, c in cues]
    md += ["", "## Музыка",
           "- **Стиль:** тёмный кинематографичный эмбиент: мягкие «пилы» (пэд), саб-бас, пульс-сердцебиение, колокола.",
           "- **Настроение:** ре минор и холод в сценах 1–3 → подъём к «Хватит» → тёплый мажор и арпеджио "
           "в сценах 4–5 → вопрос в миноре → открытый финал B♭maj7.",
           "- **Если захотите свой трек:** теги для стоков — `dark cinematic ambient`, `hopeful build`, "
           "`emotional pulse`, `tech documentary`. Положите файл в папку `music/`.",
           "", "## Сведение",
           "- Голос — главный; итог ролика нормализуется к −14 LUFS, пик ≤ −1 dBTP.",
           "- Музыка автоматически приглушается под голос (сайдчейн), в паузах поднимается.",
           "- Акценты (SFX) не приглушаются; низкие удары не перекрывают разборчивость речи.",
           "- Громкость музыки и акцентов — в `project.json` (`music.volume`, `sfx.volume`).", ""]
    (ROOT / "sound-design.md").write_text("\n".join(md), encoding="utf-8")
    print("Партитура: sound-design.md")


if __name__ == "__main__":
    main()
