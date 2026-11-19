// Распределяет слова внутри каждой фразы CHUNKS (вес — длина слова)
// и записывает пословные тайминги WORDS в src/data/script.ts.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'src/data/script.ts');
const {CHUNKS, FPS} = await import(file);

const words = [];
for (const c of CHUNKS) {
  const tokens = c.text.split(/\s+/).filter((t) => t && !/^[—–-]+$/.test(t));
  const weights = tokens.map((t) => t.replace(/[^\p{L}\p{N}]/gu, '').length + 3);
  const total = weights.reduce((a, b) => a + b, 0);
  const a0 = Math.round(c.from * FPS);
  const span = Math.round(c.to * FPS) - a0;
  let acc = 0;
  tokens.forEach((t, i) => {
    const a = a0 + Math.round((acc / total) * span);
    acc += weights[i];
    const b = a0 + Math.round((acc / total) * span);
    words.push({text: t, start: a, end: b, scene: c.scene});
  });
}
const literal =
  'export const WORDS: Word[] = [\n' +
  words.map((w) => `  {text: ${JSON.stringify(w.text)}, start: ${w.start}, end: ${w.end}, scene: '${w.scene}'},`).join('\n') +
  '\n];';
const src = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file, src.replace(/(\/\/ <WORDS:BEGIN>\n)[\s\S]*?(\n\/\/ <WORDS:END>)/, `$1${literal}$2`));
console.log(`Записано ${words.length} слов в src/data/script.ts`);
