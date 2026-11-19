// Сведение: голос + SFX-слоты + фоновый трек (12%, дакинг под голос, music stop) → build/mix.wav,
// затем (если есть видео) — мукс в финальный MP4.
//   node scripts/mix-audio.mjs [--fps=30|60] [--video=…] [--out=…]
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SFX, MUSIC, VOICEOVER } from '../config/audio.config.js';
import { VIDEO } from '../config/video.config.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const D = VIDEO.duration;

const inputs = []; const filters = [];
const add = (file) => { inputs.push('-i', join(ROOT, file)); return inputs.length / 2 - 1; };
const ms = (t) => Math.round(t * 1000);

// 1) Голос
const voParts = existsSync(join(ROOT, 'build/vo-parts.json')) ? JSON.parse(readFileSync(join(ROOT, 'build/vo-parts.json'))) : [];
if (!voParts.length) console.warn('⚠ Нет озвучки (build/vo-parts.json) — запусти npm run tts. Сведение без голоса.');
const voLabels = voParts.map((p, i) => {
  const k = add(p.file);
  filters.push(`[${k}]aformat=sample_rates=48000:channel_layouts=mono,adelay=${ms(p.at)},volume=${VOICEOVER.volume}[vo${i}]`);
  return `[vo${i}]`;
});
if (voLabels.length) filters.push(`${voLabels.join('')}amix=inputs=${voLabels.length}:normalize=0,apad=whole_dur=${D},atrim=0:${D},asplit=2[vo][vokey]`);
else filters.push(`anullsrc=r=48000:cl=mono,atrim=0:${D}[vo];anullsrc=r=48000:cl=mono,atrim=0:${D}[vokey]`);

// 2) SFX-слоты
const sfxLabels = [];
SFX.forEach((s, i) => {
  if (!existsSync(join(ROOT, s.file))) { console.warn(`  нет файла слота ${s.id}: ${s.file} — пропущен`); return; }
  const k = add(s.file);
  const trim = s.dur ? `,atrim=0:${s.dur},afade=t=out:st=${Math.max(0, s.dur - 0.08)}:d=0.08` : '';
  filters.push(`[${k}]aformat=sample_rates=48000:channel_layouts=mono${trim},volume=${s.gainDb}dB,adelay=${ms(s.at)}[s${i}]`);
  sfxLabels.push(`[s${i}]`);
});
filters.push(sfxLabels.length
  ? `${sfxLabels.join('')}amix=inputs=${sfxLabels.length}:normalize=0,apad=whole_dur=${D},atrim=0:${D}[sfx]`
  : `anullsrc=r=48000:cl=mono,atrim=0:${D}[sfx]`);

// 3) Музыка: свой трек или заглушка; 12%, фейды, стоп-музыки, дакинг под голос
const musicFile = existsSync(join(ROOT, MUSIC.file)) ? MUSIC.file : MUSIC.placeholder;
if (existsSync(join(ROOT, musicFile))) {
  const k = add(musicFile);
  const stops = MUSIC.stops.map((s) => `between(t,${s.at},${s.at + s.dur})`).join('+') || '0';
  filters.push(`[${k}]aformat=sample_rates=48000:channel_layouts=mono,aloop=loop=-1:size=2e9,atrim=0:${D},asetpts=PTS-STARTPTS,` +
    `volume=${MUSIC.volume},volume='if(${stops},0,1)':eval=frame,afade=t=in:d=${MUSIC.fadeIn},afade=t=out:st=${D - MUSIC.fadeOut}:d=${MUSIC.fadeOut}[mus0]`);
  filters.push(MUSIC.duckUnderVo ? `[mus0][vokey]sidechaincompress=threshold=0.03:ratio=4:attack=15:release=250[mus]` : `[mus0]anull[mus];[vokey]anullsink`);
  console.log(`Музыка: ${musicFile}${musicFile === MUSIC.placeholder ? ' (ЗАГЛУШКА — замени на лицензионный трек)' : ''}`);
} else {
  filters.push(`anullsrc=r=48000:cl=mono,atrim=0:${D}[mus];[vokey]anullsink`);
}

// 4) Премикс, затем мастер в 2 прохода: −14 LUFS, TP −1 dBTP (стандарт соцсетей)
filters.push(`[vo][sfx][mus]amix=inputs=3:normalize=0,atrim=0:${D}[out]`);

mkdirSync(join(ROOT, 'build'), { recursive: true });
const premix = join(ROOT, 'build/premix.wav');
const mix = join(ROOT, 'build/mix.wav');
execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-ac', '2', '-ar', '48000', premix], { stdio: 'inherit' });
const LN = 'loudnorm=I=-14:TP=-1:LRA=11';
const pass1 = spawnSync('ffmpeg', ['-hide_banner', '-i', premix, '-af', `${LN}:print_format=json`, '-f', 'null', '-']).stderr.toString();
const m = JSON.parse((pass1.match(/\{[\s\S]*\}/) || [null])[0] || 'null');
const af = m ? `${LN}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true` : LN;
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', premix, '-af', `${af},aresample=48000`, '-ar', '48000', mix], { stdio: 'inherit' });
console.log(`Микс: ${mix}`);

const fps = +arg('fps', VIDEO.fps);
const video = join(ROOT, arg('video', `build/video-${fps}fps.mp4`));
if (existsSync(video)) {
  const out = join(ROOT, arg('out', `out/claude-intro-37s-1080x1920-${fps}fps.mp4`));
  mkdirSync(dirname(out), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', video, '-i', mix, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(D), '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log(`Готово: ${out}`);
} else {
  console.log(`Видео ${video} не найдено — только микс. Запусти npm run render.`);
}
