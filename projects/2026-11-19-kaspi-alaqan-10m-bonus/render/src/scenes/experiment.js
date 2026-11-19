// Сцена 3 [0:12–0:26] — Эксперимент: 3 попытки, скан ладони → номер платежа → штамп «МИМО».
import { COLORS, FONT } from '../../config/video.config.js';
import { text, card, withTransform, palm, ICONS, check, cross, rrect, font } from '../lib/draw.js';
import { prog, ease, fmt, lerp, shake } from '../lib/easing.js';

export function drawExperiment(ctx, t, sc, T) {
  const A = sc.anim, dur = sc.end - sc.start;
  const exit = ease.inCubic(prog(t, dur - 0.28, dur));
  const idx = Math.max(0, sc.attempts.findIndex((a) => T >= a.start && T < a.end));
  const at = sc.attempts[idx];
  const lt = T - at.start, adur = at.end - at.start;
  const stampAt = A.stampAt[idx];

  withTransform(ctx, { x: 540, y: 900, alpha: 1 - exit, dy: -exit * 140 }, () => {
    // заголовок попытки + индикатор 3 попыток
    const hk = ease.outBack(prog(lt, 0, 0.3), 2);
    withTransform(ctx, { x: 360, y: 350, scale: hk, alpha: Math.min(1, hk) }, () => {
      text(ctx, at.label, 84, 350, { size: 76, weight: FONT.black, align: 'left', maxW: 560 });
    });
    sc.attempts.forEach((a, i) => {
      const cx = 760 + i * 84, cy = 350;
      ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      const missed = i < idx || (i === idx && lt >= stampAt);
      ctx.fillStyle = missed ? 'rgba(255,59,59,0.18)' : i === idx ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.strokeStyle = missed ? COLORS.miss : i === idx ? COLORS.white : 'rgba(255,255,255,0.2)'; ctx.lineWidth = 3; ctx.stroke();
      if (missed) cross(ctx, cx, cy, 30);
      else text(ctx, String(i + 1), cx, cy + 2, { size: 30, weight: FONT.black, color: i === idx ? COLORS.white : COLORS.muted });
    });
    text(ctx, sc.onScreen.need, 540, 432, { size: 32, weight: FONT.semi, color: COLORS.muted, letter: 2 });

    // карточка чека: въезд справа / выезд влево
    const inK = ease.outCubic(prog(lt, 0, 0.32));
    const outK = idx < 2 ? ease.inCubic(prog(lt, adur + A.outAt, adur)) : 0;
    const [sx, sy] = shake(lt, stampAt, 16, 0.3, idx + 3);
    withTransform(ctx, { x: 540, y: 900, alpha: Math.min(inK, 1 - outK), dx: (1 - inK) * 600 - outK * 600 + sx, dy: sy }, () => {
      drawReceipt(ctx, lt, at, A, stampAt, T);
    });
  });
}

function drawReceipt(ctx, lt, at, A, stampAt, T) {
  const X = 120, Y = 490, W = 840, H = 800;
  card(ctx, X, Y, W, H, { r: 40, fill: 'rgba(255,255,255,0.06)' });

  // иконка покупки
  ctx.beginPath(); ctx.arc(540, Y + 120, 80, 0, Math.PI * 2); ctx.fillStyle = 'rgba(241,70,53,0.16)'; ctx.fill();
  ICONS[at.icon](ctx, 540, Y + 124, 110, COLORS.white);
  text(ctx, at.item, 540, Y + 252, { size: 62, weight: FONT.black });
  text(ctx, at.amount, 540, Y + 322, { size: 46, weight: FONT.semi, color: COLORS.muted });

  // пунктир
  ctx.save(); ctx.setLineDash([14, 12]); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(X + 50, Y + 380); ctx.lineTo(X + W - 50, Y + 380); ctx.stroke(); ctx.restore();

  // оплата ладонью: прогресс скана → «Оплачено»
  const scan = prog(lt, A.scanAt, A.scanAt + A.scanDur);
  const paid = scan >= 1;
  const ry = Y + 450;
  palm(ctx, X + 100, ry + 4, 64, paid ? COLORS.ok : COLORS.white);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = font(40, FONT.bold); ctx.fillStyle = COLORS.white;
  ctx.fillText(paid ? 'Оплачено ладонью' : scan > 0 ? 'Сканирую ладонь…' : 'Оплата ладонью', X + 160, ry);
  if (!paid) {
    rrect(ctx, X + W - 210, ry - 8, 160, 16, 8); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    if (scan > 0) { rrect(ctx, X + W - 210, ry - 8, 160 * scan, 16, 8); ctx.fillStyle = COLORS.red; ctx.fill(); }
  } else {
    const ck = ease.outBack(prog(lt, A.scanAt + A.scanDur, A.scanAt + A.scanDur + 0.25), 2.5);
    withTransform(ctx, { x: X + W - 90, y: ry, scale: ck }, () => check(ctx, X + W - 90, ry, 56));
  }

  // номер платежа по стране — прокрутка
  const rk = prog(lt, A.rollAt, A.rollAt + A.rollDur);
  if (rk > 0) {
    text(ctx, '№ ПЛАТЕЖА ПО СТРАНЕ', 540, Y + 552, { size: 32, weight: FONT.semi, color: COLORS.muted, letter: 2 });
    const val = Math.round(lerp(at.txn - 1800, at.txn, ease.outQuart(rk)));
    const head = fmt(Math.floor(val / 1000)) + ' ';
    const tail = String(val % 1000).padStart(3, '0');
    ctx.font = font(104, FONT.black);
    const hw = ctx.measureText(head).width, tw = ctx.measureText(tail).width;
    const x0 = 540 - (hw + tw) / 2;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.white; ctx.fillText(head, x0, Y + 640);
    rrect(ctx, x0 + hw - 10, Y + 640 - 62, tw + 20, 124, 18);
    ctx.fillStyle = rk >= 1 ? 'rgba(255,59,59,0.22)' : 'rgba(255,255,255,0.1)'; ctx.fill();
    ctx.fillStyle = rk >= 1 ? COLORS.miss : COLORS.gold; ctx.fillText(tail, x0 + hw, Y + 640);
    if (rk >= 1) {
      const left = 1000 - (at.txn % 1000);
      const a = prog(lt, A.rollAt + A.rollDur, A.rollAt + A.rollDur + 0.3);
      ctx.globalAlpha *= a;
      text(ctx, `до круглого не хватило ${left} платежей`, 540, Y + 738, { size: 34, weight: FONT.semi, color: COLORS.muted, maxW: 760 });
      ctx.globalAlpha /= a || 1;
    }
  }

  // штамп «МИМО»
  const sk = prog(lt, stampAt, stampAt + 0.16);
  if (sk > 0) {
    const scale = lerp(2.4, 1, ease.outCubic(sk));
    withTransform(ctx, { x: 540, y: Y + 360, scale, rot: -0.2, alpha: Math.min(1, sk * 2) }, () => {
      ctx.save();
      ctx.shadowColor = 'rgba(255,59,59,0.6)'; ctx.shadowBlur = 40;
      rrect(ctx, 540 - 270, Y + 360 - 95, 540, 190, 26);
      ctx.fillStyle = 'rgba(30,6,6,0.82)'; ctx.fill();
      ctx.lineWidth = 12; ctx.strokeStyle = COLORS.miss; ctx.stroke();
      ctx.restore();
      text(ctx, at.status, 540, Y + 366, { size: 138, weight: FONT.black, color: COLORS.miss, letter: 8 });
    });
  }
}
