// Сцена 4 [0:26–0:34] — Механика: живой счётчик страны доходит до …000, «+1 000 Б», чипы Gold / Red+ / Рассрочка.
import { COLORS, FONT } from '../../config/video.config.js';
import { text, card, withTransform, check, rrect, font } from '../lib/draw.js';
import { prog, ease, fmt, lerp, rng } from '../lib/easing.js';

export function drawMechanics(ctx, t, sc) {
  const A = sc.anim, dur = sc.end - sc.start;
  const exit = ease.inCubic(prog(t, dur - 0.28, dur));
  const enter = ease.outCubic(prog(t, 0, 0.3));

  withTransform(ctx, { x: 540, y: 900, alpha: Math.min(enter, 1 - exit), dy: (1 - enter) * 120 - exit * 140 }, () => {
    // заголовок в 2 строки
    const [l1, ...rest] = sc.onScreen.headline.split(' ');
    const h1 = ease.outBack(prog(t, 0.05, 0.35), 2);
    withTransform(ctx, { x: 540, y: 372, scale: h1, alpha: Math.min(1, h1) }, () =>
      text(ctx, l1, 540, 372, { size: 80, weight: FONT.black }));
    const h2 = ease.outBack(prog(t, 0.2, 0.5), 2);
    withTransform(ctx, { x: 540, y: 470, scale: h2, alpha: Math.min(1, h2) }, () =>
      text(ctx, rest.join(' '), 540, 470, { size: 100, weight: FONT.black, color: COLORS.gold, maxW: 900 }));

    // панель счётчика
    const tk = A.ticker;
    const k = prog(t, tk.t0, tk.t1);
    const val = Math.round(lerp(tk.from, tk.to, ease.inOutCubic(k)));
    const hit = t >= tk.t1;
    const hitK = prog(t, tk.t1, tk.t1 + A.hitFlash);
    const PX = 120, PY = 610, PW = 840, PH = 360;
    card(ctx, PX, PY, PW, PH, { r: 40, fill: hit ? 'rgba(255,200,61,0.12)' : COLORS.card, stroke: hit ? COLORS.gold : COLORS.cardStroke, glow: hit ? `rgba(255,200,61,${0.7 * (1 - hitK) + 0.25})` : null });
    text(ctx, 'ПЛАТЕЖЕЙ ПО СТРАНЕ', 540, PY + 62, { size: 32, weight: FONT.semi, color: COLORS.muted, letter: 3 });

    const head = fmt(Math.floor(val / 1000)) + ' ';
    const tail = String(val % 1000).padStart(3, '0');
    const pop = hit ? 1 + 0.14 * (1 - ease.outCubic(hitK)) : 1;
    withTransform(ctx, { x: 540, y: PY + 170, scale: pop }, () => {
      ctx.font = font(112, FONT.black);
      const hw = ctx.measureText(head).width, tw = ctx.measureText(tail).width;
      const x0 = 540 - (hw + tw) / 2;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = COLORS.white; ctx.fillText(head, x0, PY + 170);
      ctx.fillStyle = COLORS.gold; ctx.fillText(tail, x0 + hw, PY + 170);
    });

    // прогресс до следующей тысячи
    const p = hit ? 1 : (val % 1000) / 1000;
    rrect(ctx, PX + 60, PY + 262, PW - 120, 18, 9); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
    rrect(ctx, PX + 60, PY + 262, Math.max(18, (PW - 120) * p), 18, 9); ctx.fillStyle = hit ? COLORS.gold : COLORS.red; ctx.fill();
    text(ctx, hit ? 'КРУГЛЫЙ НОМЕР!' : `до …000: ${1000 - (val % 1000)}`, 540, PY + 318, { size: 30, weight: FONT.bold, color: hit ? COLORS.gold : COLORS.muted });

    // «+1 000 Б» + конфетти
    if (hit) {
      const b = ease.outBack(prog(t, tk.t1, tk.t1 + 0.3), 2.6);
      const fade = 1 - prog(t, tk.t1 + 2.2, tk.t1 + 2.6);
      withTransform(ctx, { x: 800, y: PY + 8, scale: b, rot: 0.1, alpha: fade }, () => {
        rrect(ctx, 800 - 150, PY + 8 - 48, 300, 96, 48);
        ctx.fillStyle = COLORS.gold; ctx.fill();
        text(ctx, '+1 000 Б', 800, PY + 12, { size: 50, weight: FONT.black, color: '#1A1206' });
      });
      confetti(ctx, t - tk.t1, 540, PY + 170);
    }

    // чипы оплаты
    const chips = sc.onScreen.chips;
    chips.forEach((c, i) => {
      const t0 = A.chipsStart + i * A.chipStagger;
      const ck = ease.outBack(prog(t, t0, t0 + 0.3), 2);
      if (ck <= 0) return;
      const col = i % 2, row = Math.floor(i / 2);
      const cw = 400, ch = 104, cx = 120 + col * (cw + 40), cy = 1018 + row * (ch + 28);
      withTransform(ctx, { x: cx + cw / 2, y: cy + ch / 2, scale: ck, alpha: Math.min(1, ck) }, () => {
        card(ctx, cx, cy, cw, ch, { r: 52, fill: 'rgba(43,214,123,0.10)', stroke: 'rgba(43,214,123,0.55)' });
        check(ctx, cx + 62, cy + ch / 2, 44);
        text(ctx, c, cx + 108, cy + ch / 2 + 2, { size: 44, weight: FONT.black, align: 'left', maxW: cw - 130 });
      });
    });

  });
}

function confetti(ctx, dt, cx, cy) {
  if (dt > 1.6) return;
  const r = rng(42);
  const cols = [COLORS.gold, COLORS.red, COLORS.white, '#FFAF1F'];
  for (let i = 0; i < 70; i++) {
    const ang = r() * Math.PI * 2, sp = 500 + r() * 900;
    const x = cx + Math.cos(ang) * sp * dt;
    const y = cy + Math.sin(ang) * sp * dt + 900 * dt * dt;
    const a = 1 - dt / 1.6;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y); ctx.rotate(dt * 8 + i);
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(-9, -5, 18, 10);
    ctx.restore();
  }
}
