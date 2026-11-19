import { VIDEO, SAFE, LAYOUT, COLORS, FONT } from '../../config/video.config.js';
import { font, rrect } from '../lib/draw.js';
import { prog, ease } from '../lib/easing.js';

/** Плашка репортажа: ● ЭКСПЕРИМЕНТ  00:12 / 00:40 + тонкий прогресс-бар. В верхней безопасной зоне. */
export function drawHud(ctx, t) {
  const a = ease.outCubic(prog(t, 0.25, 0.6));
  if (a <= 0) return;
  const y = LAYOUT.hud;
  ctx.save();
  ctx.globalAlpha = a;

  // левая плашка
  const label = 'ЭКСПЕРИМЕНТ';
  ctx.font = font(30, FONT.bold);
  ctx.letterSpacing = '3px';
  const lw = ctx.measureText(label).width;
  const W = lw + 92, H = 58, x = SAFE.left;
  rrect(ctx, x, y - H / 2, W, H, H / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2; ctx.stroke();
  const blink = Math.floor(t * 2) % 2 === 0 ? 1 : 0.35;
  ctx.fillStyle = `rgba(241,70,53,${blink})`;
  ctx.beginPath(); ctx.arc(x + 34, y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.white; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 60, y + 1);
  ctx.letterSpacing = '0px';

  // таймер справа
  const mmss = (s) => `00:${String(Math.min(40, Math.floor(s))).padStart(2, '0')}`;
  ctx.font = font(32, FONT.semi);
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(`${mmss(t)} / 00:40`, VIDEO.width - SAFE.left, y + 1);

  // прогресс-бар 40 секунд
  const by = y + 50, bw = VIDEO.width - SAFE.left * 2;
  rrect(ctx, SAFE.left, by, bw, 6, 3); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
  rrect(ctx, SAFE.left, by, Math.max(6, bw * (t / VIDEO.duration)), 6, 3); ctx.fillStyle = COLORS.red; ctx.fill();
  ctx.restore();
}
