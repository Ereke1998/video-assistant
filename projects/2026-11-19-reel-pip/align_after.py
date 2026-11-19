#!/usr/bin/env python3
"""Выравнивание картинок «ПОСЛЕ» по кадрам исходника.

Для каждой картинки: обрезка чёрных полей → поиск момента в исходнике (окно ±1 с вокруг подсказки)
→ подбор масштаба и сдвига по совпадению контуров (градиенты) → картинка 1080×1920, закрывающая весь кадр.

    python3 -I align_after.py SRC OUT_DIR img:t_hint [img:t_hint ...]
Пишет OUT_DIR/after_<N>.png и OUT_DIR/align.json (t — точный момент совпадения, для shots.conf).
"""
import json, subprocess, sys
import numpy as np, cv2

SW, SH = 288, 512          # поиск
OW, OH = 1080, 1920        # выход


def frames(src, t0, t1, w, h, fmt='gray'):
    r = subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-ss', str(max(t0, 0)), '-t', str(t1 - t0), '-i', src,
                        '-vf', f'fps=30,scale={w}:{h},format={fmt}', '-f', 'rawvideo', '-'], capture_output=True).stdout
    c = 1 if fmt == 'gray' else 3
    return np.frombuffer(r, np.uint8).reshape(-1, h, w, c).squeeze().astype(np.float32)


def feat(g):
    g = cv2.GaussianBlur(g, (0, 0), 2)
    gx, gy = cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1)
    return np.sqrt(gx * gx + gy * gy)


def ncc(a, b, m):
    a, b = a[m], b[m]
    a = (a - a.mean()) / (a.std() + 1e-6); b = (b - b.mean()) / (b.std() + 1e-6)
    return float((a * b).mean())


def place(img, W, H, s, dx, dy):
    """картинка шириной s*W, центр + сдвиг (доли кадра); возвращает холст, маску покрытия, x0, y0, sw, sh"""
    h, w = img.shape[:2]
    sw = int(round(W * s)); sh = int(round(h * sw / w))
    x0 = (W - sw) // 2 + int(round(dx * W)); y0 = (H - sh) // 2 + int(round(dy * H))
    return sw, sh, x0, y0


def cover(img, W, H, s, dx, dy):
    """минимально увеличить масштаб и сдвинуть так, чтобы картинка закрывала кадр целиком"""
    h, w = img.shape[:2]
    s = max(s, 1.0, (H / W) * (w / h))
    sw, sh, x0, y0 = place(img, W, H, s, dx, dy)
    x0 = min(0, max(W - sw, x0)); y0 = min(0, max(H - sh, y0))
    return s, (x0 - (W - sw) // 2) / W, (y0 - (H - sh) // 2) / H


def main():
    src, out = sys.argv[1], sys.argv[2]
    res = {}
    for n, arg in enumerate(sys.argv[3:], 1):
        path, th = arg.rsplit(':', 1); th = float(th)
        im = cv2.imread(path); g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
        rows = np.where(g.mean(1) > 12)[0]; im = im[rows[0]:rows[-1] + 1]          # чёрные поля сверху/снизу
        gi = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
        F = [feat(f) for f in frames(src, th - 1, th + 1, SW, SH)]
        mid = F[len(F) // 2]; best = (-2,)
        for s in np.arange(0.80, 1.26, 0.025):
            sw = int(SW * s); sh = int(gi.shape[0] * sw / gi.shape[1]); fi = feat(cv2.resize(gi, (sw, sh)))
            for dx in range(-int(.15 * SW), int(.15 * SW) + 1, 4):
                for dy in range(-int(.2 * SH), int(.2 * SH) + 1, 4):
                    x0 = (SW - sw) // 2 + dx; y0 = (SH - sh) // 2 + dy
                    xa, ya, xb, yb = max(0, x0), max(0, y0), min(SW, x0 + sw), min(SH, y0 + sh)
                    if xb - xa < SW * .6 or yb - ya < SH * .6: continue
                    can = np.zeros((SH, SW), np.float32); m = np.zeros((SH, SW), bool)
                    can[ya:yb, xa:xb] = fi[ya - y0:yb - y0, xa - x0:xb - x0]; m[ya:yb, xa:xb] = True
                    sc = ncc(can, mid, m)
                    if sc > best[0]: best = (sc, s, dx / SW, dy / SH, can, m)
        sc, s, dx, dy, can, m = best
        k = max(range(len(F)), key=lambda i: ncc(can, F[i], m))
        t = round(th - 1 + k / 30, 3)
        s2, dx2, dy2 = cover(im, OW, OH, s, dx, dy)
        sw, sh, x0, y0 = place(im, OW, OH, s2, dx2, dy2)
        big = cv2.resize(im, (sw, sh), interpolation=cv2.INTER_LANCZOS4)
        cv2.imwrite(f'{out}/after_{n}.png', big[-y0:-y0 + OH, -x0:-x0 + OW])
        res[n] = dict(image=path, t=t, score=round(ncc(can, F[k], m), 3), scale_fit=round(float(s), 3),
                      scale_cover=round(float(s2), 3), dx=round(dx2, 4), dy=round(dy2, 4))
        print(n, res[n], flush=True)
    json.dump(res, open(f'{out}/align.json', 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
