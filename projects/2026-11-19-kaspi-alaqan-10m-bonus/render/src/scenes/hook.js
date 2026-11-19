// Сцена 1 [0:00–0:04] — Хук: счётчик до 10 000 000, сканер ладони, слэм заголовка.
import { COLORS, FONT } from '../../config/video.config.js';
import { text, scanner, withTransform, rrect, font } from '../lib/draw.js';
import { prog, ease, fmt, lerp } from '../lib/easing.js';

export function drawHook(ctx, t, sc) {
  const A = sc.anim, dur = sc.end - sc.start;
  const exit = ease.inCubic(prog(t, dur - 0.28, dur));

  withTransform(ctx, { x: 540, y: 900, alpha: 1 - exit, dy: -exit * 140 }, () => {
    // сканер: резкий вход scale 0 → 1 (back)
    const sIn = ease.outBack(prog(t, 0.0, 0.38), 2.2);
    withTransform(ctx, { x: 540, y: 560, scale: sIn, alpha: prog(t, 0, 0.12) }, () => {
      scanner(ctx, 540, 560, A.scanner.size, t, { period: A.scanner.scanPeriod });
    });

    // счётчик 0 → 10 000 000
    const c = A.counter;
    const k = ease[c.easing](prog(t, c.t0, c.t1));
    const val = lerp(c.from, c.to, k);
    const done = t >= c.t1;
    const pop = done ? 1 + 0.12 * (1 - ease.outCubic(prog(t, c.t1, c.t1 + 0.35))) : 1;
    withTransform(ctx, { x: 540, y: 900, scale: pop, alpha: prog(t, c.t0 - 0.05, c.t0 + 0.1) }, () => {
      ctx.save();
      ctx.shadowColor = done ? 'rgba(255,200,61,0.75)' : 'rgba(255,200,61,0.3)';
      ctx.shadowBlur = done ? 60 : 24;
      text(ctx, fmt(val), 540, 900, { size: 168, weight: FONT.black, color: COLORS.gold, maxW: 900 });
      ctx.restore();
    });

    // «БОНУСОВ» — слэм
    const s2 = prog(t, A.slam.line2At, A.slam.line2At + 0.18);
    if (s2 > 0) withTransform(ctx, { x: 540, y: 1052, scale: lerp(A.slam.overshoot + 0.5, 1, ease.outBack(s2)), alpha: Math.min(1, s2 * 3) }, () => {
      text(ctx, sc.onScreen.line2, 540, 1052, { size: 118, weight: FONT.black, color: COLORS.white, letter: 4 });
    });

    // «ЗА ЛАДОНЬ» — красная плашка
    const s3 = prog(t, A.slam.line3At, A.slam.line3At + 0.18);
    if (s3 > 0) withTransform(ctx, { x: 540, y: 1192, scale: lerp(A.slam.overshoot + 0.5, 1, ease.outBack(s3)), alpha: Math.min(1, s3 * 3), rot: -0.03 }, () => {
      ctx.font = font(104, FONT.black);
      const w = ctx.measureText(sc.onScreen.line3).width + 70;
      rrect(ctx, 540 - w / 2, 1192 - 74, w, 148, 22);
      ctx.fillStyle = COLORS.red; ctx.fill();
      text(ctx, sc.onScreen.line3, 540, 1196, { size: 104, weight: FONT.black, color: COLORS.white });
    });
  });

  // белая вспышка на самом входе
  if (t < A.flashIn) {
    ctx.fillStyle = `rgba(255,255,255,${1 - t / A.flashIn})`;
    ctx.fillRect(0, 0, 1080, 1920);
  }
}

/** Камера сцены: punch-in на входе + тряска на ударе счётчика */
export function hookCamera(t, sc) {
  const zoom = lerp(1.18, 1, ease.outExpo(prog(t, 0, 0.45)));
  return { zoom, shakeAt: sc.anim.shakeAt, shakeAmp: sc.anim.shakeAmp };
}
