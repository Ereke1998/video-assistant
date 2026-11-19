// Сцена 5 [0:20.4–0:28] — Пример: видео эксперта → Claude → разбор речи, вставки, субтитры, план монтажа.
import { COLORS, FONT } from '../../config/video.config.js';
import { text, card, withTransform, rrect, aiChip, play, check, ICONS } from '../lib/draw.js';
import { prog, ease } from '../lib/easing.js';
import { sceneMotion } from './common.js';

function person(ctx, cx, cy, s) {
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(cx, cy - 0.22 * s, 0.2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy + 0.38 * s, 0.38 * s, 0.32 * s, 0, Math.PI, 0); ctx.fill();
  ctx.restore();
}

export function drawExample(ctx, t, sc) {
  const A = sc.anim, O = sc.onScreen, dur = sc.end - sc.start;
  const m = sceneMotion(t, dur);

  withTransform(ctx, { x: 540, y: 900, alpha: m.alpha, dy: m.dy }, () => {
    const h = ease.outCubic(prog(t, 0.05, 0.35));
    withTransform(ctx, { x: 540, y: 380, alpha: h, dy: (1 - h) * 30 }, () => {
      text(ctx, O.head, 540, 380, { size: 96, weight: FONT.black, color: COLORS.gold, letter: 4 });
    });

    // видео эксперта (слева)
    const v = ease.outBack(prog(t, A.videoIn, A.videoIn + 0.35), 1.7);
    const vx = 90, vy = 500, vw = 470, vh = 300;
    withTransform(ctx, { x: vx + vw / 2, y: vy + vh / 2, scale: v, alpha: Math.min(1, v) }, () => {
      const g = ctx.createLinearGradient(vx, vy, vx + vw, vy + vh);
      g.addColorStop(0, 'rgba(90,169,255,0.45)'); g.addColorStop(1, 'rgba(20,22,30,0.95)');
      rrect(ctx, vx, vy, vw, vh, 30); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = COLORS.cardStroke; ctx.lineWidth = 2; ctx.stroke();
      person(ctx, vx + vw / 2, vy + 150, 170);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(vx + vw / 2, vy + vh / 2, 46, 0, Math.PI * 2); ctx.fill();
      play(ctx, vx + vw / 2 + 4, vy + vh / 2, 54);
      rrect(ctx, vx + 18, vy + vh - 58, vw - 36, 40, 12); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
      text(ctx, O.file, vx + vw / 2, vy + vh - 37, { size: 24, weight: FONT.semi, color: COLORS.muted, maxW: vw - 60 });
    });
    if (v > 0.5) text(ctx, O.video, vx + vw / 2, vy + vh + 40, { size: 32, weight: FONT.bold, color: COLORS.muted, alpha: 1 });

    // стрелка → чип Claude (справа)
    const ar = prog(t, A.arrowAt, A.arrowAt + 0.3);
    if (ar > 0) {
      ctx.save(); ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 8; ctx.lineCap = 'round';
      const x1 = 590, x2 = 590 + 120 * ease.outCubic(ar), yy = vy + vh / 2;
      ctx.beginPath(); ctx.moveTo(x1, yy); ctx.lineTo(x2, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2 - 20, yy - 20); ctx.lineTo(x2, yy); ctx.lineTo(x2 - 20, yy + 20); ctx.stroke();
      ctx.restore();
    }
    const c = ease.outBack(prog(t, A.chipIn, A.chipIn + 0.4), 1.8);
    withTransform(ctx, { x: 850, y: vy + vh / 2, scale: c, alpha: Math.min(1, c) }, () => aiChip(ctx, 850, vy + vh / 2, 170, t));

    // результаты — список с галочками, появляются по словам озвучки
    const rx = 90, rw = 900, rh = 96, ry0 = 900;
    sc.outputs.forEach((o, i) => {
      const k = prog(t, o.at, o.at + 0.3);
      if (k <= 0) return;
      const y = ry0 + i * (rh + 16);
      const active = 1 - prog(t, o.at + 0.7, o.at + 1.3);
      withTransform(ctx, { x: rx + rw / 2, y: y + rh / 2, alpha: Math.min(1, k * 2.5), dx: (1 - ease.outCubic(k)) * 200 }, () => {
        card(ctx, rx, y, rw, rh, { r: 28, fill: `rgba(224,122,84,${0.06 + 0.16 * active})`, stroke: active > 0.1 ? `rgba(255,200,61,${0.3 + 0.6 * active})` : COLORS.cardStroke });
        ICONS[o.icon](ctx, rx + 70, y + rh / 2, 62, active > 0.1 ? COLORS.gold : COLORS.white);
        text(ctx, o.label, rx + 130, y + rh / 2 + 2, { size: 46, weight: FONT.black, align: 'left', maxW: 620 });
        const ck = ease.outBack(prog(t, o.at + 0.15, o.at + 0.4), 2.4);
        if (ck > 0) withTransform(ctx, { x: rx + rw - 60, y: y + rh / 2, scale: ck }, () => check(ctx, rx + rw - 60, y + rh / 2, 52));
      });
    });
  });
}
