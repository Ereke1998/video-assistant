// Примитивы отрисовки: текст, плашки, карточки, векторные иконки.
import { COLORS, FONT } from '../../config/video.config.js';

export const font = (size, weight = FONT.bold) => `${weight} ${size}px ${FONT.family}`;

/** Текст по центру; если не влезает в maxW — уменьшается. Возвращает итоговый размер. */
export function text(ctx, str, x, y, { size = 64, weight = FONT.bold, color = COLORS.white, maxW = 900, align = 'center', shadow = 0, letter = 0 } = {}) {
  let s = size;
  ctx.font = font(s, weight);
  if (letter) ctx.letterSpacing = `${letter}px`;
  const w = ctx.measureText(str).width;
  if (w > maxW) { s = Math.floor(size * (maxW / w)); ctx.font = font(s, weight); }
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (shadow) { ctx.shadowColor = typeof shadow === 'string' ? shadow : 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 24; }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  if (letter) ctx.letterSpacing = '0px';
  return s;
}

export function measure(ctx, str, size, weight = FONT.bold) {
  ctx.font = font(size, weight);
  return ctx.measureText(str).width;
}

export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Плашка-пилюля с текстом, центр (cx, cy) */
export function pill(ctx, str, cx, cy, { size = 44, weight = FONT.bold, fg = COLORS.white, bg = COLORS.red, stroke = null, padX = 34, padY = 18, maxW = 880 } = {}) {
  let s = size;
  let w = measure(ctx, str, s, weight);
  if (w + padX * 2 > maxW) { s = Math.floor(s * (maxW - padX * 2) / w); w = measure(ctx, str, s, weight); }
  const W = w + padX * 2, H = s + padY * 2;
  rrect(ctx, cx - W / 2, cy - H / 2, W, H, H / 2);
  if (bg) { ctx.fillStyle = bg; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
  text(ctx, str, cx, cy + s * 0.04, { size: s, weight, color: fg, maxW: 2000 });
  return { w: W, h: H };
}

/** Карточка-«стекло» */
export function card(ctx, x, y, w, h, { r = 32, fill = COLORS.card, stroke = COLORS.cardStroke, glow = null } = {}) {
  ctx.save();
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 60; }
  rrect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill; ctx.fill();
  ctx.shadowBlur = 0;
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.restore();
}

/** Трансформация вокруг точки: масштаб/поворот/прозрачность */
export function withTransform(ctx, { x = 0, y = 0, scale = 1, rot = 0, alpha = 1, dx = 0, dy = 0 }, fn) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x + dx, y + dy);
  if (rot) ctx.rotate(rot);
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.translate(-x, -y);
  fn();
  ctx.restore();
}

// ───────────── Иконки (векторные, без внешних ассетов) ─────────────

/** Ладонь. (cx, cy) — центр, s — высота */
export function palm(ctx, cx, cy, s, color = COLORS.white) {
  ctx.save();
  ctx.fillStyle = color;
  const fw = s * 0.13;
  const fingers = [[-0.225, 0.38], [-0.075, 0.46], [0.075, 0.44], [0.225, 0.34]];
  fingers.forEach(([fx, fh]) => {
    rrect(ctx, cx + fx * s - fw / 2, cy - 0.06 * s - fh * s, fw, fh * s + 0.1 * s, fw / 2);
    ctx.fill();
  });
  rrect(ctx, cx - 0.3 * s, cy - 0.1 * s, 0.6 * s, 0.5 * s, 0.17 * s); ctx.fill();
  ctx.save();
  ctx.translate(cx - 0.27 * s, cy + 0.12 * s); ctx.rotate(-0.75);
  rrect(ctx, -fw / 2, -0.32 * s, fw * 1.05, 0.38 * s, fw / 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** Рамка сканера + ладонь + бегущая линия скана */
export function scanner(ctx, cx, cy, size, t, { period = 0.9, active = 1, color = COLORS.red } = {}) {
  const h = size / 2;
  ctx.save();
  card(ctx, cx - h, cy - h, size, size, { r: size * 0.2, fill: 'rgba(241,70,53,0.10)', stroke: 'rgba(241,70,53,0.55)', glow: active ? 'rgba(241,70,53,0.55)' : null });
  // уголки-скобки
  ctx.strokeStyle = color; ctx.lineWidth = size * 0.03; ctx.lineCap = 'round';
  const c = size * 0.18, m = size * 0.1;
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
    const x = cx + sx * (h - m), y = cy + sy * (h - m);
    ctx.beginPath(); ctx.moveTo(x, y - sy * c); ctx.lineTo(x, y); ctx.lineTo(x - sx * c, y); ctx.stroke();
  });
  palm(ctx, cx, cy + size * 0.06, size * 0.62, 'rgba(255,255,255,0.92)');
  if (active > 0) {
    const k = (Math.sin((t / period) * Math.PI * 2) + 1) / 2;
    const y = cy - h + m + k * (size - 2 * m);
    const g = ctx.createLinearGradient(0, y - 40, 0, y + 6);
    g.addColorStop(0, 'rgba(241,70,53,0)'); g.addColorStop(1, `rgba(255,90,70,${0.55 * active})`);
    ctx.fillStyle = g; ctx.fillRect(cx - h + m, y - 40, size - 2 * m, 46);
    ctx.fillStyle = `rgba(255,140,120,${active})`; ctx.fillRect(cx - h + m, y, size - 2 * m, 4);
  }
  ctx.restore();
}

export function coffee(ctx, cx, cy, s, color = COLORS.white) {
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 0.3 * s, cy - 0.12 * s); ctx.lineTo(cx + 0.24 * s, cy - 0.12 * s);
  ctx.lineTo(cx + 0.18 * s, cy + 0.34 * s); ctx.lineTo(cx - 0.24 * s, cy + 0.34 * s); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 0.27 * s, cy + 0.06 * s, 0.11 * s, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  for (const dx of [-0.14, 0, 0.14]) {
    ctx.beginPath(); ctx.moveTo(cx + dx * s, cy - 0.2 * s);
    ctx.bezierCurveTo(cx + (dx - 0.07) * s, cy - 0.3 * s, cx + (dx + 0.07) * s, cy - 0.36 * s, cx + dx * s, cy - 0.46 * s); ctx.stroke();
  }
  ctx.restore();
}

export function bottle(ctx, cx, cy, s, color = COLORS.white) {
  ctx.save(); ctx.fillStyle = color;
  rrect(ctx, cx - 0.06 * s, cy - 0.46 * s, 0.12 * s, 0.08 * s, 0.02 * s); ctx.fill();
  rrect(ctx, cx - 0.09 * s, cy - 0.38 * s, 0.18 * s, 0.14 * s, 0.03 * s); ctx.fill();
  rrect(ctx, cx - 0.17 * s, cy - 0.26 * s, 0.34 * s, 0.72 * s, 0.1 * s); ctx.fill();
  ctx.fillStyle = 'rgba(241,70,53,0.9)'; ctx.fillRect(cx - 0.17 * s, cy - 0.02 * s, 0.34 * s, 0.18 * s);
  ctx.restore();
}

export function bowl(ctx, cx, cy, s, color = COLORS.white) {
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, 0.42 * s, 0, Math.PI); ctx.closePath(); ctx.fill();
  rrect(ctx, cx - 0.16 * s, cy + 0.4 * s, 0.32 * s, 0.07 * s, 0.03 * s); ctx.fill();
  ctx.lineWidth = s * 0.05;
  ctx.beginPath(); ctx.moveTo(cx + 0.05 * s, cy - 0.04 * s); ctx.lineTo(cx + 0.38 * s, cy - 0.46 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 0.14 * s, cy - 0.02 * s); ctx.lineTo(cx + 0.48 * s, cy - 0.38 * s); ctx.stroke();
  ctx.lineWidth = s * 0.05;
  for (const dx of [-0.2, -0.05]) { ctx.beginPath(); ctx.moveTo(cx + dx * s, cy - 0.1 * s); ctx.quadraticCurveTo(cx + (dx + 0.06) * s, cy - 0.22 * s, cx + dx * s, cy - 0.32 * s); ctx.stroke(); }
  ctx.restore();
}

export const ICONS = { coffee, bottle, bowl };

export function bubble(ctx, cx, cy, s, color = COLORS.white) {
  ctx.save(); ctx.fillStyle = color;
  rrect(ctx, cx - 0.5 * s, cy - 0.38 * s, s, 0.66 * s, 0.2 * s); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - 0.22 * s, cy + 0.2 * s); ctx.lineTo(cx - 0.32 * s, cy + 0.48 * s); ctx.lineTo(cx + 0.02 * s, cy + 0.24 * s); ctx.fill();
  ctx.fillStyle = COLORS.red;
  for (const dx of [-0.24, 0, 0.24]) { ctx.beginPath(); ctx.arc(cx + dx * s, cy - 0.05 * s, 0.065 * s, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

export function check(ctx, cx, cy, s, color = COLORS.ok) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 0.35 * s, cy); ctx.lineTo(cx - 0.1 * s, cy + 0.26 * s); ctx.lineTo(cx + 0.38 * s, cy - 0.28 * s); ctx.stroke();
  ctx.restore();
}

export function cross(ctx, cx, cy, s, color = COLORS.miss) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 0.3 * s, cy - 0.3 * s); ctx.lineTo(cx + 0.3 * s, cy + 0.3 * s);
  ctx.moveTo(cx + 0.3 * s, cy - 0.3 * s); ctx.lineTo(cx - 0.3 * s, cy + 0.3 * s); ctx.stroke();
  ctx.restore();
}
