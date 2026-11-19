import { VIDEO, SAFE, LAYOUT, COLORS, FONT, BRAND } from '../../config/video.config.js';
import { font, rrect } from '../lib/draw.js';
import { prog, ease } from '../lib/easing.js';

/** Иконка Instagram (контур): скруглённый квадрат, круг, точка */
function igIcon(ctx, cx, cy, s, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = s * 0.1;
  rrect(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.22, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + s * 0.27, cy - s * 0.27, s * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Плашка аккаунта автора — видна с первого до последнего кадра, правый верхний угол безопасной зоны */
function drawHandle(ctx, y) {
  ctx.save();
  ctx.font = font(32, FONT.bold);
  const tw = ctx.measureText(BRAND.handle).width;
  const H = 58, W = tw + 94, x = VIDEO.width - SAFE.left - W;
  rrect(ctx, x, y - H / 2, W, H, H / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2; ctx.stroke();
  igIcon(ctx, x + 36, y, 30, COLORS.white);
  ctx.fillStyle = COLORS.white; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(BRAND.handle, x + 66, y + 1);
  ctx.restore();
}

/** HUD: ● РАЗБОР слева, @аккаунт справа, тонкий прогресс-бар. В верхней безопасной зоне. */
export function drawHud(ctx, t) {
  const y = LAYOUT.hud;
  drawHandle(ctx, y);                       // аккаунт — всегда, без анимации входа
  const a = ease.outCubic(prog(t, 0.25, 0.6));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;

  // левая плашка
  const label = 'РАЗБОР';
  ctx.font = font(30, FONT.bold);
  ctx.letterSpacing = '3px';
  const lw = ctx.measureText(label).width;
  const W = lw + 92, H = 58, x = SAFE.left;
  rrect(ctx, x, y - H / 2, W, H, H / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2; ctx.stroke();
  const blink = Math.floor(t * 2) % 2 === 0 ? 1 : 0.35;
  ctx.fillStyle = `rgba(224,122,84,${blink})`;
  ctx.beginPath(); ctx.arc(x + 34, y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.white; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 60, y + 1);
  ctx.letterSpacing = '0px';

  // прогресс-бар на всю длину ролика
  const by = y + 50, bw = VIDEO.width - SAFE.left * 2;
  rrect(ctx, SAFE.left, by, bw, 6, 3); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
  rrect(ctx, SAFE.left, by, Math.max(6, bw * (t / VIDEO.duration)), 6, 3); ctx.fillStyle = COLORS.red; ctx.fill();
  ctx.restore();
}
