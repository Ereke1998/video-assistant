// Сцена 7 [0:32.8–0:37] — Финал: «В следующих видео — реальный пример», CTA подписаться.
import { COLORS, FONT } from '../../config/video.config.js';
import { text, card, withTransform, rrect, font, play, bell } from '../lib/draw.js';
import { prog, ease } from '../lib/easing.js';
import { slam, plate } from './common.js';

export function drawFinale(ctx, t, sc) {
  const A = sc.anim, O = sc.onScreen, dur = sc.end - sc.start;
  const enter = ease.outCubic(prog(t, 0, 0.3));

  withTransform(ctx, { x: 540, y: 900, alpha: enter, dy: (1 - enter) * 120 }, () => {
    const h = ease.outCubic(prog(t, A.headIn, A.headIn + 0.3));
    withTransform(ctx, { x: 540, y: 400, alpha: h, dy: (1 - h) * 30 }, () => {
      text(ctx, O.head, 540, 400, { size: 84, weight: FONT.black, maxW: 920 });
    });

    // карточка-«превью следующего видео»
    const cIn = ease.outBack(prog(t, 0.25, 0.6), 1.6);
    const x = 140, y = 520, W = 800, H = 520;
    withTransform(ctx, { x: 540, y: y + H / 2, scale: cIn, alpha: Math.min(1, cIn) }, () => {
      const g = ctx.createLinearGradient(x, y, x + W, y + H);
      g.addColorStop(0, 'rgba(224,122,84,0.55)'); g.addColorStop(1, 'rgba(18,19,26,0.95)');
      rrect(ctx, x, y, W, H, 44); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();
      const pulse = 1 + 0.06 * Math.sin(t * 6);
      withTransform(ctx, { x: 540, y: y + 210, scale: pulse }, () => {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.arc(540, y + 210, 96, 0, Math.PI * 2); ctx.fill();
        play(ctx, 548, y + 210, 110);
      });
      // «СКОРО»
      ctx.save(); ctx.translate(x + W - 120, y + 60); ctx.rotate(0.12);
      rrect(ctx, -90, -32, 180, 64, 32); ctx.fillStyle = COLORS.gold; ctx.fill();
      text(ctx, 'СКОРО', 0, 2, { size: 34, weight: FONT.black, color: '#141414' });
      ctx.restore();
      text(ctx, O.sub, 540, y + H - 70, { size: 40, weight: FONT.bold, color: COLORS.muted, maxW: W - 80 });
    });
    slam(ctx, t, A.cardAt, 540, y + 380, () => plate(ctx, O.card, 540, y + 380, { size: 72, bg: COLORS.white, fg: '#141414' }), { over: 1.8, rot: -0.03 });

    // CTA с пружиной
    const c = ease.outElastic(prog(t, A.ctaIn, A.ctaIn + 0.7));
    if (c > 0) withTransform(ctx, { x: 540, y: 1210, scale: c, alpha: Math.min(1, prog(t, A.ctaIn, A.ctaIn + 0.1)) }, () => {
      ctx.font = font(42, FONT.black);
      const w = Math.min(920, ctx.measureText(O.cta).width + 170);
      rrect(ctx, 540 - w / 2, 1210 - 50, w, 100, 50);
      ctx.fillStyle = COLORS.red; ctx.fill();
      const ring = Math.sin(t * 22) * 0.25 * (1 - prog(t, A.ctaIn + 0.3, A.ctaIn + 1.2));
      withTransform(ctx, { x: 540 - w / 2 + 64, y: 1206, rot: ring }, () => bell(ctx, 540 - w / 2 + 64, 1206, 58, COLORS.white));
      text(ctx, O.cta, 540 + 38, 1213, { size: 42, weight: FONT.black, maxW: w - 150 });
    });
  });

  const f = prog(t, dur - A.fadeOut, dur);
  if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, 1080, 1920); }
}
