// Математика анимаций, привязанных к кадрам (без времени браузера).
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const easeInExpo = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * clamp(t) - 10));
export const range = (x: number, a: number, b: number) => clamp((x - a) / (b - a));
export const lerp3 = (a: number[], b: number[], t: number): [number, number, number] => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

/** Детерминированный ГПСЧ (mulberry32). */
export const rand = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Гладкий 1D-шум из суммы синусов — для тряски камеры. */
export const shakeNoise = (t: number, seed: number) =>
  (Math.sin(t * 13.1 + seed * 1.7) * 0.5 + Math.sin(t * 27.3 + seed * 3.1) * 0.3 + Math.sin(t * 51.7 + seed * 5.3) * 0.2);

/** Мультисегментная интерполяция по ключам (линейно, с clamp). */
export const keys = (x: number, xs: number[], ys: number[], ease: (t: number) => number = (t) => t) => {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) return lerp(ys[i - 1], ys[i], ease((x - xs[i - 1]) / (xs[i] - xs[i - 1])));
  }
  return ys[ys.length - 1];
};

export const dbToGain = (db: number) => Math.pow(10, db / 20);

export type CamKey = {f: number; pos: number[]; target: number[]; fov?: number};
/** Камера по ключевым кадрам с easeInOut между ключами. */
export const camPath = (f: number, ks: CamKey[], ease: (t: number) => number = easeInOut) => {
  let a = ks[0];
  let b = ks[ks.length - 1];
  if (f <= a.f) b = a;
  else if (f >= b.f) a = b;
  else {
    for (let i = 1; i < ks.length; i++) {
      if (f <= ks[i].f) {
        a = ks[i - 1];
        b = ks[i];
        break;
      }
    }
  }
  const t = a === b ? 0 : ease((f - a.f) / (b.f - a.f));
  return {
    pos: lerp3(a.pos, b.pos, t),
    target: lerp3(a.target, b.target, t),
    fov: lerp(a.fov ?? 40, b.fov ?? 40, t),
  };
};
