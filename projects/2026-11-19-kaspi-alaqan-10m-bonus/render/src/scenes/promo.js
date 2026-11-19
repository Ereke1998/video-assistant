// Сцена 2 [0:04–0:12] — Суть акции: даты, «сумма не важна», 5 карточек уровней.
import { COLORS, FONT, SAFE } from '../../config/video.config.js';
import { text, pill, card, withTransform, font } from '../lib/draw.js';
import { prog, ease, lerp } from '../lib/easing.js';

export function drawPromo(ctx, t, sc) {
  const A = sc.anim, dur = sc.end - sc.start;
  const exit = ease.inCubic(prog(t, dur - 0.28, dur));
  const enter = ease.outCubic(prog(t, 0, 0.3));

  withTransform(ctx, { x: 540, y: 900, alpha: Math.min(enter, 1 - exit), dy: (1 - enter) * 120 - exit * 140 }, () => {
    // бейдж годовщины
    const b = ease.outBack(prog(t, A.chipsIn, A.chipsIn + 0.3));
    withTransform(ctx, { x: 540, y: 336, scale: b, alpha: b }, () => {
      pill(ctx, sc.onScreen.badge, 540, 336, { size: 30, bg: 'rgba(241,70,53,0.14)', stroke: COLORS.red, fg: COLORS.white, padX: 26, padY: 14 });
    });
    // даты
    const d = ease.outCubic(prog(t, A.chipsIn + 0.15, A.chipsIn + 0.5));
    withTransform(ctx, { x: 540, y: 432, alpha: d, dy: (1 - d) * 40 }, () => {
      text(ctx, sc.onScreen.chipDates, 540, 432, { size: 66, weight: FONT.black, maxW: 900 });
    });
    // «сумма не важна»
    const r = ease.outBack(prog(t, A.chipsIn + 0.45, A.chipsIn + 0.8), 2.4);
    withTransform(ctx, { x: 540, y: 528, scale: r, alpha: Math.min(1, r), rot: -0.02 }, () => {
      pill(ctx, sc.onScreen.chipRule, 540, 528, { size: 52, weight: FONT.black, bg: COLORS.red, padX: 40, padY: 16 });
    });

    // карточки уровней
    const x0 = SAFE.left + 24, w = SAFE.right - SAFE.left - 48;
    sc.levels.forEach((lv, i) => {
      const t0 = A.cardsStart + i * A.cardStagger;
      const k = prog(t, t0, t0 + 0.42);
      if (k <= 0) return;
      const y = 622 + i * (A.cardH + A.cardGap);
      const e = ease.outBack(k, 1.4);
      withTransform(ctx, { x: 540, y: y + A.cardH / 2, alpha: Math.min(1, k * 2.5), dx: (1 - e) * 700 }, () => {
        if (lv.jackpot) {
          const pulse = (Math.sin((t - t0) * Math.PI * 2 * A.jackpotPulse) + 1) / 2;
          const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
          g.addColorStop(0, '#FFD866'); g.addColorStop(1, '#FFAF1F');
          card(ctx, x0, y, w, A.cardH, { r: 28, fill: g, stroke: null, glow: `rgba(255,200,61,${0.45 + 0.4 * pulse})` });
        } else {
          card(ctx, x0, y, w, A.cardH, { r: 28 });
        }
        const fg = lv.jackpot ? '#1A1206' : COLORS.white;
        const sub = lv.jackpot ? 'rgba(26,18,6,0.7)' : COLORS.muted;
        // справа — приз, слева — «каждая N-я оплата», ужимается под оставшуюся ширину
        ctx.font = font(lv.jackpot ? 54 : 50, FONT.black);
        const prizeW = ctx.measureText(`+${lv.prize} Б`).width;
        text(ctx, `+${lv.prize} Б`, x0 + w - 34, y + A.cardH / 2 + 2, { size: lv.jackpot ? 54 : 50, weight: FONT.black, color: lv.jackpot ? fg : COLORS.gold, align: 'right', maxW: 2000 });
        text(ctx, 'КАЖДАЯ', x0 + 34, y + 36, { size: 26, weight: FONT.semi, color: sub, align: 'left', maxW: 400 });
        text(ctx, `${lv.every} оплата`, x0 + 34, y + 78, { size: 44, weight: FONT.black, color: fg, align: 'left', maxW: w - prizeW - 100 });
      });
    });
  });
}
