// Сцена 2 [0:04–0:08.4] — «Сегодня разбираем CLAUDE»: что это? почему все говорят?
import { COLORS, FONT } from '../../config/video.config.js';
import { text, card, withTransform, pill, bubble } from '../lib/draw.js';
import { prog, ease, lerp } from '../lib/easing.js';
import { slam, sceneMotion } from './common.js';

export function drawIntro(ctx, t, sc) {
  const A = sc.anim, O = sc.onScreen, dur = sc.end - sc.start;
  const m = sceneMotion(t, dur);

  withTransform(ctx, { x: 540, y: 900, alpha: m.alpha, dy: m.dy }, () => {
    const c = ease.outBack(prog(t, A.chipIn, A.chipIn + 0.3), 2);
    withTransform(ctx, { x: 540, y: 380, scale: c, alpha: Math.min(1, c) }, () => {
      pill(ctx, O.chip, 540, 380, { size: 38, bg: 'rgba(255,255,255,0.08)', stroke: 'rgba(255,255,255,0.25)', fg: COLORS.muted });
    });

    // CLAUDE — крупно, с «раскрытием» по буквам
    const k = prog(t, A.titleIn, A.titleIn + 0.5);
    if (k > 0) {
      const letters = O.title.split('');
      ctx.save();
      ctx.shadowColor = 'rgba(224,122,84,0.7)'; ctx.shadowBlur = 50;
      const size = 190, spacing = 132, x0 = 540 - ((letters.length - 1) * spacing) / 2;
      letters.forEach((ch, i) => {
        const li = ease.outBack(prog(t, A.titleIn + i * 0.05, A.titleIn + i * 0.05 + 0.25), 2);
        if (li <= 0) return;
        withTransform(ctx, { x: x0 + i * spacing, y: 560, scale: li, alpha: Math.min(1, li), dy: (1 - li) * 60 }, () => {
          text(ctx, ch, x0 + i * spacing, 560, { size, weight: FONT.black, color: COLORS.white });
        });
      });
      ctx.restore();
    }

    // два вопроса-карточки
    const q = (at, y, str, accent) => slam(ctx, t, at, 540, y, () => {
      card(ctx, 110, y - 120, 860, 240, { r: 44, fill: accent ? 'rgba(224,122,84,0.16)' : COLORS.card, stroke: accent ? 'rgba(224,122,84,0.7)' : COLORS.cardStroke });
      bubble(ctx, 230, y - 4, 110, accent ? COLORS.red : COLORS.white);
      text(ctx, str, 330, y + 4, { size: 70, weight: FONT.black, align: 'left', maxW: 600, color: accent ? COLORS.gold : COLORS.white });
    }, { over: 1.35 });
    q(A.q1At, 850, O.q1, false);
    q(A.q2At, 1130, O.q2, true);

    // «?» уплывает на фоне
    const qa = prog(t, A.q1At, A.q1At + 0.4);
    if (qa > 0) withTransform(ctx, { x: 900, y: 640, alpha: 0.18 * qa, rot: 0.15 + Math.sin(t * 1.4) * 0.05, scale: lerp(0.6, 1, ease.outCubic(qa)) }, () => {
      text(ctx, '?', 900, 640, { size: 360, weight: FONT.black, color: COLORS.red });
    });
  });
}
