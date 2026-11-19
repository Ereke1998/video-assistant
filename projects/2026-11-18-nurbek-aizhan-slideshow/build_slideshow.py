#!/usr/bin/env python3
"""Свадебное слайд-шоу Нұрбек & Айжан — сборка видео для LED-экрана.

Использование:
  python3 build_slideshow.py --audio song.mp3 --beats beats.npy [--w 1920 --h 1080] [--preview 5,30,90]

Кадры рендерятся в Python (Pillow + numpy) и подаются в ffmpeg по pipe.
Монтаж: Ken Burns, crossfade, смены кадров привязаны к долям песни.
"""
import argparse, os, subprocess, sys
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(HERE, "photos")
FONT = "/usr/share/fonts/truetype/freefont/FreeSerifItalic.ttf"
GOLD = (222, 190, 128)
IVORY = (244, 236, 220)
FPS = 25

# ---- Сценарий: серии -> слайды ----
# (фото, план, фокус_x, фокус_y, отъезд)
# план: О — общий, С — средний, К — крупный; фокус — точка лиц (доли кадра 0..1);
# отъезд=True — камера начинает с лиц крупно и плавно отъезжает.
ACTS = [
    # 1. Он и она
    [(2, "О", .48, .29, False), (22, "С", .48, .24, False), (34, "С", .58, .26, False)],
    # 2. Белая серия
    [(1, "О", .48, .28, False), (5, "С", .50, .30, True), (3, "К", .50, .55, False),
     (18, "С", .50, .26, False), (4, "С", .50, .30, True), (31, "К", .52, .30, False),
     (29, "О", .52, .25, False), (23, "С", .58, .28, True),
     (36, "С", .50, .22, False), (6, "К", .40, .27, True), (39, "С", .48, .25, False)],
    # 3. Розовая серия
    [(21, "О", .52, .30, False), (19, "С", .62, .42, True), (25, "С", .53, .38, False),
     (40, "К", .50, .34, True), (20, "С", .64, .47, False), (35, "С", .50, .25, True),
     (41, "К", .50, .36, True)],
    # 4. Бордовое платье, светлый фон
    [(7, "О", .50, .32, False), (10, "С", .45, .28, True), (8, "О", .50, .27, False),
     (9, "С", .48, .30, True)],
    # 5. Тёмная стена
    [(27, "О", .52, .36, False), (28, "С", .52, .28, True), (24, "С", .52, .25, False),
     (37, "О", .50, .33, False), (38, "К", .50, .33, True), (26, "С", .52, .28, False),
     (30, "С", .50, .28, False), (33, "К", .42, .22, False)],
    # 6. Луна и казахский интерьер
    [(11, "О", .50, .55, False), (14, "С", .47, .29, True), (15, "К", .50, .45, False),
     (13, "С", .45, .30, False), (17, "О", .48, .29, False), (32, "С", .48, .25, True)],
    # 7. Кульминация — силуэт
    [(16, "К", .45, .25, False)],
]

INTRO_CUT = 10.3      # конец вступительного титра (вход вокала/инструментов)
OUTRO_CUT = 160.8     # переход в финальный титр (конец последнего припева)
XF = 1.0              # длительность обычного перехода, с
XF_ACT = 1.6          # переход между сериями, с
PHOTO_SCALE = 1.15    # фото выше экрана на 15% -> шире по краям, сверху/снизу срезается фон
PULL_ZOOM = 1.6       # стартовый зум отъезда с лиц
USE_PULL = False      # отъезды выключены: всё движение мягкое
KB_ZOOM = 0.045       # амплитуда обычного наезда/отъезда


def load(n):
    im = Image.open(os.path.join(PHOTOS, f"{n:02d}.jpg"))
    return ImageOps.exif_transpose(im).convert("RGB")


def grade(im):
    """Тёплая классическая цветокоррекция."""
    a = np.asarray(im).astype(np.float32)
    a = a * np.array([1.035, 1.0, 0.955], np.float32)
    a = 255 * ((a / 255) ** 0.97)                       # чуть светлее полутона
    a = (a - 128) * 1.04 + 128                          # лёгкий контраст
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def blurred_bg(im, CW, CH, dark=0.42):
    s = max(CW / im.width, CH / im.height)
    bg = im.resize((int(im.width * s) + 1, int(im.height * s) + 1), Image.BILINEAR)
    l, t = (bg.width - CW) // 2, (bg.height - CH) // 2
    bg = bg.crop((l, t, l + CW, t + CH))
    small = bg.resize((CW // 10, CH // 10), Image.BILINEAR).filter(ImageFilter.GaussianBlur(4))
    bg = small.resize((CW, CH), Image.BICUBIC)
    return ImageEnhance.Brightness(bg).enhance(dark)


def paste_framed(canvas, ph, x, y, border):
    """Фото с тонкой светлой рамкой и мягкой тенью."""
    w, h = ph.size
    sh = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(sh).rectangle([x - border + 10, y - border + 16, x + w + border + 10, y + h + border + 16], fill=170)
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    canvas.paste(Image.new("RGB", canvas.size, (0, 0, 0)), (0, 0), sh)
    ImageDraw.Draw(canvas).rectangle([x - border, y - border, x + w + border - 1, y + h + border - 1], fill=IVORY)
    canvas.paste(ph, (x, y))


def compose(slide, CW, CH):
    """Фото на всю высоту (+15%), обрезка по вертикали вокруг лиц.
    Возвращает холст и точку фокуса в координатах холста."""
    n, _plan, fx, fy, _pull = slide
    im = load(n)
    canvas = blurred_bg(im, CW, CH)
    h = int(CH * PHOTO_SCALE)
    w = int(im.width * h / im.height)
    ph = im.resize((w, h), Image.LANCZOS)
    oy = int(np.clip(fy * h - 0.38 * CH, 0, h - CH))   # лица ~в верхней трети кадра
    ph = ph.crop((0, oy, w, oy + CH))
    x0 = (CW - w) // 2
    # мягкая тень по бокам фото
    sh = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(sh).rectangle([x0 - 6, -50, x0 + w + 6, CH + 50], fill=190)
    sh = sh.filter(ImageFilter.GaussianBlur(CH // 45))
    canvas.paste(Image.new("RGB", canvas.size, (0, 0, 0)), (0, 0), sh)
    canvas.paste(ph, (x0, 0))
    focus = (x0 + fx * w, fy * h - oy)
    return grade(canvas), focus


def title_layer(W, H):
    """RGBA-слой с именами: «Нұрбек & Айжан» + золотые линии."""
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    size = int(H * 0.12)
    font = font_amp = ImageFont.truetype(FONT, size)
    text = "Нұрбек & Айжан"
    bb = d.textbbox((0, 0), text, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    tx, ty = (W - tw) // 2 - bb[0], (H - th) // 2 - bb[1] - int(H * 0.01)
    # мягкое свечение
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).text((tx, ty), text, font=font, fill=GOLD + (150,))
    glow = glow.filter(ImageFilter.GaussianBlur(H // 90))
    lay = Image.alpha_composite(lay, glow)
    d = ImageDraw.Draw(lay)
    d.text((tx, ty), text, font=font, fill=GOLD + (255,))
    # орнамент: линии с ромбом сверху и снизу
    cx = W // 2
    lw = int(W * 0.14)
    lt = max(2, H // 540)
    for yy in ((H - th) // 2 - int(H * 0.075), (H + th) // 2 + int(H * 0.06)):
        r = int(H * 0.008)
        d.rectangle([cx - lw - r * 3, yy - lt // 2, cx - r * 3, yy + lt // 2], fill=GOLD + (220,))
        d.rectangle([cx + r * 3, yy - lt // 2, cx + lw + r * 3, yy + lt // 2], fill=GOLD + (220,))
        d.polygon([(cx, yy - r), (cx + r, yy), (cx, yy + r), (cx - r, yy)], fill=GOLD + (255,))
    return lay


def vignette(W, H):
    y, x = np.ogrid[-1:1:H * 1j, -1:1:W * 1j]
    r = np.sqrt(x ** 2 + (y * 0.9) ** 2)
    v = 1 - 0.32 * np.clip((r - 0.55) / 0.9, 0, 1) ** 1.6
    return v[..., None].astype(np.float32)


# ---------------- таймлайн ----------------

def build_timeline(beats):
    slides, act_start = [], []
    for ai, act in enumerate(ACTS):
        for si, s in enumerate(act):
            slides.append(s)
            act_start.append(si == 0 and ai > 0)
    wts = []
    for s in slides:
        w = 1.12 if (USE_PULL and s[4]) else 1.0          # отъезду чуть больше времени
        if s[0] == 16:
            w = 2.2                         # силуэт — кульминация
        wts.append(w)
    wts = np.array(wts)
    edges = INTRO_CUT + np.concatenate([[0], np.cumsum(wts)]) / wts.sum() * (OUTRO_CUT - INTRO_CUT)
    # привязка внутренних склеек к ближайшей доле
    cuts = [INTRO_CUT]
    for e in edges[1:-1]:
        cuts.append(float(beats[np.argmin(np.abs(beats - e))]))
    cuts.append(OUTRO_CUT)
    xfs = [XF_ACT] + [XF_ACT if a else XF for a in act_start[1:]] + [XF_ACT * 1.5]
    return slides, cuts, xfs


class Renderer:
    def __init__(self, W, H, beats, total):
        self.W, self.H, self.total = W, H, total
        self.CW, self.CH = int(W * 1.2), int(H * 1.2)
        self.slides, self.cuts, self.xfs = build_timeline(beats)
        self.cache = {}
        self.vig = vignette(W, H)
        self.title = title_layer(W, H)
        # сегменты: 0 = интро-фон, 1..N = слайды, N+1 = финальный фон
        self.segs = []
        n = len(self.slides)
        self.segs.append(("intro", -1, 0.0, self.cuts[0]))
        for i in range(n):
            self.segs.append(("slide", i, self.cuts[i], self.cuts[i + 1]))
        self.segs.append(("outro", n, self.cuts[-1], total))

    def canvas(self, key):
        if key not in self.cache:
            if len(self.cache) > 4:
                self.cache.pop(next(iter(self.cache)))
            kind, i = key
            mid = (self.CW / 2, self.CH / 2)
            if kind == "slide":
                self.cache[key] = compose(self.slides[i], self.CW, self.CH)
            elif kind == "intro":
                self.cache[key] = (grade(blurred_bg(load(2), self.CW, self.CH, dark=0.33)), mid)
            else:
                self.cache[key] = (grade(blurred_bg(load(16), self.CW, self.CH, dark=0.30)), mid)
        return self.cache[key]

    def seg_frame(self, si, t):
        kind, i, a, b = self.segs[si]
        xa = self.xfs[si - 1] / 2 if si > 0 else 0
        xb = self.xfs[si] / 2 if si < len(self.xfs) else 0
        a0, b0 = a - xa, b + xb
        p = np.clip((t - a0) / max(b0 - a0, 1e-6), 0, 1)
        CW, CH = self.CW, self.CH
        canvas, (fx, fy) = self.canvas((kind, i))
        pull = USE_PULL and kind == "slide" and self.slides[i][4]
        if pull:
            # отъезд с лиц: быстрый старт, мягкое замедление
            e = 1 - (1 - p) ** 2.2
            z = 1.0 + (PULL_ZOOM - 1.0) * (1 - e)
        elif kind == "slide":
            # обычный: чётные — наезд, нечётные — отъезд
            z = 1.0 + KB_ZOOM * (p if si % 2 == 0 else 1 - p)
        else:
            z = 1.0 + 0.05 * p
        # центр окна тянется к лицам по мере приближения
        k = min(1.0, (z - 1.0) / 0.35)
        vw, vh = CW / z, CH / z
        cx = CW / 2 + (fx - CW / 2) * k
        cy = CH / 2 + (fy - CH / 2) * k
        cx = float(np.clip(cx, vw / 2, CW - vw / 2))
        cy = float(np.clip(cy, vh / 2, CH - vh / 2))
        sx = vw / self.W
        img = canvas.transform(
            (self.W, self.H), Image.AFFINE,
            (sx, 0, cx - vw / 2, 0, vh / self.H, cy - vh / 2), resample=Image.BICUBIC)
        return np.asarray(img).astype(np.float32)

    def frame(self, t):
        # активные сегменты
        out = None
        for si, (kind, i, a, b) in enumerate(self.segs):
            xa = self.xfs[si - 1] / 2 if si > 0 else 0
            if si < len(self.xfs):
                xb = self.xfs[si] / 2
            else:
                xb = 0
            if t < a - xa or t > b + xb:
                continue
            f = self.seg_frame(si, t)
            # вес: нарастает в начале сегмента (crossfade с предыдущим)
            if si > 0 and t < a + xa:
                w = (t - (a - xa)) / (2 * xa)
                w = w * w * (3 - 2 * w)
                out = f if out is None else out * (1 - w) + f * w
            else:
                out = f if out is None else out
        out = out * self.vig
        # титры
        alpha = 0.0
        if t < self.cuts[0] + self.xfs[0] / 2:
            alpha = np.clip((t - 1.2) / 2.0, 0, 1) * np.clip((self.cuts[0] - 0.7 - t) / 1.2, 0, 1)
        elif t > self.cuts[-1]:
            alpha = np.clip((t - self.cuts[-1] - 1.0) / 2.0, 0, 1)
        if alpha > 0:
            lay = np.asarray(self.title).astype(np.float32)
            a = lay[..., 3:4] / 255 * alpha
            out = out * (1 - a) + lay[..., :3] * a
        # общий fade из чёрного / в чёрный
        fade = min(1.0, t / 1.0, max(0.0, (self.total - t) / 2.5))
        out = out * fade
        return np.clip(out, 0, 255).astype(np.uint8)


_R = None


def _init(W, H, beats, total):
    global _R
    _R = Renderer(W, H, beats, total)


def _render(fi):
    return _R.frame(fi / FPS).tobytes()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", required=True)
    ap.add_argument("--beats", required=True)
    ap.add_argument("--w", type=int, default=1920)
    ap.add_argument("--h", type=int, default=1080)
    ap.add_argument("--out", default=None)
    ap.add_argument("--preview", default=None, help="таймкоды через запятую — сохранить кадры JPG")
    ap.add_argument("--timeline", action="store_true")
    args = ap.parse_args()
    beats = np.load(args.beats)
    dur = float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", args.audio]))
    total = round(dur, 1)

    if args.timeline:
        slides, cuts, xfs = build_timeline(beats)
        print(f"00:00.0  intro  (титр)")
        for s, c in zip(slides, cuts):
            print(f"{int(c // 60):02d}:{c % 60:04.1f}  {s}")
        print(f"{int(cuts[-1] // 60):02d}:{cuts[-1] % 60:04.1f}  outro (титр)  -> {total}s")
        return

    if args.preview:
        r = Renderer(args.w, args.h, beats, total)
        os.makedirs("preview", exist_ok=True)
        for t in args.preview.split(","):
            Image.fromarray(r.frame(float(t))).save(f"preview/t{float(t):06.1f}.jpg", quality=90)
        return

    out = args.out or os.path.join(HERE, f"slideshow-{args.w}x{args.h}.mp4")
    nframes = int(total * FPS)
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-v", "error", "-stats",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{args.w}x{args.h}", "-r", str(FPS), "-i", "-",
        "-i", args.audio,
        "-map", "0:v", "-map", "1:a",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
        "-profile:v", "high", "-level", "4.2",
        "-af", f"afade=t=out:st={total - 4}:d=4",
        "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    # каждый воркер рендерит непрерывный кусок — кэш композиций работает эффективно
    with Pool(os.cpu_count(), initializer=_init, initargs=(args.w, args.h, beats, total)) as pool:
        for buf in pool.imap(_render, range(nframes), chunksize=25):
            ff.stdin.write(buf)
    ff.stdin.close()
    ff.wait()
    print("OK", out)


if __name__ == "__main__":
    main()
