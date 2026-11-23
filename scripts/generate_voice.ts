/**
 * Озвучка через ElevenLabs Text to Speech.
 *   POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128
 *   headers: xi-api-key
 *   body:    { text, model_id, voice_settings }
 *
 * Запуск:  npx tsx scripts/generate_voice.ts            — все реплики
 *          npx tsx scripts/generate_voice.ts --only 1   — одна сцена
 *          npx tsx scripts/generate_voice.ts --only 1 --model eleven_multilingual_v2 --stability 0.3 --suffix test
 *
 * Ключ: ELEVENLABS_API_KEY, голос: ELEVENLABS_VOICE_ID (из окружения или .env).
 */
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {VOICE_LINES} from '../src/content';
import {API_BASE, argValue, getApiKey, postAudio, probeDuration, saveFile, updateManifest, LOUDNESS_TARGET, normalizeLoudness} from './lib';

async function listVoices() {
  const res = await fetch(`${API_BASE}/v1/voices`, {headers: {'xi-api-key': getApiKey()}});
  if (!res.ok) throw new Error(`GET /v1/voices → HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    voices: {voice_id: string; name: string; category: string; labels?: Record<string, string>}[];
  };
  console.log('\nELEVENLABS_VOICE_ID не задан. Доступные голоса:\n');
  for (const v of data.voices) {
    const l = v.labels ?? {};
    console.log(`  ${v.voice_id}  ${v.name}  [${l.language ?? '?'}, ${l.gender ?? '?'}, ${v.category}]`);
  }
  console.log('\nВыберите голос и задайте: export ELEVENLABS_VOICE_ID=<voice_id> (или пропишите в .env).');
}

/**
 * Тайминги слов для субтитров: POST /v1/forced-alignment (multipart: file + text).
 * Аудио не меняется — только измеряется, где звучит каждое слово.
 */
async function alignWords(absPath: string, text: string): Promise<{text: string; start: number; end: number}[] | undefined> {
  try {
    const form = new FormData();
    form.append('file', new Blob([readFileSync(absPath)], {type: 'audio/mpeg'}), path.basename(absPath));
    form.append('text', text);
    const res = await fetch(`${API_BASE}/v1/forced-alignment`, {
      method: 'POST',
      headers: {'xi-api-key': getApiKey()},
      body: form,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as {words: {text: string; start: number; end: number}[]};
    return data.words
      .filter((w) => w.text.trim().length > 0)
      .map((w) => ({text: w.text.trim(), start: +w.start.toFixed(3), end: +w.end.toFixed(3)}));
  } catch (e) {
    console.warn(`  (выравнивание не удалось, субтитры будут распределены пропорционально: ${(e as Error).message})`);
    return undefined;
  }
}

async function main() {
  getApiKey();
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) {
    await listVoices();
    process.exit(2);
  }

  const only = argValue('only');
  const modelOverride = argValue('model');
  const suffix = argValue('suffix');
  const lines = VOICE_LINES.filter((l) => !only || String(l.scene) === only);

  const failed: string[] = [];
  for (const line of lines) {
    const modelId = modelOverride ?? line.modelId;
    // Аудиотеги вида [whispers] понимают eleven_v3 / eleven_v4 — для остальных моделей их вырезаем.
    const supportsTags = /^eleven_v[34]/.test(modelId);
    const text = supportsTags ? line.ttsText : line.ttsText.replace(/\[[^\]]+\]\s*/g, '');
    const stability = argValue('stability');
    const voice_settings = stability ? {...line.voiceSettings, stability: parseFloat(stability)} : line.voiceSettings;
    const file = suffix ? line.file.replace('.mp3', `-${suffix}.mp3`) : line.file;

    process.stdout.write(`Сцена ${line.scene} → ${file} (${modelId}) … `);
    try {
      const audio = await postAudio(
        `/v1/text-to-speech/${voiceId}`,
        {text, model_id: modelId, voice_settings},
        {output_format: 'mp3_44100_128'},
      );
      const abs = saveFile(file, audio);
      const dur = probeDuration(abs);
      const lv = normalizeLoudness(abs, LOUDNESS_TARGET.voice);
      const words = await alignWords(abs, line.subtitle.replace(/\|/g, ' '));
      updateManifest(file, {
        words,
        durationSeconds: dur,
        loudnessLufs: LOUDNESS_TARGET.voice,
        meanDb: lv?.meanDb,
        maxDb: lv?.maxDb,
        model: modelId,
        generatedAt: new Date().toISOString(),
        ok: true,
      });
      console.log(`ok, ${dur?.toFixed(2) ?? '?'} c`);
    } catch (e) {
      console.log(`ОШИБКА: ${(e as Error).message}`);
      failed.push(file);
    }
  }
  if (failed.length) {
    console.error(`\nНе удалось сгенерировать: ${failed.join(', ')}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
