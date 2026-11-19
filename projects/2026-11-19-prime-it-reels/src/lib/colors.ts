// Палитра v3: тёмный неон. Проблема — оранжевый/красный, решение и бренд — синий/голубой.
export const COLORS = {
  bg: '#0B0B10',
  heat: '#FF6A00',
  red: '#FF2D3A',
  cool: '#2F6BFF',
  cyan: '#3DD8FF',
  accent: '#FFB800',
  white: '#FFFFFF',
  dust: '#8E8A86',
};

/** Цвет лучей/акцентов по сценам. */
export const SCENE_COLOR = {
  hook: '#FF4A1A',
  dust: COLORS.heat,
  thermal: COLORS.red,
  solution: COLORS.cool,
  brand: COLORS.cool,
} as const;
