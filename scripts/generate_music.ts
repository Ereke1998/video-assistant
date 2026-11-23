/**
 * Фоновая музыка через ElevenLabs Music.
 *   POST https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128
 *   body: { model_id: "music_v1", composition_plan: { positive_global_styles, negative_global_styles, sections[] } }
 *
 * Драматургия (40 c): тихий пад → нарастание к сцене 3 → пауза перед фактом 2 (0:20) → сдержанное возвращение →
 * тёплый спад в финале. Секции не короче 3 c (ограничение API).
 *
 * Если эндпоинт недоступен для аккаунта, скрипт создаёт тихую заглушку public/audio/music.mp3 (40 c тишины, ffmpeg)
 * и печатает предупреждение — музыку тогда нужно добавить вручную.
 */
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {MUSIC_FILE} from '../src/content';
import {ApiError, PUBLIC_DIR, postAudio, probeDuration, saveFile, updateManifest, LOUDNESS_TARGET, normalizeLoudness} from './lib';

const NO_VOCALS = ['vocals', 'singing', 'choir', 'lyrics', 'drums', 'percussion', 'guitar'];

const plan = {
  positive_global_styles: [
    'dark ambient synth pad',
    'cinematic',
    'cold, blue, atmospheric',
    'slow evolving textures',
    'instrumental',
    '60 bpm',
  ],
  negative_global_styles: NO_VOCALS,
  sections: [
    {
      section_name: 'Hook',
      positive_local_styles: ['very quiet sustained synth pad', 'sparse', 'intimate', 'soft sub drone'],
      negative_local_styles: ['loud', 'beat'],
      duration_ms: 6000,
      lines: [],
    },
    {
      section_name: 'Fact one build',
      positive_local_styles: ['pad slowly swells', 'shimmering high harmonics', 'growing tension'],
      negative_local_styles: ['beat'],
      duration_ms: 7000,
      lines: [],
    },
    {
      section_name: 'Crowd peak',
      positive_local_styles: ['fullest and loudest part', 'wide detuned synth pad', 'low pulsing bass', 'cold tension'],
      negative_local_styles: [],
      duration_ms: 7000,
      lines: [],
    },
    {
      section_name: 'Pause',
      positive_local_styles: ['sudden drop to near silence', 'only a faint airy tail', 'breath'],
      negative_local_styles: ['bass', 'pad swell'],
      duration_ms: 3000,
      lines: [],
    },
    {
      section_name: 'Fact two and turn',
      positive_local_styles: ['pad returns softly', 'restrained', 'slow heartbeat-like low pulse'],
      negative_local_styles: ['loud'],
      duration_ms: 10000,
      lines: [],
    },
    {
      section_name: 'Finale',
      positive_local_styles: ['warm resolving chord', 'gentle', 'hopeful', 'slow fade out to silence'],
      negative_local_styles: ['tension'],
      duration_ms: 7000,
      lines: [],
    },
  ],
};

function writePlaceholder(reason: string) {
  const abs = path.join(PUBLIC_DIR, MUSIC_FILE);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', '40', '-q:a', '9', abs]);
  updateManifest(MUSIC_FILE, {
    durationSeconds: 40,
    generatedAt: new Date().toISOString(),
    ok: false,
    note: `ЗАГЛУШКА (тишина): ${reason}. Добавьте музыку вручную в ${MUSIC_FILE}.`,
  });
  console.warn(`\n⚠ Музыка не сгенерирована (${reason}). Создана тихая заглушка ${MUSIC_FILE} — замените её вручную.`);
}

async function main() {
  process.stdout.write(`${MUSIC_FILE} (music_v1, composition_plan 40 c) … `);
  try {
    const audio = await postAudio(
      '/v1/music',
      {model_id: 'music_v1', composition_plan: plan},
      {output_format: 'mp3_44100_128'},
    );
    const abs = saveFile(MUSIC_FILE, audio);
    const dur = probeDuration(abs);
    const lv = normalizeLoudness(abs, LOUDNESS_TARGET.music);
    updateManifest(MUSIC_FILE, {
      durationSeconds: dur,
      loudnessLufs: LOUDNESS_TARGET.music,
      meanDb: lv?.meanDb,
      maxDb: lv?.maxDb,
      model: 'music_v1',
      generatedAt: new Date().toISOString(),
      ok: true,
    });
    console.log(`ok, ${dur?.toFixed(2)} c, mean ${lv?.meanDb} dB`);
  } catch (e) {
    console.log('ошибка');
    const reason = e instanceof ApiError ? `HTTP ${e.status}: ${e.body.slice(0, 200)}` : (e as Error).message;
    writePlaceholder(reason);
  }
}

main();
