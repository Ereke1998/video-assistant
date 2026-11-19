// Композиция: по абсолютному времени T рисует один кадр. Детерминированно — для рендера по кадрам.
import { VIDEO } from '../config/video.config.js';
import { SCENES } from '../config/timeline.config.js';
import { drawBackground } from './layers/background.js';
import { drawHud } from './layers/hud.js';
import { drawSubtitles } from './layers/subtitles.js';
import { drawHook, hookCamera } from './scenes/hook.js';
import { drawPromo } from './scenes/promo.js';
import { drawExperiment } from './scenes/experiment.js';
import { drawMechanics } from './scenes/mechanics.js';
import { drawFinale } from './scenes/finale.js';
import { shake, prog } from './lib/easing.js';

const DRAW = { hook: drawHook, promo: drawPromo, experiment: drawExperiment, mechanics: drawMechanics, finale: drawFinale };

export function sceneAt(T) {
  return SCENES.find((s) => T >= s.start && T < s.end) || SCENES[SCENES.length - 1];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} T   абсолютное время, с
 * @param {{subs: Array}} data
 */
export function renderFrame(ctx, T, data) {
  const sc = sceneAt(T);
  const t = T - sc.start;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);

  // золотая подсветка фона на «круглом номере» (сцена 4) и на 10 000 000 (хук)
  let gold = 0;
  if (sc.id === 'hook') gold = prog(t, 2.2, 2.4) * (1 - prog(t, 3.0, 3.9));
  if (sc.id === 'mechanics') gold = prog(t, 2.5, 2.6) * (1 - prog(t, 3.2, 4.4));
  if (sc.id === 'promo') gold = 0.35 * prog(t, 2.85, 3.3) * (1 - prog(t, 7.5, 8));
  drawBackground(ctx, T, { gold });

  // камера: зум/тряска
  ctx.save();
  let zoom = 1, sx = 0, sy = 0;
  if (sc.id === 'hook') {
    const cam = hookCamera(t, sc);
    zoom = cam.zoom;
    [sx, sy] = shake(t, cam.shakeAt, cam.shakeAmp, 0.35);
  }
  if (sc.id === 'mechanics') [sx, sy] = shake(t, sc.anim.ticker.t1, 12, 0.3, 7);
  if (sc.id === 'finale') [sx, sy] = shake(t, 0, 10, 0.25, 9);
  ctx.translate(540 + sx, 960 + sy); ctx.scale(zoom, zoom); ctx.translate(-540, -960);
  DRAW[sc.id](ctx, t, sc, T);
  ctx.restore();

  drawHud(ctx, T);
  if (T < VIDEO.duration - 0.45) drawSubtitles(ctx, T, data.subs);
}
