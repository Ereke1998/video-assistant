import { LAYOUT, COLORS, FONT } from '../../config/video.config.js';
import { font, rrect } from '../lib/draw.js';
import { prog, ease } from '../lib/easing.js';

const STYLE = { size: 58, weight: FONT.black, maxW: 860, padX: 36, padY: 20, lineGap: 10 };

/** Разбор «*акцент*» → токены [{w, accent}] */
function tokens(str) {
  const out = []; let accent = false;
  str.split(/(\*)/).forEach((p) => {
    if (p === '*') { accent = !accent; return; }
    p.split(/(\s+)/).filter(Boolean).forEach((w) => out.push({ w, accent, space: /^\s+$/.test(w) }));
  });
  return out;
}

/** Перенос токенов в строки по ширине */
function layout(ctx, toks, size) {
  ctx.font = font(size, STYLE.weight);
  const lines = [[]]; let w = 0;
  for (const tk of toks) {
    const tw = ctx.measureText(tk.w.toUpperCase()).width;
    if (!tk.space && w + tw > STYLE.maxW - STYLE.padX * 2 && lines.at(-1).length) {
      while (lines.at(-1).at(-1)?.space) lines.at(-1).pop();
      lines.push([]); w = 0;
    }
    if (tk.space && !lines.at(-1).length) continue;
    lines.at(-1).push({ ...tk, tw }); w += tw;
  }
  return lines.map((l) => ({ toks: l, w: l.reduce((a, b) => a + b.tw, 0) }));
}

/** Субтитры: 3–5 слов, капс, акцент — жёлтый, pop-in. Центр по Y = LAYOUT.subtitles (выше нижних 20%). */
export function drawSubtitles(ctx, t, subs) {
  const cur = subs.find((s) => t >= s.start && t < s.end);
  if (!cur) return;
  const k = prog(t, cur.start, cur.start + 0.14);
  const scale = 0.86 + 0.14 * ease.outBack(k);
  const alpha = Math.min(1, k * 2.5) * (1 - prog(t, cur.end - 0.06, cur.end));

  const lines = layout(ctx, tokens(cur.text), STYLE.size);
  const lh = STYLE.size + STYLE.lineGap;
  const boxW = Math.max(...lines.map((l) => l.w)) + STYLE.padX * 2;
  const boxH = lines.length * lh - STYLE.lineGap + STYLE.padY * 2;
  const cx = 540, cy = LAYOUT.subtitles;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
  rrect(ctx, cx - boxW / 2, cy - boxH / 2, boxW, boxH, 26);
  ctx.fillStyle = 'rgba(8,8,12,0.72)'; ctx.fill();
  ctx.font = font(STYLE.size, STYLE.weight);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  lines.forEach((l, i) => {
    let x = cx - l.w / 2;
    const y = cy - boxH / 2 + STYLE.padY + i * lh + STYLE.size / 2 + 2;
    for (const tk of l.toks) {
      ctx.fillStyle = tk.accent ? COLORS.gold : COLORS.white;
      ctx.fillText(tk.w.toUpperCase(), x, y);
      x += tk.tw;
    }
  });
  ctx.restore();
}
