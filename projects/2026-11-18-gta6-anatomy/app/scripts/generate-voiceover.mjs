#!/usr/bin/env node
/**
 * Озвучка актов через ElevenLabs (TTS with-timestamps) → public/audio/actN.mp3 + actN.alignment.json
 *
 *   npm run voice                 # сгенерировать недостающие/изменённые акты
 *   npm run voice -- --force      # перегенерировать всё
 *   npm run voice -- --act=2      # только акт 2
 *
 * ENV:
 *   ELEVENLABS_API_KEY   ключ (в облачной среде подставляется прокси автоматически)
 *   VOICE_ID / MODEL_ID  переопределить голос/модель из src/data/script.ts
 *   VOICE_SPEED          0.7–1.2, темп речи на стороне ElevenLabs
 *   VOICE_TEMPO          доп. ускорение ffmpeg atempo без смены тона (по умолч. VOICE.tempo)
 *   OUTPUT_FORMAT        mp3_44100_128 (по умолчанию; 192 kbps — с тарифа Creator)
 *
 * Кэш: в alignment.json хранится хэш текста+настроек — неизменённые акты не тратят кредиты.
 */
import './proxy-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ACTS, VOICE} from '../src/data/script.ts';
import {parseMarkup} from '../src/data/markup.ts';
import {buildTimeline} from './build-timeline.mjs';
import {loudnormFile} from './audio-norm.mjs';

const VOICE_LUFS = -16;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO_DIR = path.join(ROOT, 'public/audio');
const API = 'https://api.elevenlabs.io/v1';

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyAct = Number(args.find((a) => a.startsWith('--act='))?.split('=')[1] ?? 0);

const voiceId = process.env.VOICE_ID || VOICE.voiceId;
const modelId = process.env.MODEL_ID || VOICE.modelId;
const settings = {...VOICE.settings, ...(process.env.VOICE_SPEED ? {speed: Number(process.env.VOICE_SPEED)} : {})};
const apiKey = process.env.ELEVENLABS_API_KEY || 'proxy-injected';

fs.mkdirSync(AUDIO_DIR, {recursive: true});

async function tts(text, previousText, nextText) {
  const url = `${API}/text-to-speech/${voiceId}/with-timestamps?output_format=${process.env.OUTPUT_FORMAT || 'mp3_44100_128'}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'xi-api-key': apiKey},
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: settings,
        previous_text: previousText || undefined,
        next_text: nextText || undefined,
        language_code: modelId.includes('multilingual') ? undefined : 'ru',
      }),
    });
    if (res.ok) return res.json();
    const body = await res.text();
    if (res.status === 402) {
      throw new Error(`ElevenLabs 402: голос/функция недоступны на текущем тарифе. ${body}`);
    }
    if (attempt === 3 || res.status < 500) throw new Error(`ElevenLabs ${res.status}: ${body}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
}

const parsedActs = ACTS.map((a) => ({act: a, parsed: parseMarkup(a.text)}));
let generated = 0;

const tempo = Number(process.env.VOICE_TEMPO || VOICE.tempo || 1);

/** Ускорение без смены тона (ffmpeg atempo) + нормализация −16 LUFS + пересчёт таймстемпов */
function applyTempo(rawMp3, rawAlign, outMp3, outAlign) {
  if (Math.abs(tempo - 1) < 1e-3) {
    fs.copyFileSync(rawMp3, outMp3);
  } else {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', rawMp3, '-filter:a', `atempo=${tempo}`, '-c:a', 'libmp3lame', '-b:a', '192k', outMp3]);
  }
  loudnormFile(outMp3, VOICE_LUFS, -1.5); // голос — опорный уровень микса
  const raw = JSON.parse(fs.readFileSync(rawAlign, 'utf8'));
  const scale = (arr) => arr.map((t) => Math.round((t / tempo) * 1000) / 1000);
  const alignment = {
    characters: raw.alignment.characters,
    character_start_times_seconds: scale(raw.alignment.character_start_times_seconds),
    character_end_times_seconds: scale(raw.alignment.character_end_times_seconds),
  };
  fs.writeFileSync(outAlign, JSON.stringify({...raw, tempo, alignment}));
  return alignment.character_end_times_seconds.at(-1);
}

for (let i = 0; i < parsedActs.length; i++) {
  const {act, parsed} = parsedActs[i];
  if (onlyAct && act.id !== onlyAct) continue;

  // «сырые» ответы API кэшируются отдельно: смена VOICE_TEMPO не тратит кредиты
  const rawMp3 = path.join(AUDIO_DIR, `act${act.id}.raw.mp3`);
  const rawAlign = path.join(AUDIO_DIR, `act${act.id}.raw.json`);
  const mp3 = path.join(AUDIO_DIR, `act${act.id}.mp3`);
  const alignFile = path.join(AUDIO_DIR, `act${act.id}.alignment.json`);
  const hash = crypto
    .createHash('sha1')
    .update(JSON.stringify({t: parsed.spoken, voiceId, modelId, settings}))
    .digest('hex')
    .slice(0, 12);

  let cached = false;
  if (!force && fs.existsSync(rawMp3) && fs.existsSync(rawAlign)) {
    cached = JSON.parse(fs.readFileSync(rawAlign, 'utf8')).hash === hash;
  }

  if (cached) {
    console.log(`Акт ${act.roman}: озвучка из кэша (${hash})`);
  } else {
    console.log(`Акт ${act.roman}: озвучка ${parsed.spoken.length} симв., голос ${voiceId}, модель ${modelId}…`);
    const prevText = parsedActs[i - 1]?.parsed.spoken.slice(-300);
    const nextText = parsedActs[i + 1]?.parsed.spoken.slice(0, 300);
    const data = await tts(parsed.spoken, prevText, nextText);
    fs.writeFileSync(rawMp3, Buffer.from(data.audio_base64, 'base64'));
    fs.writeFileSync(
      rawAlign,
      JSON.stringify({hash, voiceId, modelId, settings, text: parsed.spoken, alignment: data.alignment}),
    );
    generated++;
  }

  const endT = applyTempo(rawMp3, rawAlign, mp3, alignFile);
  console.log(
    `  → ${path.relative(ROOT, mp3)} (${endT.toFixed(2)} с, ${(parsed.spokenWords.length / endT).toFixed(2)} слов/с, tempo ×${tempo})`,
  );
}

console.log(`Готово: новых запросов к API — ${generated}.`);
buildTimeline();
