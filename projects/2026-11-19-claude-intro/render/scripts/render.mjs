// Покадровый рендер canvas → ffmpeg (H.264, 1080×1920).
//   node scripts/render.mjs [--fps=30|60] [--workers=4] [--out=out/video.mp4] [--from=0 --to=37]
//   node scripts/render.mjs --stills=0.5,2.8,6.9   → PNG-кадры в build/stills/ (для проверки)
//   --safe  — нарисовать поверх безопасные зоны
// Видео получается без звука; звук подмешивает scripts/mix-audio.mjs (или npm run build).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { serve } from './server.mjs';
import { VIDEO } from '../config/video.config.js';

// require() — чтобы находился и локальный node_modules, и глобальный Playwright (NODE_PATH)
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const fps = +arg('fps', VIDEO.fps);
const workers = +arg('workers', 4);
const from = +arg('from', 0), to = +arg('to', VIDEO.duration);
const out = join(ROOT, arg('out', `build/video-${fps}fps.mp4`));
const stills = arg('stills', '');
const safe = process.argv.includes('--safe');

const { srv, url } = await serve();
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
async function openPage() {
  const page = await browser.newPage({ viewport: { width: VIDEO.width, height: VIDEO.height } });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  await page.goto(`${url}index.html?render${safe ? '&safe' : ''}`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
  return page;
}
const grab = (page, T) => page.evaluate((T) => { window.renderAt(T); return window.frameData('image/png'); }, T)
  .then((d) => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));

try {
  if (stills) {
    const page = await openPage();
    mkdirSync(join(ROOT, 'build/stills'), { recursive: true });
    for (const s of stills.split(',')) {
      const f = join(ROOT, `build/stills/t${(+s).toFixed(2)}.png`);
      writeFileSync(f, await grab(page, +s));
      console.log(f);
    }
  } else {
    mkdirSync(dirname(out), { recursive: true });
    const first = Math.round(from * fps), last = Math.round(to * fps);
    const total = last - first;
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const pages = await Promise.all(Array.from({ length: workers }, openPage));
    const started = Date.now();
    // Параллельный рендер пачками, запись в ffmpeg строго по порядку
    for (let f = first; f < last; f += workers) {
      const batch = await Promise.all(pages.map((p, i) => (f + i < last ? grab(p, (f + i) / fps) : null)));
      for (const buf of batch) if (buf && !ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      const done = Math.min(total, f - first + workers);
      if (done % (fps * 2) < workers) process.stdout.write(`\r${done}/${total} кадров · ${((Date.now() - started) / 1000).toFixed(0)} с`);
    }
    ff.stdin.end();
    await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error(`ffmpeg exit ${c}`)))));
    console.log(`\nВидео: ${out}`);
  }
} finally {
  await browser.close();
  srv.close();
}
