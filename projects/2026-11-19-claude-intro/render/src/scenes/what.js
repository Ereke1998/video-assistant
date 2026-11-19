// Сцена 3 [0:08.4–0:16] — Claude = искусственный интеллект: чип + 4 умения (тексты, анализ, код, задачи).
import { COLORS, FONT } from '../../config/video.config.js';
import { text, card, withTransform, aiChip, ICONS } from '../lib/draw.js';
import { prog, ease } from '../lib/easing.js';
import { slam, plate, sceneMotion } from './common.js';

export function drawWhat(ctx, t, sc) {
  const A = sc.anim, O = sc.onScreen, dur = sc.end - sc.start;
  const m = sceneMotion(t, dur);

  withTransform(ctx, { x: 540, y: 900, alpha: m.alpha, dy: m.dy }, () => {
    const h = ease.outCubic(prog(t, A.chipIn, A.chipIn + 0.3));
    withTransform(ctx, { x: 540, y: 360, alpha: h, dy: (1 - h) * 30 }, () => {
      text(ctx, O.head, 540, 360, { size: 104, weight: FONT.black, color: COLORS.white, letter: 3 });
    });
    slam(ctx, t, A.plateAt, 540, 486, () => plate(ctx, O.plate, 540, 486, { size: 66 }), { over: 1.5, rot: -0.02 });

    // ИИ-чип
    const c = ease.outBack(prog(t, A.chipIn, A.chipIn + 0.45), 1.8);
    withTransform(ctx, { x: 540, y: 720, scale: c, alpha: Math.min(1, c) }, () => aiChip(ctx, 540, 720, 170, t));

    // 4 карточки умений 2×2 + линии от чипа
    const cw = 400, ch = 190, gx = 30, gy = 30, x0 = 540 - cw - gx / 2, y0 = 900;
    sc.skills.forEach((s, i) => {
      const cx = x0 + (i % 2) * (cw + gx) + cw / 2, cy = y0 + Math.floor(i / 2) * (ch + gy) + ch / 2;
      const k = prog(t, s.at, s.at + 0.32);
      if (k <= 0) return;
      // линия-связь
      ctx.save();
      ctx.strokeStyle = `rgba(224,122,84,${0.5 * Math.min(1, k * 2)})`; ctx.lineWidth = 4; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.moveTo(540, 820); ctx.lineTo(cx, cy - ch / 2); ctx.stroke();
      ctx.restore();
      const sk = ease.outBack(k, 2);
      const active = 1 - prog(t, s.at + 0.6, s.at + 1.2);
      withTransform(ctx, { x: cx, y: cy, scale: sk, alpha: Math.min(1, k * 3) }, () => {
        card(ctx, cx - cw / 2, cy - ch / 2, cw, ch, { r: 36, fill: active > 0 ? `rgba(224,122,84,${0.08 + 0.14 * active})` : COLORS.card,
          stroke: active > 0 ? `rgba(255,200,61,${0.3 + 0.6 * active})` : COLORS.cardStroke, glow: active > 0.2 ? `rgba(255,200,61,${0.4 * active})` : null });
        ICONS[s.icon](ctx, cx - 128, cy, 82, active > 0.2 ? COLORS.gold : COLORS.white);
        text(ctx, s.label, cx - 66, cy + 2, { size: 52, weight: FONT.black, align: 'left', maxW: 245 });
      });
    });
  });
}
