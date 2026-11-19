#!/usr/bin/env python3
"""Анимированное «ПОСЛЕ»: интерьер-картинка живёт дальше вместе с исходным видео.

Для плана с картинкой after_N.png (выровнена по кадру исходника в момент t, см. align.json):
  1. камера: гомография кадр(t) → кадр(t+Δ) по ORB-точкам фона (героиня и водяной знак исключены);
     картинка интерьера деформируется той же гомографией — комната «едет» вместе с камерой;
  2. героиня: HOG-детектор → трекер CSRT → GrabCut по каждому кадру; её живые пиксели из исходника
     (с тёплой подгонкой цвета) кладутся поверх интерьера — она продолжает двигаться;
  3. неподвижная копия героини на картинке стирается (маска героини в момент t, расширенная → inpaint).

    python3 -I animate_after.py SRC AFTER_DIR DUR N [N ...]
Пишет AFTER_DIR/anim_N.mp4 (1080×1920, 30 fps, длительность DUR с, начинается в момент t) и anim_N_mask.mp4 (контроль).
"""
import json, subprocess, sys
import numpy as np, cv2

OW, OH, WW, WH, FPS = 1080, 1920, 540, 960, 30
SC = OW / WW


def read(src, t, dur, w, h):
    r = subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-ss', str(t), '-t', str(dur), '-i', src,
                        '-vf', f'fps={FPS},scale={w}:{h}:flags=lanczos', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'],
                       capture_output=True).stdout
    return np.frombuffer(r, np.uint8).reshape(-1, h, w, 3)


def writer(path):
    return subprocess.Popen(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24',
                             '-s', f'{OW}x{OH}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '14',
                             '-pix_fmt', 'yuv420p', path], stdin=subprocess.PIPE)


EXPAND = {'1': .45}            # план с раскинутыми руками — шире рамка
FLOOR_CUT = {'4'}              # планы, где маска цепляет светлый бетонный пол у ног


def person_box(f, ex_k=.12):
    hog = cv2.HOGDescriptor(); hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
    rects, w = hog.detectMultiScale(f, winStride=(4, 4), padding=(8, 8), scale=1.03)
    x, y, w_, h_ = rects[int(np.argmax(np.ravel(w)))]
    # HOG-рамка с запасом: руки в стороны, ступни, волосы
    ex, ey = int(w_ * ex_k), int(h_ * .06)
    return [max(0, x - ex), max(0, y - ey), min(WW, x + w_ + ex) - max(0, x - ex), min(WH, y + h_ + ey) - max(0, y - ey)]


def grabcut(f, box, prev=None, models=None, floor_cut=False):
    x, y, w, h = box
    m = np.full((WH, WW), cv2.GC_BGD, np.uint8)
    m[y:y + h, x:x + w] = cv2.GC_PR_BGD
    if prev is None:
        cx0, cx1 = x + int(w * .38), x + int(w * .62); cy0, cy1 = y + int(h * .15), y + int(h * .85)
        m[cy0:cy1, cx0:cx1] = cv2.GC_PR_FGD
    else:
        sub = np.zeros_like(prev); sub[y:y + h, x:x + w] = prev[y:y + h, x:x + w]
        m[cv2.dilate(sub, np.ones((9, 9), np.uint8)) > 0] = cv2.GC_PR_FGD
        m[(cv2.erode(sub, np.ones((7, 7), np.uint8)) > 0)] = cv2.GC_FGD
    if models is None:                                         # первый кадр: учим цвет героини и фона
        bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
        cv2.grabCut(f, m, None, bg, fg, 5, cv2.GC_INIT_WITH_MASK)
        models = (bg, fg)
    else:                                                      # дальше модели заморожены — маска не «уплывает» в окно/пол
        bg, fg = models[0].copy(), models[1].copy()
        cv2.grabCut(f, m, None, bg, fg, 1, cv2.GC_INIT_WITH_MASK)
        cv2.grabCut(f, m, None, models[0].copy(), models[1].copy(), 3, cv2.GC_EVAL_FREEZE_MODEL)
    out = np.where((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD), 1, 0).astype(np.uint8)
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
    out[(hsv[..., 2] > 242) & (hsv[..., 1] < 30)] = 0          # пересвеченное окно ≠ рубашка
    if floor_cut:                                              # светлый бетонный пол у ног (эркер) ≠ героиня
        out[(hsv[..., 1] < 25) & (hsv[..., 2] > 150) & (hsv[..., 2] < 215)] = 0
    # самая крупная связная область + закрытие дыр
    n, lab, st, _ = cv2.connectedComponentsWithStats(out)
    if n > 1: out = (lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    if prev is not None:                                       # за кадр человек сдвигается мало
        out &= cv2.dilate(prev, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17)))
    return cv2.morphologyEx(out, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)), models


def bg_mask(box):
    m = np.full((WH, WW), 255, np.uint8)
    x, y, w, h = box; m[max(0, y - 20):y + h + 20, max(0, x - 20):x + w + 20] = 0
    m[int(WH * .62):int(WH * .80), int(WW * .70):] = 0          # водяной знак TikTok
    return m


def main():
    src, adir, dur = sys.argv[1], sys.argv[2], float(sys.argv[3])
    A = json.load(open(f'{adir}/align.json'))
    orb = cv2.ORB_create(3000); bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    S = np.diag([SC, SC, 1.0]); Si = np.linalg.inv(S)
    for n in sys.argv[4:]:
        t = A[n]['t']
        small = read(src, t, dur, WW, WH); big = read(src, t, dur, OW, OH); N = min(len(small), len(big))
        after = cv2.imread(f'{adir}/after_{n}.png')
        exk = EXPAND.get(n, .12)
        box = person_box(small[0], exk); tr = cv2.TrackerCSRT_create(); tr.init(small[0], tuple(box))
        g0 = cv2.cvtColor(small[0], cv2.COLOR_BGR2GRAY)
        masks, Hs, prev, models = [], [], None, None; box0 = list(box)
        for i in range(N):
            f = small[i]
            if i: ok, b = tr.update(f); box = [int(v) for v in b] if ok else box
            x, y, w, h = box; box = [max(0, x), max(0, y), min(WW - max(0, x), w), min(WH - max(0, y), h)]
            cur, models = grabcut(f, box, prev, models, n in FLOOR_CUT)
            if prev is not None and (cur.sum() > 1.6 * max(prev.sum(), 1) or cur.sum() < .5 * prev.sum()):
                cur = prev                                        # GrabCut «утёк» — держим прошлую маску
            prev = cur; masks.append(prev)
            if i == 0: Hs.append(np.eye(3)); continue
            k0, d0 = orb.detectAndCompute(g0, bg_mask(box0))
            k1, d1 = orb.detectAndCompute(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), bg_mask(box))
            H = None
            if d0 is not None and d1 is not None:
                mt = sorted(bf.match(d0, d1), key=lambda m: m.distance)[:600]
                if len(mt) >= 12:
                    p0 = np.float32([k0[m.queryIdx].pt for m in mt]); p1 = np.float32([k1[m.trainIdx].pt for m in mt])
                    H, inl = cv2.findHomography(p0, p1, cv2.RANSAC, 3.0)
                    if H is not None and inl.sum() < 25: H = None
            Hs.append(H if H is not None else Hs[-1])
        # сглаживание траектории (скользящее среднее по 5 кадрам) — меньше дрожи
        Hs = np.array(Hs); Hsm = np.array([Hs[max(0, i - 2):i + 3].mean(0) for i in range(N)])
        # стираем неподвижную копию героини с картинки интерьера
        m0 = cv2.resize(masks[0], (OW, OH), interpolation=cv2.INTER_NEAREST)
        hole = cv2.dilate(m0, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
        clean = cv2.inpaint(after, hole * 255, 9, cv2.INPAINT_TELEA)
        out, chk = writer(f'{adir}/anim_{n}.mp4'), writer(f'{adir}/anim_{n}_mask.mp4')
        for i in range(N):
            Hb = S @ Hsm[i] @ Si
            a = cv2.warpPerspective(clean, Hb, (OW, OH), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
            m = cv2.resize(masks[i].astype(np.float32), (OW, OH), interpolation=cv2.INTER_LINEAR)
            m = cv2.GaussianBlur(m, (0, 0), 2.2)[..., None]
            p = big[i].astype(np.float32); p = p * np.array([0.93, 1.0, 1.07]) * 1.04          # тёплая подгонка героини
            o = a.astype(np.float32) * (1 - m) + p * m
            out.stdin.write(np.clip(o, 0, 255).astype(np.uint8).tobytes())
            c = big[i].copy(); c[m[..., 0] > .5] = (0, 0, 255); chk.stdin.write(c.tobytes())
        for w in (out, chk): w.stdin.close(); w.wait()
        # доля кадра, не покрытая картинкой (уходит в общий наезд build_video.sh)
        cov = min(cv2.warpPerspective(np.ones((OH // 4, OW // 4), np.uint8), np.diag([1, 1, 1.0]) @ np.diag([.25, .25, 1]) @ (S @ Hsm[i] @ Si) @ np.diag([4, 4, 1.0]), (OW // 4, OH // 4)).mean() for i in range(N))
        sh = np.abs(Hsm[-1] - np.eye(3))[:2, 2]
        print(f'anim_{n}: {N} кадров, сдвиг камеры к концу ≈ {sh[0]:.0f},{sh[1]:.0f} px (540p), '
              f'площадь героини {masks[0].mean() * 100:.1f}% кадра, покрытие картинкой ≥ {cov * 100:.0f}%', flush=True)


if __name__ == '__main__':
    main()
