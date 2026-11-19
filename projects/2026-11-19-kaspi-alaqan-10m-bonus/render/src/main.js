// Точка входа браузера: превью-плеер (index.html) и API для покадрового рендера (window.renderAt).
import { VIDEO, SAFE } from '../config/video.config.js';
import { SCENES } from '../config/timeline.config.js';
import { buildSubtitles } from './lib/subtitles.js';
import { renderFrame, sceneAt } from './composition.js';

const canvas = document.getElementById('c');
canvas.width = VIDEO.width; canvas.height = VIDEO.height;
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const RENDER = params.has('render');

async function loadJson(url) {
  try { const r = await fetch(url); return r.ok ? r.json() : null; } catch { return null; }
}

const alignment = await loadJson('build/vo-alignment.json');
const data = { subs: buildSubtitles(SCENES, alignment) };
await document.fonts.load('900 64px Inter');
await document.fonts.load('800 64px Inter');
await document.fonts.load('600 64px Inter');
await document.fonts.ready;

let showSafe = params.has('safe');
function drawSafeOverlay() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,160,255,0.18)';
  ctx.fillRect(0, 0, VIDEO.width, SAFE.top);
  ctx.fillRect(0, SAFE.bottom, VIDEO.width, VIDEO.height - SAFE.bottom);
  ctx.fillRect(SAFE.right, 1100, VIDEO.width - SAFE.right, SAFE.bottom - 1100);
  ctx.strokeStyle = 'rgba(0,160,255,0.9)'; ctx.setLineDash([12, 10]); ctx.lineWidth = 3;
  ctx.strokeRect(SAFE.left, SAFE.top, SAFE.right - SAFE.left, SAFE.bottom - SAFE.top);
  ctx.restore();
}

window.renderAt = (T) => { renderFrame(ctx, T, data); if (showSafe) drawSafeOverlay(); };
window.frameData = (type = 'image/png', q) => canvas.toDataURL(type, q);
window.subtitles = data.subs;
window.ready = true;

if (!RENDER) {
  const $ = (id) => document.getElementById(id);
  const scrub = $('scrub'), info = $('info'), audio = $('audio');
  let playing = false, t0 = 0, base = 0;
  audio.src = 'build/mix.wav';
  const now = () => (playing ? base + (performance.now() - t0) / 1000 : +scrub.value);
  function tick() {
    let T = now();
    if (T >= VIDEO.duration) { T = VIDEO.duration - 1e-3; playing = false; audio.pause(); }
    scrub.value = T;
    window.renderAt(T);
    const s = sceneAt(T);
    info.textContent = `${T.toFixed(2)} s · ${s.title}`;
    requestAnimationFrame(tick);
  }
  $('play').onclick = () => {
    playing = !playing;
    if (playing) { base = +scrub.value; t0 = performance.now(); audio.currentTime = base; audio.play().catch(() => {}); }
    else audio.pause();
  };
  scrub.oninput = () => { playing = false; audio.pause(); };
  $('safe').onchange = (e) => { showSafe = e.target.checked; };
  $('safe').checked = showSafe;
  SCENES.forEach((s) => {
    const b = document.createElement('button');
    b.textContent = `${s.start}s ${s.title}`;
    b.onclick = () => { playing = false; audio.pause(); scrub.value = s.start; };
    $('jumps').append(b);
  });
  tick();
}
