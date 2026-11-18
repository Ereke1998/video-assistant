#!/usr/bin/env node
/**
 * Финальный рендер: out/gta6_documentary.mp4 (1080×1920, 30 fps, H.264, AAC 320k, −14 LUFS)
 *
 *   npm run render                         # полный рендер в высоком качестве
 *   npm run render -- --draft              # быстрый черновик 540×960
 *   npm run render -- --frames=0-300       # диапазон кадров
 *   npm run render -- --stills=30,600,1200 # PNG-кадры для проверки → out/stills/
 *
 * ENV: REMOTION_CHROME — путь к Chrome/Chromium (иначе Remotion скачает свой headless shell),
 *      CONCURRENCY — число параллельных вкладок.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {PROJECT} from '../src/data/script.ts';
import {buildTimeline} from './build-timeline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'out');
const args = process.argv.slice(2);
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const draft = args.includes('--draft');
const frames = arg('frames')?.split('-').map(Number);
const stills = arg('stills')?.split(',').map(Number);
const noNorm = args.includes('--no-loudnorm');

const chrome =
  process.env.REMOTION_CHROME ||
  ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium/chrome-linux/chrome']
    .flatMap((p) => (fs.existsSync(p) && fs.statSync(p).isDirectory() ? findChrome(p) : fs.existsSync(p) ? [p] : []))
    .at(0);

function findChrome(dir) {
  const hits = [];
  const walk = (d, depth) => {
    if (depth > 4) return;
    for (const e of fs.readdirSync(d, {withFileTypes: true})) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (['chrome', 'chromium', 'headless_shell', 'chrome-headless-shell'].includes(e.name)) hits.push(p);
    }
  };
  walk(dir, 0);
  return hits;
}

const tl = buildTimeline();
if (tl.estimated) console.warn('\n⚠ Нет озвучки — рендер по оценочным таймингам. Запустите: npm run voice\n');

fs.mkdirSync(OUT_DIR, {recursive: true});
console.log('Сборка бандла Remotion…');
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public')});

const common = {
  serveUrl,
  browserExecutable: chrome ?? null,
  chromiumOptions: {gl: 'angle'},
  logLevel: 'warn',
};
const composition = await selectComposition({...common, id: 'GTA6Documentary'});
console.log(`Композиция: ${composition.width}×${composition.height}, ${composition.durationInFrames} кадров @ ${composition.fps} fps`);

if (stills) {
  const dir = path.join(OUT_DIR, 'stills');
  fs.mkdirSync(dir, {recursive: true});
  for (const f of stills) {
    const output = path.join(dir, `frame-${String(f).padStart(5, '0')}.png`);
    await renderStill({...common, composition, frame: f, output, scale: draft ? 0.5 : 1});
    console.log(`  → ${path.relative(ROOT, output)}`);
  }
  process.exit(0);
}

const rawOut = path.join(OUT_DIR, draft ? 'draft_raw.mp4' : 'render_raw.mp4');
const finalOut = path.join(OUT_DIR, draft ? 'gta6_documentary_draft.mp4' : PROJECT.output);
let lastPct = -1;
await renderMedia({
  ...common,
  composition,
  codec: 'h264',
  outputLocation: rawOut,
  crf: draft ? 28 : 16,
  x264Preset: draft ? 'veryfast' : 'slow',
  pixelFormat: 'yuv420p',
  colorSpace: 'bt709',
  audioCodec: 'aac',
  audioBitrate: '320k',
  scale: draft ? 0.5 : 1,
  frameRange: frames ? [frames[0], frames[1]] : null,
  concurrency: Number(process.env.CONCURRENCY) || Math.max(1, Math.min(8, os.cpus().length)),
  onProgress: ({progress}) => {
    const pct = Math.floor(progress * 100);
    if (pct !== lastPct && pct % 5 === 0) {
      lastPct = pct;
      process.stdout.write(`\rРендер: ${pct}%   `);
    }
  },
});
console.log('');

if (noNorm) {
  fs.renameSync(rawOut, finalOut);
} else {
  // нормализация громкости под соцсети: −14 LUFS, true peak −1 dBTP (видео копируется без перекодирования)
  console.log('Нормализация громкости (−14 LUFS, −1 dBTP)…');
  const log = execFileSync(
    'sh',
    ['-c', `ffmpeg -hide_banner -i "${rawOut}" -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1`],
  ).toString();
  const m = JSON.parse(log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1));
  const filter = `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', rawOut, '-c:v', 'copy', '-af', filter, '-ar', '48000', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', finalOut]);
  fs.unlinkSync(rawOut);
  console.log(`Громкость: было ${m.input_i} LUFS → −14 LUFS`);
}
console.log(`Готово: ${path.relative(process.cwd(), finalOut)}`);
