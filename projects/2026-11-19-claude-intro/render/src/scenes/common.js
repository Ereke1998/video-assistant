// Общие элементы сцен: заголовок-слэм, цветная плашка, уход сцены вверх.
import { COLORS, FONT } from '../../config/video.config.js';
import { text, withTransform, rrect, font } from '../lib/draw.js';
import { prog, ease, lerp } from '../lib/easing.js';

/** Слэм: scale overshoot → 1 за 0.18 с */
export function slam(ctx, t, at, x, y, fn, { over = 1.6, rot = 0 } = {}) {
  const k = prog(t, at, at + 0.18);
  if (k <= 0) return;
  withTransform(ctx, { x, y, scale: lerp(over, 1, ease.outBack(k)), alpha: Math.min(1, k * 3), rot }, fn);
}

/** Плашка с текстом (акцентная), центр (x, y) */
export function plate(ctx, str, x, y, { size = 96, bg = COLORS.red, fg = COLORS.white, padX = 36, h = null, maxW = 940 } = {}) {
  ctx.font = font(size, FONT.black);
  let s = size, w = ctx.measureText(str).width;
  if (w + padX * 2 > maxW) { s = Math.floor(size * (maxW - padX * 2) / w); ctx.font = font(s, FONT.black); w = ctx.measureText(str).width; }
  const H = h || s * 1.42;
  rrect(ctx, x - w / 2 - padX, y - H / 2, w + padX * 2, H, 22);
  ctx.fillStyle = bg; ctx.fill();
  text(ctx, str, x, y + s * 0.04, { size: s, weight: FONT.black, color: fg, maxW: 2000 });
}

/** Вход сцены снизу + уход вверх (как в прошлом ролике) */
export function sceneMotion(t, dur, { inDur = 0.3, outDur = 0.28 } = {}) {
  const enter = ease.outCubic(prog(t, 0, inDur));
  const exit = ease.inCubic(prog(t, dur - outDur, dur));
  return { alpha: enter * (1 - exit), dy: (1 - enter) * 120 - exit * 140 };
}
