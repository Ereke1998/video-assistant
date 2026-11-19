// Композиция: по абсолютному времени T рисует один кадр. Детерминированно — для рендера по кадрам.
import { VIDEO } from '../config/video.config.js';
import { SCENES } from '../config/timeline.config.js';
import { drawBackground } from './layers/background.js';
import { drawHud } from './layers/hud.js';
import { drawSubtitles } from './layers/subtitles.js';
import { drawHook, hookCamera } from './scenes/hook.js';
import { drawIntro } from './scenes/intro.js';
import { drawWhat } from './scenes/what.js';
import { drawTwist } from './scenes/twist.js';
import { drawExample } from './scenes/example.js';
import { drawCode } from './scenes/code.js';
import { drawFinale } from './scenes/finale.js';
import { shake, prog } from './lib/easing.js';

const DRAW = { hook: drawHook, intro: drawIntro, what: drawWhat, twist: drawTwist, example: drawExample, code: drawCode, finale: drawFinale };

export function sceneAt(T) {
  return SCENES.find((s) => T >= s.start && T < s.end) || SCENES[SCENES.length - 1];
}

const sumShakes = (t, list) => list.reduce(([x, y], [at, amp], i) => { const [a, b] = shake(t, at, amp, 0.3, i + 3); return [x + a, y + b]; }, [0, 0]);

export function renderFrame(ctx, T, data) {
  const sc = sceneAt(T);
  const t = T - sc.start;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);

  // золотая подсветка фона на ударных моментах
  let gold = 0;
  if (sc.id === 'twist') gold = prog(t, sc.anim.slamAt, sc.anim.slamAt + 0.1) * (1 - prog(t, sc.anim.slamAt + 0.4, 4.4));
  if (sc.id === 'code') gold = 0.6 * prog(t, sc.anim.plateAt, sc.anim.plateAt + 0.1) * (1 - prog(t, sc.anim.plateAt + 0.3, 4.6));
  if (sc.id === 'finale') gold = 0.4 * prog(t, sc.anim.cardAt, sc.anim.cardAt + 0.2) * (1 - prog(t, 3.4, 4.2));
  drawBackground(ctx, T, { gold });

  // камера: зум/тряска
  ctx.save();
  let zoom = 1, sx = 0, sy = 0;
  if (sc.id === 'hook') { const cam = hookCamera(t, sc); zoom = cam.zoom; [sx, sy] = sumShakes(t, cam.shakes); }
  if (sc.id === 'what') [sx, sy] = sumShakes(t, [[sc.anim.plateAt, 8]]);
  if (sc.id === 'twist') [sx, sy] = sumShakes(t, [[sc.anim.slamAt, sc.anim.shakeAmp]]);
  if (sc.id === 'code') [sx, sy] = sumShakes(t, [[sc.anim.plateAt, 9]]);
  if (sc.id === 'finale') [sx, sy] = sumShakes(t, [[sc.anim.cardAt, 8]]);
  // лёгкий punch-in на слэме «ВИДЕОМОНТАЖ»
  if (sc.id === 'twist') zoom = 1 + 0.06 * prog(t, sc.anim.slamAt, sc.anim.slamAt + 0.08) * (1 - prog(t, sc.anim.slamAt + 0.08, sc.anim.slamAt + 0.6));
  ctx.translate(540 + sx, 960 + sy); ctx.scale(zoom, zoom); ctx.translate(-540, -960);
  DRAW[sc.id](ctx, t, sc, T);
  ctx.restore();

  drawHud(ctx, T);
  if (T < VIDEO.duration - 0.45) drawSubtitles(ctx, T, data.subs);
}
