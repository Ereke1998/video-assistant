#!/usr/bin/env node
/**
 * SFX и музыкальный луп через ElevenLabs Sound Effects → public/sfx/<name>.mp3, public/audio/music.mp3
 *
 *   npm run sfx               # только недостающие файлы
 *   npm run sfx -- --force    # перегенерировать всё
 *   npm run sfx -- --only=impact,whoosh
 *   npm run sfx -- --normalize-only   # только выровнять громкость существующих файлов
 *
 * Свои звуки: просто положите public/sfx/<name>.mp3 (имена — в SFX_PROMPTS, src/data/script.ts)
 * и/или свой трек public/audio/music.mp3 — они имеют приоритет и не перезаписываются без --force.
 */
import './proxy-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SFX_PROMPTS} from '../src/data/script.ts';
import {buildTimeline} from './build-timeline.mjs';
import {loudnormFile, peakNormFile} from './audio-norm.mjs';

/** Опорные уровни микса: музыка −20 LUFS, SFX — пик −3 dBFS (громкость дальше задаётся в script.ts) */
function normalize(name, file) {
  if (name === 'music') {
    const was = loudnormFile(file, -20, -1.5);
    console.log(`  ${name}: ${was} LUFS → −20 LUFS`);
  } else {
    // переходные шумовые звуки: срезаем резкие верха
    const soft = ['whoosh', 'glitch', 'riser'].includes(name) ? 'lowpass=f=6500,highpass=f=60' : '';
    const was = peakNormFile(file, -3, soft);
    console.log(`  ${name}: пик ${was} dBFS → −3 dBFS`);
  }
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const force = args.includes('--force');
const normalizeOnly = args.includes('--normalize-only');
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1]?.split(',');
const apiKey = process.env.ELEVENLABS_API_KEY || 'proxy-injected';

for (const [name, cfg] of Object.entries(SFX_PROMPTS)) {
  if (only && !only.includes(name)) continue;
  const out = name === 'music' ? path.join(ROOT, 'public/audio/music.mp3') : path.join(ROOT, `public/sfx/${name}.mp3`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  if (normalizeOnly || (!force && fs.existsSync(out))) {
    if (fs.existsSync(out)) normalize(name, out);
    else console.log(`${name}: нет файла`);
    continue;
  }
  process.stdout.write(`${name}: генерация ${cfg.duration} с… `);
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'xi-api-key': apiKey},
    body: JSON.stringify({
      text: cfg.prompt,
      duration_seconds: cfg.duration,
      prompt_influence: 0.6,
      model_id: 'eleven_text_to_sound_v2',
      ...(cfg.loop ? {loop: true} : {}),
    }),
  });
  if (!res.ok) {
    console.log(`ошибка ${res.status}: ${(await res.text()).slice(0, 200)}`);
    continue;
  }
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(`→ ${path.relative(ROOT, out)}`);
  normalize(name, out);
}

buildTimeline();
