/** Нормализация аудио через ffmpeg (идемпотентно: перезаписывает файл на месте) */
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-nostats', ...args], {stdio: ['ignore', 'pipe', 'pipe']});

/** Громкость по EBU R128 (для музыки/речи). Двухпроходный loudnorm. */
export function loudnormFile(file, lufs = -20, tp = -1.5) {
  const out = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${file}" -af loudnorm=I=${lufs}:TP=${tp}:LRA=11:print_format=json -f null - 2>&1`]).toString();
  const m = JSON.parse(out.slice(out.lastIndexOf('{'), out.lastIndexOf('}') + 1));
  const tmp = `${file}.tmp.mp3`;
  ff(['-y', '-i', file, '-af', `loudnorm=I=${lufs}:TP=${tp}:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`, '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k', tmp]);
  fs.renameSync(tmp, file);
  return Number(m.input_i);
}

/** Пиковая нормализация (для коротких SFX, где LUFS ненадёжен) */
export function peakNormFile(file, peakDb = -3) {
  const out = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${file}" -af volumedetect -f null - 2>&1`]).toString();
  const max = Number(/max_volume: (-?[\d.]+) dB/.exec(out)?.[1] ?? 0);
  const gain = peakDb - max;
  if (Math.abs(gain) < 0.3) return max;
  const tmp = `${file}.tmp.mp3`;
  ff(['-y', '-i', file, '-af', `volume=${gain.toFixed(2)}dB`, '-c:a', 'libmp3lame', '-b:a', '192k', tmp]);
  fs.renameSync(tmp, file);
  return max;
}

