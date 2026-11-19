// Сцена 5 [0:34–0:40] — Финал: счёт 0 / 10 000 000, «плачу ладонью», вопрос + CTA в комментарии.
import { COLORS, FONT } from '../../config/video.config.js';
import { text, card, withTransform, palm, bubble, rrect, font } from '../lib/draw.js';
import { prog, ease } from '../lib/easing.js';

export function drawFinale(ctx, t, sc) {
  const A = sc.anim, dur = sc.end - sc.start;
  const enter = ease.outCubic(prog(t, 0, 0.3));

  withTransform(ctx, { x: 540, y: 900, alpha: enter, dy: (1 - enter) * 120 }, () => {
    // табло счёта
    const s = ease.outBack(prog(t, A.scoreIn, A.scoreIn + 0.35), 1.8);
    withTransform(ctx, { x: 540, y: 470, scale: s, alpha: Math.min(1, s) }, () => {
      card(ctx, 140, 350, 800, 240, { r: 40 });
      text(ctx, 'МОЙ СЧЁТ', 540, 404, { size: 32, weight: FONT.semi, color: COLORS.muted, letter: 3 });
      const [mine, total] = sc.onScreen.score.split(' / ');
      ctx.font = font(100, FONT.black);
      const a = ctx.measureText(mine).width, b = ctx.measureText(` / ${total}`).width;
      const x0 = 540 - (a + b) / 2;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = COLORS.miss; ctx.fillText(mine, x0, 510);
      ctx.fillStyle = COLORS.gold; ctx.fillText(` / ${total}`, x0 + a, 510);
    });

    // «теперь плачу ладонью»
    const p = ease.outBack(prog(t, 1.55, 1.9), 2);
    withTransform(ctx, { x: 540, y: 720, scale: p, alpha: Math.min(1, p) }, () => {
      card(ctx, 230, 650, 620, 140, { r: 70, fill: 'rgba(241,70,53,0.14)', stroke: 'rgba(241,70,53,0.6)' });
      palm(ctx, 320, 724, 92, COLORS.white);
      text(ctx, 'плачу ладонью', 400, 722, { size: 54, weight: FONT.black, align: 'left', maxW: 430 });
    });

    // главный вопрос
    const h = prog(t, A.headlineIn, A.headlineIn + 0.2);
    if (h > 0) {
      const sc2 = 1.6 - 0.6 * ease.outBack(h, 1.6);
      withTransform(ctx, { x: 540, y: 980, scale: sc2, alpha: Math.min(1, h * 3) }, () => {
        text(ctx, 'КТО УЖЕ ПОЙМАЛ', 540, 940, { size: 92, weight: FONT.black, maxW: 900 });
        text(ctx, 'БОНУСЫ?', 540, 1050, { size: 132, weight: FONT.black, color: COLORS.gold, maxW: 900 });
      });
    }

    // CTA
    const c = ease.outElastic(prog(t, A.ctaIn, A.ctaIn + 0.7));
    if (c > 0) withTransform(ctx, { x: 540, y: 1216, scale: c, alpha: Math.min(1, prog(t, A.ctaIn, A.ctaIn + 0.1)) }, () => {
      ctx.font = font(46, FONT.black);
      const w = ctx.measureText(sc.onScreen.cta).width + 170;
      rrect(ctx, 540 - w / 2, 1216 - 52, w, 104, 52);
      ctx.fillStyle = COLORS.red; ctx.fill();
      bubble(ctx, 540 - w / 2 + 70, 1214, 62, COLORS.white);
      text(ctx, sc.onScreen.cta, 540 + 40, 1218, { size: 46, weight: FONT.black });
    });
  });

  // затемнение в конце
  const f = prog(t, dur - A.fadeOut, dur);
  if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, 1080, 1920); }
}
