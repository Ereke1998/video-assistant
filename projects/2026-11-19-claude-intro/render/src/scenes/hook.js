// Сцена 1 [0:00–0:04] — Хук: лента соцсети забита постами про Claude, три слэма «CLAUDE» на каждое «Клод».
import { COLORS, FONT } from '../../config/video.config.js';
import { text, card, withTransform, rrect, play } from '../lib/draw.js';
import { prog, ease, lerp } from '../lib/easing.js';
import { slam, plate } from './common.js';

const PH = { x: 250, y: 610, w: 580, h: 700 };   // «телефон» с лентой

function feed(ctx, t, sc) {
  const { x, y, w, h } = PH;
  ctx.save();
  card(ctx, x - 14, y - 14, w + 28, h + 28, { r: 64, fill: 'rgba(0,0,0,0.55)', stroke: 'rgba(255,255,255,0.22)' });
  rrect(ctx, x, y, w, h, 52); ctx.clip();
  ctx.fillStyle = '#121318'; ctx.fillRect(x, y, w, h);
  // посты: превью + заголовок, бесконечная прокрутка
  const postH = 300, gap = 22, n = sc.feed.length;
  const speed = sc.anim.feedSpeed * (1 + 1.8 * ease.inCubic(prog(t, 0.9, 1.6))) ;
  const off = (t * speed) % ((postH + gap) * n);
  for (let i = -1; i < n + 3; i++) {
    const idx = ((i % n) + n) % n;
    const py = y + 30 + i * (postH + gap) - off;
    if (py > y + h || py + postH < y) continue;
    const px = x + 26, pw = w - 52;
    rrect(ctx, px, py, pw, postH, 26); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
    // превью-кадр
    const g = ctx.createLinearGradient(px, py, px + pw, py + 180);
    g.addColorStop(0, idx % 2 ? 'rgba(224,122,84,0.55)' : 'rgba(90,169,255,0.35)'); g.addColorStop(1, 'rgba(20,20,26,0.9)');
    rrect(ctx, px + 16, py + 16, pw - 32, 170, 18); ctx.fillStyle = g; ctx.fill();
    play(ctx, px + pw / 2, py + 100, 70, 'rgba(255,255,255,0.85)');
    // аватар + заголовок
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(px + 44, py + 236, 22, 0, Math.PI * 2); ctx.fill();
    text(ctx, sc.feed[idx], px + 80, py + 236, { size: 30, weight: FONT.bold, align: 'left', maxW: pw - 100 });
  }
  ctx.restore();
}

export function drawHook(ctx, t, sc) {
  const A = sc.anim, dur = sc.end - sc.start;
  const exit = ease.inCubic(prog(t, dur - 0.28, dur));

  withTransform(ctx, { x: 540, y: 900, alpha: 1 - exit, dy: -exit * 140 }, () => {
    // телефон: вход scale 0.85 → 1
    const pIn = ease.outBack(prog(t, 0, 0.4), 1.6);
    withTransform(ctx, { x: 540, y: 900, scale: lerp(0.85, 1, pIn), alpha: prog(t, 0, 0.1) }, () => feed(ctx, t, sc));

    // три «CLAUDE» — каждый на своё «Клод», смещены и повёрнуты, последний самый крупный
    const pos = [[540, 790, -0.08, 120], [540, 960, 0.06, 140], [540, 1140, -0.04, 168]];
    A.slams.forEach((at, i) => {
      const [x, y, rot, size] = pos[i];
      const fade = 1 - prog(t, 1.75, 2.0);   // уступают место заголовку
      if (fade <= 0) return;
      ctx.save(); ctx.globalAlpha *= fade;
      slam(ctx, t, at, x, y, () => {
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30;
        plate(ctx, 'CLAUDE', x, y, { size, bg: i === 2 ? COLORS.red : 'rgba(10,10,14,0.88)', fg: i === 2 ? COLORS.white : COLORS.gold });
        ctx.restore();
      }, { over: 2.2, rot });
      ctx.restore();
    });

    // заголовок: «ВСЯ ЛЕНТА» → плашка «ПРО CLAUDE?»
    const l1 = prog(t, A.line1At, A.line1At + 0.18);
    if (l1 > 0) withTransform(ctx, { x: 540, y: 370, alpha: Math.min(1, l1 * 3), dy: (1 - ease.outBack(l1)) * 40 }, () => {
      text(ctx, sc.onScreen.line1, 540, 370, { size: 112, weight: FONT.black, letter: 2, shadow: true });
    });
    slam(ctx, t, A.line2At, 540, 500, () => plate(ctx, sc.onScreen.line2, 540, 500, { size: 96 }), { over: 1.7, rot: -0.03 });
  });

  if (t < A.flashIn) {
    ctx.fillStyle = `rgba(255,255,255,${1 - t / A.flashIn})`;
    ctx.fillRect(0, 0, 1080, 1920);
  }
}

/** Камера: punch-in на входе + тряска на каждом «CLAUDE» */
export function hookCamera(t, sc) {
  const zoom = lerp(1.18, 1, ease.outExpo(prog(t, 0, 0.45)));
  return { zoom, shakes: [...sc.anim.slams.map((a, i) => [a, 8 + i * 4]), [sc.anim.line2At, 12]] };
}
