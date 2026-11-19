// Экспорт пословных субтитров в out/subtitles.srt
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {WORDS, FPS} = await import(path.join(root, 'src/data/script.ts'));

const ts = (frame) => {
  const ms = Math.round((frame / FPS) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
};

const srt = WORDS.map((w, i) => `${i + 1}\n${ts(w.start)} --> ${ts(w.end)}\n${w.text}\n`).join('\n');
fs.mkdirSync(path.join(root, 'out'), {recursive: true});
fs.writeFileSync(path.join(root, 'out/subtitles.srt'), srt);
console.log(`out/subtitles.srt: ${WORDS.length} слов`);
