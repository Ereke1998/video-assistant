// Генерация озвучки через ElevenLabs (по фразе на файл) + посимвольное выравнивание.
// Результат:
//   assets/vo/<scene>-<n>.mp3       — сырой синтез фразы (кэш; пересинтез только при смене текста)
//   build/vo/<scene>-<n>.fit.wav    — обрезанная тишина + atempo, если фраза не влезает в окно
//   build/vo-alignment.json         — слова с абсолютными таймкодами в ролике (для субтитров)
//   build/vo-report.json            — отчёт по хронометражу
//
// Ключ: ELEVENLABS_API_KEY (в облачной сессии Claude ключ подставляет прокси).
// Запуск: node scripts/tts.mjs [--force]

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENES } from '../config/timeline.config.js';
import { VOICEOVER } from '../config/audio.config.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
for (const d of ['assets/vo', 'build/vo']) mkdirSync(join(ROOT, d), { recursive: true });

const probe = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

// Плоский список фраз со своими окнами
const parts = SCENES.flatMap((s) => s.vo.parts.map((p, n) => ({ ...p, scene: s.id, key: `${s.id}-${n + 1}`, sceneEnd: s.end })));
parts.forEach((p, i) => { p.until = Math.min(p.sceneEnd, parts[i + 1]?.at ?? Infinity); });

function synth(p, i) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICEOVER.voiceId}/with-timestamps?output_format=mp3_44100_128`;
  const body = {
    text: p.tts, model_id: VOICEOVER.model, voice_settings: { ...VOICEOVER.settings, ...(p.voice || {}) },
    previous_text: parts[i - 1]?.tts, next_text: parts[i + 1]?.tts,
  };
  const headers = ['-H', 'Content-Type: application/json'];
  if (process.env.ELEVENLABS_API_KEY) headers.push('-H', `xi-api-key: ${process.env.ELEVENLABS_API_KEY}`);
  const out = execFileSync('curl', ['-sS', '--fail-with-body', '-X', 'POST', url, ...headers, '--data-binary', '@-'],
    { input: JSON.stringify(body), maxBuffer: 64 << 20 }).toString();
  return JSON.parse(out);
}

function toWords(al) {
  const words = []; let cur = null;
  al.characters.forEach((ch, k) => {
    if (/[\p{L}\p{N}+]/u.test(ch)) {
      cur ??= { w: '', start: al.character_start_times_seconds[k] };
      cur.w += ch; cur.end = al.character_end_times_seconds[k];
    } else if (cur) { words.push(cur); cur = null; }
  });
  if (cur) words.push(cur);
  return words;
}

const cachePath = join(ROOT, 'assets/vo/vo-cache.json');
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
const report = []; const alignment = [];

parts.forEach((p, i) => {
  // Готовая запись (выбранный дубль, свой голос): не синтезируем, берём файл как есть.
  // p.words — слова с таймкодами внутри файла (для субтитров и синхронизации анимации).
  if (p.file) {
    const fit = join(ROOT, `build/vo/${p.key}.fit.wav`);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(ROOT, p.file), '-ar', '48000', '-ac', '1', fit]);
    const dur = probe(fit);
    p.words.forEach((w) => alignment.push({ scene: p.scene, part: p.key, w: w.w, start: +(p.at + w.start).toFixed(3), end: +(p.at + w.end).toFixed(3) }));
    const window = p.until - p.at - VOICEOVER.tailGap;
    report.push({ part: p.key, at: p.at, window: +window.toFixed(2), raw: +dur.toFixed(2), tempo: 1, ends: +(p.at + dur).toFixed(2), overflow: +Math.max(0, dur - window).toFixed(2) });
    return;
  }
  const mp3 = join(ROOT, `assets/vo/${p.key}.mp3`);
  const vkey = JSON.stringify({ ...VOICEOVER.settings, ...(p.voice || {}) });
  if (force || !existsSync(mp3) || cache[p.key]?.tts !== p.tts || (cache[p.key]?.voice && cache[p.key].voice !== vkey) || (!cache[p.key]?.voice && p.voice)) {
    process.stdout.write(`TTS ${p.key}… `);
    const res = synth(p, i);
    writeFileSync(mp3, Buffer.from(res.audio_base64, 'base64'));
    cache[p.key] = { tts: p.tts, voice: vkey, alignment: res.alignment };
    writeFileSync(cachePath, JSON.stringify(cache));
    console.log('ok');
  }
  const words = toWords(cache[p.key].alignment);
  const head = Math.max(0, words[0].start - 0.03);
  const tail = words.at(-1).end + 0.12;
  const trimmed = join(ROOT, `build/vo/${p.key}.trim.wav`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', mp3, '-af', `atrim=${head}:${tail},asetpts=PTS-STARTPTS,afade=t=out:st=${(tail - head - 0.06).toFixed(3)}:d=0.06`,
    '-ar', '48000', '-ac', '1', trimmed]);
  const raw = probe(trimmed);
  const window = p.until - p.at - VOICEOVER.tailGap;
  const tempo = Math.min(VOICEOVER.maxTempo, Math.max(1, raw / window));
  const fit = join(ROOT, `build/vo/${p.key}.fit.wav`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', trimmed, '-af', `atempo=${tempo.toFixed(4)}`, fit]);
  const dur = probe(fit);
  words.forEach((w) => alignment.push({
    scene: p.scene, part: p.key, w: w.w,
    start: +(p.at + (w.start - head) / tempo).toFixed(3),
    end: +(p.at + (w.end - head) / tempo).toFixed(3),
  }));
  report.push({ part: p.key, at: p.at, window: +window.toFixed(2), raw: +raw.toFixed(2), tempo: +tempo.toFixed(3), ends: +(p.at + dur).toFixed(2), overflow: +Math.max(0, dur - window).toFixed(2) });
});

writeFileSync(join(ROOT, 'build/vo-alignment.json'), JSON.stringify(alignment, null, 1));
writeFileSync(join(ROOT, 'build/vo-parts.json'), JSON.stringify(parts.map((p) => ({ key: p.key, at: p.at, file: `build/vo/${p.key}.fit.wav` })), null, 2));
writeFileSync(join(ROOT, 'build/vo-report.json'), JSON.stringify(report, null, 2));
console.table(report);
const bad = report.filter((r) => r.overflow > 0.05);
if (bad.length) console.warn(`⚠ Фразы не влезают в окно даже при ${VOICEOVER.maxTempo}×: ${bad.map((b) => b.part).join(', ')} — сократите текст.`);
