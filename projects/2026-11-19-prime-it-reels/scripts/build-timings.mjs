// Равномерно (с весом по длине слова) распределяет слова внутри окна каждой сцены
// и записывает результат в src/data/script.ts между маркерами WORDS.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'src/data/script.ts');
const {SCENES, FPS} = await import(file);

const words = [];
for (const s of SCENES) {
  const tokens = s.text.split(/\s+/).filter((t) => t && !/^[—–-]+$/.test(t));
  const weights = tokens.map((t) => t.replace(/[^\p{L}\p{N}]/gu, '').length + 3);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const startF = Math.round(s.subsFrom * FPS);
  const endF = Math.round(s.subsTo * FPS);
  const span = endF - startF;
  tokens.forEach((t, i) => {
    const a = startF + Math.round((acc / total) * span);
    acc += weights[i];
    const b = startF + Math.round((acc / total) * span);
    words.push({text: t, start: a, end: b, scene: s.id});
  });
}

const literal =
  'export const WORDS: Word[] = [\n' +
  words
    .map((w) => `  {text: ${JSON.stringify(w.text)}, start: ${w.start}, end: ${w.end}, scene: '${w.scene}'},`)
    .join('\n') +
  '\n];';
const src = fs.readFileSync(file, 'utf8');
const out = src.replace(/(\/\/ <WORDS:BEGIN>\n)[\s\S]*?(\n\/\/ <WORDS:END>)/, `$1${literal}$2`);
fs.writeFileSync(file, out);
console.log(`Записано ${words.length} слов в src/data/script.ts`);
