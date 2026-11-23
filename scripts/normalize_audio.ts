/**
 * Нормализует громкость всех файлов из src/audio-manifest.json (или одного: --only voice-2).
 * Генераторы вызывают нормализацию сами; этот скрипт нужен, если аудио заменили вручную.
 */
import path from 'node:path';
import {LOUDNESS_TARGET, PUBLIC_DIR, argValue, kindOf, normalizeLoudness, readManifest, updateManifest} from './lib';

const only = argValue('only');
const m = readManifest();
for (const [file, entry] of Object.entries(m)) {
  if (only && !file.includes(only)) continue;
  if (entry.note?.startsWith('ЗАГЛУШКА')) continue;
  const target = LOUDNESS_TARGET[kindOf(file)];
  const lv = normalizeLoudness(path.join(PUBLIC_DIR, file), target);
  updateManifest(file, {...entry, meanDb: lv?.meanDb, maxDb: lv?.maxDb, loudnessLufs: target});
  console.log(`${file}: → ${target} LUFS, mean ${lv?.meanDb} dB, max ${lv?.maxDb} dB`);
}
