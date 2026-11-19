// Чистые функции времени/интерполяции. Всё детерминировано: кадр = f(t).

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
/** Прогресс 0..1 на отрезке [t0, t1] */
export const prog = (t, t0, t1) => clamp((t - t0) / (t1 - t0));

export const ease = {
  linear: (x) => x,
  outCubic: (x) => 1 - (1 - x) ** 3,
  inCubic: (x) => x ** 3,
  inOutCubic: (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  outExpo: (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  outQuart: (x) => 1 - (1 - x) ** 4,
  outBack: (x, s = 1.70158) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2,
  outElastic: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

/** Вход/выход элемента: 0 → 1 за `inDur` после t0, 1 → 0 за `outDur` до t1 */
export function inOut(t, t0, t1, inDur = 0.3, outDur = 0.3) {
  return Math.min(ease.outCubic(prog(t, t0, t0 + inDur)), 1 - ease.inCubic(prog(t, t1 - outDur, t1)));
}

/** Затухающая тряска камеры */
export function shake(t, at, amp, dur = 0.3, seed = 1) {
  const k = prog(t, at, at + dur);
  if (k <= 0 || k >= 1) return [0, 0];
  const d = (1 - k) ** 2 * amp;
  return [Math.sin(t * 91 + seed) * d, Math.cos(t * 73 + seed * 2) * d];
}

/** Детерминированный ГПСЧ (mulberry32) — для частиц/конфетти */
export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 10000000 → «10 000 000» */
export const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
