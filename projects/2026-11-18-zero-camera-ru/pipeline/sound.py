"""Шаг 4b. Саунд-дизайн: SFX по анимациям + фоновая музыка + сведение. Всё синтезируется кодом —
без стоков и без лицензионных ограничений (звуки и музыка принадлежат автору ролика).

Вход:  build/script.json, build/timeline.json, build/audio/words.json, build/audio/voiceover.mp3
Выход: build/audio/sfx.wav, build/audio/music.wav, build/audio/mix.mp3, sound-design.md

Точки SFX выводятся из того, как анимируются компоненты (задержки появления в кадрах совпадают
с graphics/remotion/src/compositions/*), поэтому звук попадает ровно в движение."""
import json
import numpy as np
from scipy.signal import butter, sosfilt, lfilter
from common import load_config, p, run, duration

SR = 48000
rng = np.random.default_rng(7)
cfg = load_config(); A = cfg["audio"]; fps = cfg["format"]["fps"]
script = json.loads(p(cfg["script"]["output_json"]).read_text(encoding="utf-8"))
tl = json.loads(p(cfg["voiceover"]["timeline_json"]).read_text(encoding="utf-8"))
words = json.loads(p(cfg["alignment"]["output_json"]).read_text(encoding="utf-8"))
TOTAL = tl["total_sec"]


# ───────────────────────── синтез SFX ─────────────────────────
def T(d): return np.arange(int(d * SR)) / SR
def sos(kind, f, order=2):
    f = np.atleast_1d(np.clip(f, 20, SR / 2 - 100)).astype(float)
    return butter(order, f if len(f) > 1 else f[0], btype=kind, fs=SR, output="sos")
def filt(x, kind, f, order=2): return sosfilt(sos(kind, f, order), x)
def norm(x, peak=1.0): m = np.max(np.abs(x)) or 1; return x / m * peak
def st(x, pan=0.0):  # моно → стерео с панорамой −1…1
    return np.vstack([x * np.sqrt((1 - pan) / 2) * 1.414, x * np.sqrt((1 + pan) / 2) * 1.414])
def glide(f0, f1, d):  # экспоненциальный свип частоты → фаза
    t = T(d); f = f0 * (f1 / f0) ** (t / d); return 2 * np.pi * np.cumsum(f) / SR
def sweep_noise(d, f0, f1, q=1.2, block=256):  # шум через полосовой фильтр с движущейся частотой
    n = int(d * SR); x = rng.standard_normal(n); y = np.zeros(n); zi = None
    for i in range(0, n, block):
        fc = f0 * (f1 / f0) ** (i / n); s = sos("bandpass", [fc / q, min(fc * q, SR / 2 - 200)])
        if zi is None: zi = np.zeros((s.shape[0], 2))
        y[i:i + block], zi = sosfilt(s, x[i:i + block], zi=zi)
    return y
def reverb(x, mix=.25, size=1.0):
    y = np.zeros_like(x)
    for d, g in [(1557, .82), (1617, .81), (1491, .80), (1422, .79)]:
        a = np.zeros(int(d * size) + 1); a[0] = 1; a[-1] = -g; y += lfilter([1], a, x)
    for d, g in [(225, .5), (556, .5)]:
        b = np.zeros(d + 1); b[0] = -g; b[-1] = 1; a = np.zeros(d + 1); a[0] = 1; a[-1] = -g; y = lfilter(b, a, y)
    return x * (1 - mix) + norm(y, np.max(np.abs(x))) * mix

def whoosh(d=.42, f0=350, f1=5000, pan=(-.6, .6)):
    y = sweep_noise(d, f0, f1); t = T(d); env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2.2
    y = norm(y * env, .9); pans = np.linspace(*pan, len(y))
    return np.vstack([y * np.sqrt((1 - pans) / 2), y * np.sqrt((1 + pans) / 2)]) * 1.3
def swish(): return whoosh(.22, 1800, 9000, (.3, -.3)) * .8
def pop():
    d = .12; t = T(d); y = np.sin(glide(950, 280, d)) + .3 * np.sin(2 * glide(950, 280, d))
    y *= np.exp(-t / .035); y[:120] += rng.standard_normal(120) * np.linspace(.6, 0, 120)
    return st(norm(filt(y, "highpass", 180), .9))
def tick():
    d = .06; t = T(d); y = (np.sin(2 * np.pi * 2300 * t) + .4 * np.sin(2 * np.pi * 4600 * t)) * np.exp(-t / .012)
    return st(norm(y, .6))
def click():
    d = .03; t = T(d); y = filt(rng.standard_normal(len(t)), "highpass", 2500) * np.exp(-t / .003) + .5 * np.sin(2 * np.pi * 1400 * t) * np.exp(-t / .008)
    return st(norm(y, .8))
def thud():
    d = .25; t = T(d); y = np.sin(glide(150, 55, d)) * np.exp(-t / .07)
    y += filt(rng.standard_normal(len(t)), "lowpass", 900) * np.exp(-t / .015) * .5
    return st(norm(y, .9))
def riser(d=1.2):
    t = T(d); n = sweep_noise(d, 400, 9000, 1.6); s = np.sin(glide(180, 900, d)) * .35
    env = (t / d) ** 2.5; y = norm((n + s) * env, .9)
    return np.vstack([y, np.roll(y, 240)])  # лёгкая стерео-ширина
def impact():
    d = 1.6; t = T(d); sub = np.sin(glide(62, 30, d)) * np.exp(-t / .35)
    hit = np.sin(2 * np.pi * 180 * t) * np.exp(-t / .05) * .5
    nz = filt(rng.standard_normal(len(t)), "lowpass", 3500) * np.exp(-t / .03) * .7
    y = np.tanh(2.2 * (sub + hit + nz)); y = reverb(y, .22)
    return st(norm(y, 1.0))
def ding():
    d = 1.4; t = T(d); f = 1318.5
    y = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / dec) for k, a, dec in [(1, 1, .6), (2.76, .45, .25), (5.4, .25, .12), (8.93, .12, .06)])
    return st(norm(reverb(y, .3), .7), .15)
def typing(d, cps):
    n = int(d * SR); y = np.zeros(n); k = 0.0
    while k < d - .03:
        c = click()[0] * rng.uniform(.4, 1); i = int(k * SR); m = min(len(c), n - i); y[i:i + m] += c[:m]
        k += 1 / cps * rng.uniform(.6, 1.5)
    return st(filt(y, "bandpass", [1200, 7000]) * .7)

KIT = {"whoosh": whoosh, "swish": swish, "pop": pop, "tick": tick, "click": click, "thud": thud,
       "riser": riser, "impact": impact, "ding": ding}
LEVEL_DB = {"whoosh": -16, "swish": -18, "pop": -15, "tick": -20, "click": -12, "thud": -14,
            "riser": -17, "impact": -8, "ding": -12, "typing": -24}


# ─────────────────── точки SFX из сцен и анимаций ───────────────────
def word_t(wi): return words[wi]["start"] if wi is not None and wi < len(words) else None
def flash_time(s):
    if not s.get("flash"): return None
    acc = [t for t in s["tokens"] if t["style"] in ("accent", "big") and t["wi"] is not None]
    if not acc: return None
    return word_t((acc[-1] if s["flash"] == "last" else acc[0])["wi"])

events = []  # (время, звук, описание)
def ev(t, name, what, d=None): events.append((round(t, 3), name, what, d))
flashes = []
for s, slot in zip(script["scenes"], tl["scenes"]):
    t0 = slot["start"]; fr = lambda k: t0 + k / fps
    comp = s.get("visual", {}).get("component"); pr = s.get("visual", {}).get("props", {})
    ev(t0, "pop" if s.get("transition") == "pop" else "whoosh", f"переход → «{s.get('label', s['id'])}»")
    if comp == "Cards":
        for i, it in enumerate(pr.get("items", [])): ev(fr(4 + i * pr.get("stagger", 8) + 6), "thud", f"карточка «{it.get('title', '')}» падает")
    elif comp == "Chips":
        for i, it in enumerate(pr.get("items", [])): ev(fr(6 + i * pr.get("stagger", 9) + 3), "pop", f"плашка «{it.get('text', '')}»")
    elif comp == "ToolList":
        ev(fr(2), "pop", "заголовок списка")
        for i, it in enumerate(pr.get("items", [])): ev(fr(10 + i * pr.get("stagger", 10) + 4), "tick", f"пункт «{it.get('name', '')}»")
    elif comp == "Chat":
        st_ = pr.get("stagger", 14)
        for i, m in enumerate(pr.get("messages", [])): ev(fr(6 + i * st_ + 3), "pop", f"сообщение {i + 1}")
        if pr.get("strike") is not None: ev(fr(30 + pr["strike"] * st_), "swish", "зачёркивание сообщения")
    elif comp == "Code":
        cps = pr.get("cps", 40); d = min(len(pr.get("code", "")) / cps, slot["end"] - t0 - .3)
        ev(t0 + .05, "typing", "печать кода", d)
    elif comp == "Phone":
        for i, _ in enumerate(pr.get("screens", [])[:2]): ev(fr(4 + i * 10), "whoosh", "телефон выезжает")
    elif comp == "Steps":
        for i, it in enumerate(pr.get("items", [])): ev(fr(4 + i * 6 + 3), "tick", f"шаг «{it.get('name', '')}»")
    elif comp == "Bars":
        for i, _ in enumerate(pr.get("items", [])): ev(fr(6 + i * 12 + 4), "tick", "столбик")
    elif comp == "Folder":
        ev(fr(2), "pop", "папка")
        for i, c in enumerate(pr.get("children", [])): ev(fr(12 + i * pr.get("stagger", 10) + 3), "tick", f"подпапка «{c}»")
    elif comp == "Counter":
        ev(fr(2), "riser", "счётчик", .9)
    elif comp == "CTA":
        ev(fr(14), "swish", "курсор подлетает"); ev(fr(34), "click", "клик по кнопке"); ev(fr(36), "ding", "подтверждение")
    ft = flash_time(s)
    if ft is not None:
        flashes.append((ft, s["id"]))
        rd = min(1.2, max(.5, ft - t0 + .3)); ev(ft - rd, "riser", f"нарастание к вспышке «{s.get('label', s['id'])}»", rd)
        ev(ft, "impact", f"вспышка фона на панчлайне «{s.get('label', s['id'])}»")
events.sort()
# не дублировать звуки ближе 60 мс, переход сцены после импакта не нужен
clean = []
for e in events:
    if clean and abs(e[0] - clean[-1][0]) < .06 and e[1] == clean[-1][1]: continue
    clean.append(e)
events = clean

sfx = np.zeros((2, int((TOTAL + 2) * SR)))
for t, name, _, d in events:
    if not A["sfx"].get("enabled", True): break
    x = typing(d, 14) if name == "typing" else (riser(d) if name == "riser" and d else KIT[name]())
    x = x * 10 ** ((LEVEL_DB[name] + A["sfx"].get("gain_db", 0)) / 20)
    i = int(t * SR); m = min(x.shape[1], sfx.shape[1] - i)
    if i >= 0 and m > 0: sfx[:, i:i + m] += x[:, :m]


# ───────────────────────── музыка ─────────────────────────
M = A["music"]; bpm = M.get("bpm", 120); beat = 60 / bpm; s16 = beat / 4
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def hz(n):  # «A2» → Гц
    return 440 * 2 ** ((NOTE[n[0]] + (1 if "#" in n else 0) + 12 * (int(n[-1]) + 1) - 69) / 12)
PROG = [("A2", ["A3", "C4", "E4"]), ("F2", ["F3", "A3", "C4"]), ("C3", ["C4", "E4", "G4"]), ("G2", ["G3", "B3", "D4"])]

# Секции: intro (фильтр, без барабанов) → drop на первой вспышке → break на сценах-вспышках → drop → outro.
drop = flashes[0][0] if flashes else tl["scenes"][0]["end"]
offset = drop % beat  # сетка долей привязана так, чтобы сильная доля попала ровно в drop
breaks = []
for ft, sid in flashes[1:]:
    sl = next(x for x in tl["scenes"] if x["id"] == sid); breaks.append((sl["start"], sl["end"]))
def section(t):
    if t < drop: return "intro"
    for a, b in breaks:
        if a <= t < b: return "break"
    return "full"

def saw(f, d, h=14):
    t = T(d); return sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, h + 1) if f * k < 12000)
def sq(f, d, h=9):
    t = T(d); return sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, h + 1, 2) if f * k < 12000)
mus = {k: np.zeros(int((TOTAL + 3) * SR)) for k in ("drums", "bass", "pluck", "pad")}
def put(track, t, x):
    i = int(t * SR)
    if i < 0: x = x[-i:]; i = 0
    m = min(len(x), len(mus[track]) - i)
    if m > 0: mus[track][i:i + m] += x[:m]

kick = lambda: np.sin(glide(160, 45, .3)) * np.exp(-T(.3) / .09)
clap = lambda: filt(rng.standard_normal(int(.18 * SR)), "bandpass", [900, 3500]) * np.exp(-T(.18) / .045)
hat = lambda: filt(rng.standard_normal(int(.05 * SR)), "highpass", 7000) * np.exp(-T(.05) / .012)
step = 0; t = offset - 16 * s16 * 2  # начинаем чуть раньше нуля, чтобы такт был цельный
while t < TOTAL + 1:
    sec = section(max(t, 0)); bar = int(round((t - offset) / (16 * s16))) % len(PROG) if t >= 0 else 0
    root, chord = PROG[(int(np.floor((t - offset) / (16 * s16)))) % len(PROG)]
    k = step % 16
    if sec == "full":
        if k % 4 == 0: put("drums", t, kick() * .9)
        if k in (4, 12): put("drums", t, clap() * .55)
        if k % 2 == 1: put("drums", t, hat() * .35)
        if k % 2 == 0: put("bass", t, filt(saw(hz(root) * (2 if k % 4 == 2 else 1), s16 * 1.8, 8) * np.exp(-T(s16 * 1.8) / .12), "lowpass", 900) * .5)
    if sec in ("full", "intro"):
        notes = [hz(n) for n in chord] + [hz(chord[0]) * 2]
        f = notes[(k // 2) % len(notes)] * (2 if k % 8 >= 6 else 1)
        if k % 2 == 0: put("pluck", t, sq(f, .28) * np.exp(-T(.28) / .07) * .35)
    if k == 0 and t >= -16 * s16:
        d = 16 * s16
        pad = sum(saw(hz(n) * det, d, 6) for n in chord for det in (1, 1.004))
        env = np.minimum(1, T(d) / .25) * np.minimum(1, (d - T(d)) / .3)
        put("pad", t, pad * env * (.06 if sec == "full" else .1))
    t += s16; step += 1

# intro и break — «из-под воды» (lowpass), в drop фильтр открывается
def section_filter(x, cutoff_closed):
    y = x.copy(); lp = filt(x, "lowpass", cutoff_closed, 4); n = np.arange(len(x)) / SR
    mask = np.array([section(v) != "full" for v in n])
    y[mask] = lp[mask]; return y
music = (section_filter(mus["pluck"] + mus["pad"], 700) + mus["bass"] + mus["drums"])
music = np.vstack([music, np.roll(music, 180)])  # ширина
# музыкальная пауза перед «вопросом» в break-сцене: тишина 0,5 с перед концом break
for a, b in breaks: i0, i1 = int((b - .55) * SR), int(b * SR); music[:, i0:i1] *= np.linspace(1, 0, i1 - i0) ** 3
fade = int(1.2 * SR); end = int(TOTAL * SR); music[:, end - fade:end] *= np.linspace(1, 0, fade); music[:, end:] = 0
music = norm(music, .9)

# ───────────────────────── запись и сведение ─────────────────────────
import wave
def wav(path, x):
    x = np.clip(x[:, :int((TOTAL + .3) * SR)], -1, 1); f = p(path)
    with wave.open(str(f), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x.T * 32767).astype("<i2").tobytes())
    return f
fs = wav("build/audio/sfx.wav", sfx); fm = wav("build/audio/music.wav", music if M.get("engine", "synth") == "synth" else music * 0)
mfile = p(M["file"]) if M.get("file") else fm  # свой трек: audio.music.file
voice = p(cfg["voiceover"]["output"]); out = p(A.get("mix_output", "build/audio/mix.mp3"))
duck = M.get("duck", {"threshold": .03, "ratio": 6, "attack": 15, "release": 350})
pre = (f"[1:a]volume={M.get('volume_db', -20)}dB[m];"
       f"[0:a]asplit=2[v][vk];"
       f"[m][vk]sidechaincompress=threshold={duck['threshold']}:ratio={duck['ratio']}:attack={duck['attack']}:release={duck['release']}[md];"
       f"[v][md][2:a]amix=inputs=3:normalize=0:duration=first")
ins = ["-i", voice, "-stream_loop", "-1" if M.get("file") else "0", "-i", mfile, "-i", fs]
I = cfg["voiceover"]["lufs"]
# Двухпроходный loudnorm: замер → точная нормализация до I LUFS / −1,5 dBTP (однопроходный недобирает громкость)
meas = run(["ffmpeg", "-hide_banner", *ins, "-filter_complex", pre + f",loudnorm=I={I}:TP=-1.5:LRA=11:print_format=json[o]",
            "-map", "[o]", "-f", "null", "-"]).stderr
mj = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
ln = (f"loudnorm=I={I}:TP=-1.5:LRA=11:measured_I={mj['input_i']}:measured_TP={mj['input_tp']}:"
      f"measured_LRA={mj['input_lra']}:measured_thresh={mj['input_thresh']}:offset={mj['target_offset']}:linear=true")
run(["ffmpeg", "-y", *ins, "-filter_complex", pre + f",alimiter=limit=0.89:level=false,{ln}[o]", "-map", "[o]", "-ar", "48000", "-b:a", "192k", out])

# ───────────────────────── отчёт sound-design.md ─────────────────────────
def tc(x): return f"{int(x // 60):02}:{x % 60:05.2f}"
sec_rows, prev = [], None
for x in np.arange(0, TOTAL, .05):
    s_ = section(x)
    if s_ != prev: sec_rows.append((x, s_)); prev = s_
SEC_RU = {"intro": "интро: плак + пэд под фильтром, без барабанов", "full": "дроп: бит 4/4, бас, арпеджио, фильтр открыт",
          "break": "брейк: только пэд под фильтром, пауза перед вопросом"}
rows = "\n".join(f"| {tc(t)} | {w} | {n}{f' ({d:.1f} с)' if d else ''} | {LEVEL_DB[n]} dB |" for t, n, w, d in events)
srows = "\n".join(f"| {tc(t)} | {SEC_RU[s_]} |" for t, s_ in sec_rows)
p("sound-design.md").write_text(f"""# Саунд-дизайн: {cfg['project']['name']}
Длительность: {TOTAL:.1f} с | Музыка: синт-поп / tech-lofi, {bpm} BPM, A-минор (Am–F–C–G), энергично-уверенно

Всё синтезировано кодом (`pipeline/sound.py`) — без стоков, без лицензионных ограничений.
Сетка долей привязана к первой вспышке: сильная доля и дроп звучат ровно на панчлайне хука ({tc(drop)}).

## Музыка — структура
| Таймкод | Секция |
|---|---|
{srows}
| {tc(TOTAL - 1.2)} | аутро: затухание 1,2 с |

Громкость музыки: {M.get('volume_db', -20)} dB + дакинг под голос (sidechain, ratio {duck['ratio']}, release {duck['release']} мс).

## Звуковая партитура (SFX)
| Таймкод | Событие в кадре | SFX | Уровень |
|---|---|---|---|
{rows}

## Сведение
- Голос — основа микса; музыка уходит вниз, когда звучит речь (sidechain), и поднимается в паузах.
- SFX: {min(LEVEL_DB.values())}…{max(LEVEL_DB.values())} dB, импакт — самый громкий акцент; эффекты отфильтрованы снизу, чтобы не маскировать речь.
- Мастер: loudnorm {cfg['voiceover']['lufs']} LUFS, True Peak −1,5 dBTP (норма Reels/TikTok).

## Правки словами
| Запрос | Ключ |
|---|---|
| «музыка тише/громче» | `audio.music.volume_db` (сейчас {M.get('volume_db', -20)}) |
| «быстрее/медленнее бит» | `audio.music.bpm` (сейчас {bpm}) |
| «меньше/больше эффектов» | `audio.sfx.gain_db` |
| «без эффектов» | `audio.sfx.enabled = false` |
| «свой трек» | `audio.music.file` (путь к mp3) |
""", encoding="utf-8")
print(f"SFX: {len(events)} точек | музыка: {bpm} BPM, дроп {drop:.2f} с, брейки {breaks} | микс → {out}")
