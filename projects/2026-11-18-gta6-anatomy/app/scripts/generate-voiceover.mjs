#!/usr/bin/env node
/**
 * Озвучка актов → public/audio/actN.mp3 + actN.alignment.json (таймстемпы символов для синхронизации)
 *
 * Движок задаётся VOICE.provider в src/data/script.ts (или ENV TTS_PROVIDER):
 *   piper       — локальный русский TTS (нативное произношение, бесплатно) + forced alignment ElevenLabs
 *   elevenlabs  — ElevenLabs TTS with-timestamps (русские голоса из библиотеки — только на платном тарифе)
 *
 *   npm run voice                 # сгенерировать недостающие/изменённые акты
 *   npm run voice -- --force      # перегенерировать всё
 *   npm run voice -- --act=2      # только акт 2
 *
 * ENV:
 *   TTS_PROVIDER         piper | elevenlabs
 *   ELEVENLABS_API_KEY   ключ (в облачной среде подставляется прокси автоматически)
 *   VOICE_ID / MODEL_ID  голос/модель ElevenLabs
 *   VOICE_TEMPO          ускорение ffmpeg atempo без смены тона (по умолч. VOICE.tempo)
 *   PYTHON               интерпретатор с установленным piper-tts (по умолч. python3)
 *
 * Ударения: в тексте озвучки «+» перед ударной гласной (Piper): [Xbox Series|иксбокс с+ириес].
 * Кэш: «сырой» синтез и выравнивание хранятся с хэшем текста+настроек — повторный запуск бесплатен.
 */
import './proxy-env.mjs';
import fs from 'node:fs';
import os from 'node:os';
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
const MODELS_DIR = path.join(ROOT, 'models');
const API = 'https://api.elevenlabs.io/v1';

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyAct = Number(args.find((a) => a.startsWith('--act='))?.split('=')[1] ?? 0);

const provider = process.env.TTS_PROVIDER || VOICE.provider;
const apiKey = process.env.ELEVENLABS_API_KEY || 'proxy-injected';
const tempo = Number(process.env.VOICE_TEMPO || VOICE.tempo || 1);

fs.mkdirSync(AUDIO_DIR, {recursive: true});

// ---------------------------------------------------------------- ElevenLabs TTS
const el = {
  voiceId: process.env.VOICE_ID || VOICE.elevenlabs.voiceId,
  modelId: process.env.MODEL_ID || VOICE.elevenlabs.modelId,
  settings: VOICE.elevenlabs.settings,
};

async function elevenTts(text, previousText, nextText, outFile) {
  const url = `${API}/text-to-speech/${el.voiceId}/with-timestamps?output_format=mp3_44100_128`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'xi-api-key': apiKey},
      body: JSON.stringify({
        text,
        model_id: el.modelId,
        voice_settings: el.settings,
        previous_text: previousText || undefined,
        next_text: nextText || undefined,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      fs.writeFileSync(outFile, Buffer.from(data.audio_base64, 'base64'));
      return data.alignment;
    }
    const body = await res.text();
    if (res.status === 402) throw new Error(`ElevenLabs 402: голос недоступен на текущем тарифе. ${body}`);
    if (attempt === 3 || res.status < 500) throw new Error(`ElevenLabs ${res.status}: ${body}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
}

// ---------------------------------------------------------------- Piper (локально)
async function ensurePiperModel() {
  const onnx = path.join(MODELS_DIR, `${VOICE.piper.model}.onnx`);
  if (fs.existsSync(onnx) && fs.existsSync(`${onnx}.json`)) return onnx;
  fs.mkdirSync(MODELS_DIR, {recursive: true});
  console.log(`Скачиваю модель Piper ${VOICE.piper.model}…`);
  const res = await fetch(VOICE.piper.url);
  if (!res.ok) throw new Error(`Не удалось скачать модель: ${res.status} ${VOICE.piper.url}`);
  const tgz = path.join(MODELS_DIR, 'model.tar.gz');
  fs.writeFileSync(tgz, Buffer.from(await res.arrayBuffer()));
  execFileSync('tar', ['xzf', tgz, '-C', MODELS_DIR]);
  fs.unlinkSync(tgz);
  return onnx;
}

function piperTts(ttsText, outFile, model) {
  const tmp = path.join(os.tmpdir(), `vo-${process.pid}.txt`);
  fs.writeFileSync(tmp, ttsText);
  const p = VOICE.piper;
  try {
    execFileSync(
      process.env.PYTHON || 'python3',
      [
        path.join(ROOT, 'scripts/piper_tts.py'),
        '--model', model,
        '--text-file', tmp,
        '--out', outFile,
        '--length-scale', String(p.lengthScale),
        '--noise-scale', String(p.noiseScale),
        '--noise-w', String(p.noiseW),
        '--pause', String(p.pause),
        '--pause-question', String(p.pauseQuestion),
        '--pause-colon', String(p.pauseColon),
      ],
      {stdio: ['ignore', 'pipe', 'inherit']},
    );
  } catch (e) {
    throw new Error('Piper не запустился. Установите: pip install piper-tts', {cause: e});
  }
  fs.unlinkSync(tmp);
}

// ---------------------------------------------------------------- Forced alignment (ElevenLabs, есть на free)
async function forcedAlign(audioFile, text) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(audioFile)]), path.basename(audioFile));
  form.append('text', text);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${API}/forced-alignment`, {method: 'POST', headers: {'xi-api-key': apiKey}, body: form});
    if (res.ok) return toCharAlignment(await res.json(), text);
    const body = await res.text();
    if (attempt === 3 || res.status < 500) throw new Error(`Forced alignment ${res.status}: ${body}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
}

/** Приводим ответ к формату ElevenLabs TTS: символы исходного текста + start/end каждого */
function toCharAlignment(fa, text) {
  const chars = [...text];
  const joined = fa.characters.map((c) => c.text).join('');
  if (joined === text) {
    return {
      characters: chars,
      character_start_times_seconds: fa.characters.map((c) => c.start),
      character_end_times_seconds: fa.characters.map((c) => c.end),
    };
  }
  // запасной путь: по словам (пробелы — разделители), символы внутри слова — пропорционально
  const st = new Array(chars.length).fill(0);
  const en = new Array(chars.length).fill(0);
  const words = fa.words.filter((w) => w.text.trim());
  const re = /\S+/g;
  let m;
  let wi = 0;
  let lastEnd = 0;
  while ((m = re.exec(text))) {
    const w = words[wi++] ?? {start: lastEnd, end: lastEnd};
    for (let k = 0; k < m[0].length; k++) {
      const i = m.index + k;
      st[i] = w.start + ((w.end - w.start) * k) / m[0].length;
      en[i] = w.start + ((w.end - w.start) * (k + 1)) / m[0].length;
    }
    lastEnd = w.end;
  }
  for (let i = 0; i < chars.length; i++) if (/\s/.test(chars[i])) st[i] = en[i] = i > 0 ? en[i - 1] : 0;
  return {characters: chars, character_start_times_seconds: st, character_end_times_seconds: en};
}

// ---------------------------------------------------------------- пост-обработка
/** atempo (если ≠ 1) + нормализация −16 LUFS + пересчёт таймстемпов */
function finalize(rawAudio, rawAlign, outMp3, outAlign) {
  const filters = [];
  if (Math.abs(tempo - 1) > 1e-3) filters.push(`atempo=${tempo}`);
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-i', rawAudio,
    ...(filters.length ? ['-filter:a', filters.join(',')] : []),
    '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k', outMp3,
  ]);
  loudnormFile(outMp3, VOICE_LUFS, -1.5);
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

// ---------------------------------------------------------------- main
const parsedActs = ACTS.map((a) => ({act: a, parsed: parseMarkup(a.text)}));
const piperModel = provider === 'piper' ? await ensurePiperModel() : null;
const params = provider === 'piper' ? {provider, ...VOICE.piper} : {provider, ...el};
let generated = 0;

for (let i = 0; i < parsedActs.length; i++) {
  const {act, parsed} = parsedActs[i];
  if (onlyAct && act.id !== onlyAct) continue;

  const ext = provider === 'piper' ? 'wav' : 'mp3';
  const rawAudio = path.join(AUDIO_DIR, `act${act.id}.raw.${ext}`);
  const rawAlign = path.join(AUDIO_DIR, `act${act.id}.raw.json`);
  const mp3 = path.join(AUDIO_DIR, `act${act.id}.mp3`);
  const alignFile = path.join(AUDIO_DIR, `act${act.id}.alignment.json`);
  const hash = crypto.createHash('sha1').update(JSON.stringify({t: parsed.ttsText, params})).digest('hex').slice(0, 12);

  let cached = false;
  if (!force && fs.existsSync(rawAudio) && fs.existsSync(rawAlign)) {
    cached = JSON.parse(fs.readFileSync(rawAlign, 'utf8')).hash === hash;
  }

  if (cached) {
    console.log(`Акт ${act.roman}: из кэша (${hash})`);
  } else {
    // чистим старые «сырые» файлы другого движка
    for (const e of ['wav', 'mp3']) fs.rmSync(path.join(AUDIO_DIR, `act${act.id}.raw.${e}`), {force: true});
    let alignment;
    if (provider === 'piper') {
      console.log(`Акт ${act.roman}: Piper ${VOICE.piper.model}, ${parsed.spoken.length} симв.…`);
      piperTts(parsed.ttsText, rawAudio, piperModel);
      process.stdout.write('  forced alignment… ');
      alignment = await forcedAlign(rawAudio, parsed.spoken);
      console.log('ок');
    } else {
      console.log(`Акт ${act.roman}: ElevenLabs ${el.voiceId}, ${parsed.spoken.length} симв.…`);
      const prevText = parsedActs[i - 1]?.parsed.spoken.slice(-300);
      const nextText = parsedActs[i + 1]?.parsed.spoken.slice(0, 300);
      alignment = await elevenTts(parsed.spoken, prevText, nextText, rawAudio);
    }
    fs.writeFileSync(rawAlign, JSON.stringify({hash, ...params, text: parsed.spoken, alignment}));
    generated++;
  }

  const endT = finalize(rawAudio, rawAlign, mp3, alignFile);
  console.log(
    `  → ${path.relative(ROOT, mp3)} (${endT.toFixed(2)} с, ${(parsed.spokenWords.length / endT).toFixed(2)} слов/с)`,
  );
}

console.log(`Готово: синтезировано актов — ${generated}.`);
buildTimeline();
