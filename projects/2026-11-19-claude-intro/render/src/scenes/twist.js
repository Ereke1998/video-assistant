// Сцена 4 [0:16–0:20.4] — «Но самое интересное…»: дорожки монтажа собираются, слэм «ВИДЕОМОНТАЖ!».
import { COLORS, FONT } from '../../config/video.config.js';
import { text, card, withTransform, rrect } from '../lib/draw.js';
import { prog, ease, lerp } from '../lib/easing.js';
import { slam, plate, sceneMotion } from './common.js';

const TRACKS = [
  { name: 'V2', color: 'rgba(90,169,255,0.85)',  clips: [[0.18, 0.36], [0.55, 0.72]] },
  { name: 'V1', color: 'rgba(224,122,84,0.95)',  clips: [[0.0, 0.3], [0.31, 0.62], [0.63, 1.0]] },
  { name: 'T',  color: 'rgba(255,200,61,0.9)',   clips: [[0.05, 0.22], [0.28, 0.45], [0.5, 0.68], [0.74, 0.92]] },
  { name: 'A1', color: 'rgba(43,214,123,0.8)',   clips: [[0.0, 1.0]], wave: true },
  { name: 'SFX', color: 'rgba(255,255,255,0.55)', clips: [[0.1, 0.16], [0.42, 0.47], [0.66, 0.7], [0.88, 0.93]] },
];

export function drawTwist(ctx, t, sc) {
  const A = sc.anim, O = sc.onScreen, dur = sc.end - sc.start;
  const m = sceneMotion(t, dur);
  const hit = prog(t, A.slamAt, A.slamAt + 0.18);

  withTransform(ctx, { x: 540, y: 900, alpha: m.alpha, dy: m.dy }, () => {
    const h = ease.outBack(prog(t, A.headAt, A.headAt + 0.3), 1.6);
    withTransform(ctx, { x: 540, y: 400, scale: h, alpha: Math.min(1, h) }, () => {
      text(ctx, O.head, 540, 400, { size: 80, weight: FONT.black, maxW: 900, color: COLORS.white });
    });

    // окно монтажки
    const W = 900, H = 560, x = 90, y = 600;
    const win = ease.outCubic(prog(t, A.tracksIn - 0.3, A.tracksIn + 0.2));
    withTransform(ctx, { x: 540, y: y + H / 2, alpha: win * (1 - 0.55 * hit), scale: lerp(0.94, 1, win) }, () => {
      card(ctx, x, y, W, H, { r: 34, fill: 'rgba(10,11,15,0.85)' });
      // шкала времени
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i <= 20; i++) ctx.fillRect(x + 120 + i * ((W - 150) / 20), y + 30, 2, i % 5 ? 12 : 22);
      const tx = x + 120, tw = W - 150, rowH = 86;
      TRACKS.forEach((tr, r) => {
        const ry = y + 80 + r * (rowH + 14);
        text(ctx, tr.name, x + 60, ry + rowH / 2, { size: 30, weight: FONT.bold, color: COLORS.muted });
        rrect(ctx, tx, ry, tw, rowH, 12); ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();
        tr.clips.forEach(([a, b], j) => {
          const k = ease.outCubic(prog(t, A.tracksIn + r * 0.12 + j * 0.1, A.tracksIn + r * 0.12 + j * 0.1 + 0.3));
          if (k <= 0) return;
          const cx = tx + a * tw + (1 - k) * 260, cw = (b - a) * tw - 6;
          ctx.save(); ctx.globalAlpha *= k;
          rrect(ctx, cx, ry + 6, cw, rowH - 12, 10); ctx.fillStyle = tr.color; ctx.fill();
          if (tr.wave) {
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            for (let px = 6; px < cw - 6; px += 9) { const amp = (Math.abs(Math.sin(px * 0.13) * Math.cos(px * 0.031)) * 0.8 + 0.1) * (rowH - 30); ctx.fillRect(cx + px, ry + rowH / 2 - amp / 2, 5, amp); }
          }
          ctx.restore();
        });
      });
      // плейхед
      const ph = tx + tw * prog(t, A.tracksIn, A.slamAt + 0.6);
      ctx.fillStyle = COLORS.red; ctx.fillRect(ph - 2, y + 24, 5, H - 40);
      ctx.beginPath(); ctx.moveTo(ph - 14, y + 20); ctx.lineTo(ph + 15, y + 20); ctx.lineTo(ph + 1, y + 40); ctx.fill();
    });

    // слэм «ВИДЕОМОНТАЖ!»
    slam(ctx, t, A.slamAt, 540, 880, () => {
      ctx.save(); ctx.shadowColor = 'rgba(255,200,61,0.8)'; ctx.shadowBlur = 70;
      plate(ctx, O.slam + '!', 540, 880, { size: 128, bg: COLORS.red });
      ctx.restore();
    }, { over: 2.4, rot: -0.04 });
  });
}
