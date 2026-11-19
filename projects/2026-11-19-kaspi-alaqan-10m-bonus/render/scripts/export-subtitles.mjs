// Экспорт субтитров (с таймингами по озвучке) в .srt и JSON — для CapCut / Premiere / DaVinci.
//   node scripts/export-subtitles.mjs  → build/subtitles.srt, build/subtitles.json, ../subtitles.srt
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENES } from '../config/timeline.config.js';
import { buildSubtitles, toSrt } from '../src/lib/subtitles.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const al = join(ROOT, 'build/vo-alignment.json');
const subs = buildSubtitles(SCENES, existsSync(al) ? JSON.parse(readFileSync(al, 'utf8')) : null);
writeFileSync(join(ROOT, 'build/subtitles.json'), JSON.stringify(subs, null, 2));
writeFileSync(join(ROOT, 'build/subtitles.srt'), toSrt(subs));
writeFileSync(join(ROOT, '../subtitles.srt'), toSrt(subs));
console.table(subs.map((s) => ({ start: s.start, end: s.end, text: s.text })));
