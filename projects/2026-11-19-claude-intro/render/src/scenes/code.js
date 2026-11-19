// Сцена 6 [0:28–0:32.8] — Claude Code: терминал печатает команду, по пунктам выполняет работу, плашка «АВТОМАТИЗАЦИЯ».
import { COLORS, FONT } from '../../config/video.config.js';
import { text, card, withTransform, rrect, check, font } from '../lib/draw.js';
import { prog, ease } from '../lib/easing.js';
import { slam, plate, sceneMotion } from './common.js';

const MONO = '"DejaVu Sans Mono", "JetBrains Mono", Menlo, Consolas, monospace';

export function drawCode(ctx, t, sc) {
  const A = sc.anim, O = sc.onScreen, dur = sc.end - sc.start;
  const m = sceneMotion(t, dur);

  withTransform(ctx, { x: 540, y: 900, alpha: m.alpha, dy: m.dy }, () => {
    const h = ease.outBack(prog(t, A.headIn, A.headIn + 0.3), 1.8);
    withTransform(ctx, { x: 540, y: 380, scale: h, alpha: Math.min(1, h) }, () => {
      ctx.save(); ctx.shadowColor = 'rgba(255,200,61,0.6)'; ctx.shadowBlur = 40;
      text(ctx, O.head, 540, 380, { size: 116, weight: FONT.black, color: COLORS.gold, letter: 2 });
      ctx.restore();
    });

    // окно терминала
    const W = 920, H = 610, x = 80, y = 590;
    const w = ease.outCubic(prog(t, A.termIn, A.termIn + 0.35));
    withTransform(ctx, { x: 540, y: y + H / 2, alpha: w, dy: (1 - w) * 80 }, () => {
      card(ctx, x, y, W, H, { r: 30, fill: 'rgba(8,9,12,0.92)', stroke: 'rgba(255,255,255,0.18)' });
      rrect(ctx, x, y, W, 64, 30); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
      ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 40 + i * 34, y + 32, 11, 0, Math.PI * 2); ctx.fill(); });
      text(ctx, 'terminal — video-assistant', x + W / 2, y + 33, { size: 26, weight: FONT.semi, color: COLORS.muted });

      ctx.font = `600 36px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      let ly = y + 130, lastEnd = 0, cursorX = x + 44, cursorY = ly;
      sc.terminal.forEach((l) => {
        if (t < l.at) return;
        if (l.kind === 'cmd') {
          const n = Math.min(l.text.length, Math.floor((t - l.at) * A.typeCps));
          const prompt = l.text.startsWith('>') ? '' : '$ ';
          const shown = prompt + l.text.slice(0, n);
          ctx.fillStyle = l.text.startsWith('>') ? COLORS.white : COLORS.gold;
          ctx.font = `600 ${l.text.length > 30 ? 30 : 36}px ${MONO}`;
          ctx.fillText(shown, x + 44, ly);
          cursorX = x + 44 + ctx.measureText(shown).width + 6; cursorY = ly;
        } else {
          const k = ease.outBack(prog(t, l.at, l.at + 0.25), 2.2);
          withTransform(ctx, { x: x + 64, y: ly, scale: k }, () => check(ctx, x + 64, ly, 40));
          ctx.globalAlpha *= Math.min(1, prog(t, l.at, l.at + 0.15) * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.font = `500 34px ${MONO}`;
          ctx.fillText(l.text, x + 110, ly);
          ctx.globalAlpha = 1;
          cursorX = null;
        }
        ly += l.kind === 'cmd' ? 70 : 62;
        lastEnd = ly;
      });
      // мигающий курсор
      if (cursorX && Math.floor(t * 3) % 2 === 0) { ctx.fillStyle = COLORS.red; ctx.fillRect(cursorX, cursorY - 20, 18, 40); }
      // прогресс рендера
      const last = sc.terminal.at(-1);
      const p = prog(t, last.at, last.at + 0.9);
      if (p > 0) {
        const by = y + H - 70;
        rrect(ctx, x + 44, by, W - 88, 22, 11); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
        rrect(ctx, x + 44, by, Math.max(22, (W - 88) * ease.outCubic(p)), 22, 11); ctx.fillStyle = COLORS.ok; ctx.fill();
      }
    });

    // плашка «АВТОМАТИЗАЦИЯ» — поверх нижней части терминала
    slam(ctx, t, A.plateAt, 540, 500, () => plate(ctx, O.plate, 540, 500, { size: 76 }), { over: 1.8, rot: -0.03 });
  });
}
