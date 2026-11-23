/**
 * Экспорт субтитров (те же тайминги, что в ролике) в SRT.
 * Запуск: npx tsx scripts/export_srt.ts [путь]   (по умолчанию projects/2026-11-23-podumay-sam/subtitles.srt)
 */
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {FPS} from '../src/content';
import {buildCues} from '../src/timeline';
import {ROOT} from './lib';

const out = process.argv[2] ?? path.join(ROOT, 'projects', '2026-11-23-podumay-sam', 'subtitles.srt');
const ts = (frame: number) => {
  const ms = Math.round((frame / FPS) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
};
const srt = buildCues()
  .map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(c.to)}\n${c.text}\n`)
  .join('\n');
writeFileSync(out, srt);
console.log(`Записано: ${out}`);
