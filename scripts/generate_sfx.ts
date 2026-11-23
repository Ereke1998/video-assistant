/**
 * Звуковые эффекты через ElevenLabs Sound Effects.
 *   POST https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128
 *   headers: xi-api-key
 *   body:    { text, duration_seconds, prompt_influence }
 *
 * Запуск:  npx tsx scripts/generate_sfx.ts                 — все эффекты
 *          npx tsx scripts/generate_sfx.ts --only sfx-glitch
 *
 * Автопроверка после генерации (до 3 попыток на эффект, каждая — с уточнённым промптом из src/content.ts):
 *   - длительность в пределах ±0,3 c от заказанной;
 *   - звук не пустой (mean_volume > -55 dB) и пик не в клиппинге (max_volume < -0,1 dB).
 * Субъективную оценку «звучит плохо» автоматически сделать нельзя — прослушайте файлы и при необходимости
 * поправьте промпты в src/content.ts.
 */
import {SFX} from '../src/content';
import {LOUDNESS_TARGET, argValue, levelStats, normalizeLoudness, postAudio, probeDuration, saveFile, updateManifest} from './lib';

const MAX_ATTEMPTS = 3;

function check(dur: number | null, want: number, lv: ReturnType<typeof levelStats>): string | null {
  if (dur !== null && Math.abs(dur - want) > 0.3) return `длительность ${dur.toFixed(2)} c вместо ${want} c`;
  if (lv && lv.meanDb < -55) return `слишком тихо (mean ${lv.meanDb} dB)`;
  if (lv && lv.maxDb >= -0.1) return `клиппинг (max ${lv.maxDb} dB)`;
  return null;
}

async function main() {
  const only = argValue('only');
  const list = SFX.filter((s) => !only || s.file.includes(only));
  const failed: string[] = [];

  for (const sfx of list) {
    let done = false;
    for (let attempt = 0; attempt < Math.min(MAX_ATTEMPTS, sfx.prompts.length) && !done; attempt++) {
      const text = sfx.prompts[attempt];
      process.stdout.write(`${sfx.file} [попытка ${attempt + 1}] «${text}» … `);
      try {
        const audio = await postAudio(
          '/v1/sound-generation',
          {text, duration_seconds: sfx.durationSeconds, prompt_influence: 0.5},
          {output_format: 'mp3_44100_128'},
        );
        const abs = saveFile(sfx.file, audio);
        const dur = probeDuration(abs);
        // Проверка — по исходному файлу от API, нормализация — только после неё.
        const problem = check(dur, sfx.durationSeconds, levelStats(abs));
        const lv = normalizeLoudness(abs, LOUDNESS_TARGET.sfx);
        updateManifest(sfx.file, {
          durationSeconds: dur,
          loudnessLufs: LOUDNESS_TARGET.sfx,
          meanDb: lv?.meanDb,
          maxDb: lv?.maxDb,
          attempts: attempt + 1,
          prompt: text,
          generatedAt: new Date().toISOString(),
          ok: !problem,
          note: problem ?? undefined,
        });
        if (problem) {
          console.log(`плохо: ${problem}`);
        } else {
          console.log(`ok, ${dur?.toFixed(2)} c, mean ${lv?.meanDb} dB, max ${lv?.maxDb} dB`);
          done = true;
        }
      } catch (e) {
        console.log(`ОШИБКА: ${(e as Error).message}`);
      }
    }
    if (!done) failed.push(sfx.file);
  }

  if (failed.length) {
    console.error(`\nНе прошли проверку за ${MAX_ATTEMPTS} попытки: ${failed.join(', ')}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
