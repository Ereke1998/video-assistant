export const W = 1080;
export const H = 1920;

export const FONT_DISPLAY = "'Unbounded', 'Montserrat', sans-serif";
export const FONT_BODY = "'Montserrat', 'Unbounded', sans-serif";

export type ActTheme = {a: string; b: string; skyTop: string; skyBottom: string; sun: [string, string]};

export const ACT_THEME: Record<number, ActTheme> = {
  1: {a: '#ff2d55', b: '#ffb340', skyTop: '#0b0208', skyBottom: '#4a0a24', sun: ['#ffcc4d', '#ff2d6f']},
  2: {a: '#2bff88', b: '#ffd60a', skyTop: '#020c08', skyBottom: '#0f3d2a', sun: ['#fff27a', '#2bd17a']},
  3: {a: '#19e6ff', b: '#8a6cff', skyTop: '#020814', skyBottom: '#0c2a52', sun: ['#9ff6ff', '#6a5cff']},
  4: {a: '#ff2bd6', b: '#ffd60a', skyTop: '#0b0212', skyBottom: '#46094f', sun: ['#ffd36b', '#ff2bd6']},
};

export const C = {
  white: '#ffffff',
  ink: '#07030f',
  red: '#ff3b4e',
  green: '#2bff88',
  dim: 'rgba(255,255,255,0.55)',
};

/** Безопасная зона 9:16: верх ~10%, низ ~20% */
export const SAFE = {top: 200, bottom: H - 384, captionY: 1300};

export const glow = (color: string, k = 1) =>
  `0 0 ${8 * k}px ${color}, 0 0 ${22 * k}px ${color}, 0 0 ${48 * k}px ${color}`;
