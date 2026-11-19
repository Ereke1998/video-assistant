import { VIDEO, COLORS } from '../../config/video.config.js';

/** Тёмный фон: градиент, медленно плывущее красное свечение, сетка «тех-репортажа», виньетка */
export function drawBackground(ctx, t, { glow = 1, gold = 0 } = {}) {
  const { width: W, height: H } = VIDEO;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COLORS.bg1); g.addColorStop(1, COLORS.bg0);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // сетка, медленно едущая вверх
  ctx.save();
  ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 2;
  const step = 90, off = (t * 24) % step;
  ctx.beginPath();
  for (let x = 0; x <= W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = -off; y <= H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.restore();

  // свечения
  const blob = (x, y, r, color) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, color); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  blob(540 + Math.sin(t * 0.6) * 220, 760 + Math.cos(t * 0.45) * 160, 760, `rgba(241,70,53,${0.20 * glow})`);
  blob(540 - Math.sin(t * 0.4) * 260, 1500, 620, `rgba(241,70,53,${0.08 * glow})`);
  if (gold > 0) blob(540, 860, 820, `rgba(255,200,61,${0.28 * gold})`);

  // виньетка
  const v = ctx.createRadialGradient(540, 960, 500, 540, 960, 1200);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
