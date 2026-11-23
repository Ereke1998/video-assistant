// Тайминги, вычисленные из сценария + реальных длительностей аудио (src/audio-manifest.json,
// его пишут scripts/generate_*.ts). Аудио нигде не растягивается и не сжимается.
import {interpolate} from 'remotion';
import manifest from './audio-manifest.json';
import {FPS, SCENES, SceneId, VOICE_LINES, VoiceLine} from './content';

type Word = {text: string; start: number; end: number};
type Entry = {durationSeconds: number | null; words?: Word[]};
const M = manifest as Record<string, Entry>;

export const sceneById = (id: SceneId) => SCENES.find((s) => s.id === id)!;

export const voiceFor = (id: SceneId) => VOICE_LINES.find((l) => l.scene === id)!;

/** Абсолютный кадр начала реплики. */
export const voiceStartFrame = (line: VoiceLine) => sceneById(line.scene).from + line.offset;

export const voiceWords = (line: VoiceLine): Word[] | undefined => M[line.file]?.words;

export const audioDurationFrames = (file: string, fallbackSeconds: number) =>
  Math.ceil((M[file]?.durationSeconds ?? fallbackSeconds) * FPS);

/**
 * Кадр (относительно начала сцены), на котором звучит слово, начинающееся с `prefix`.
 * Нужен, чтобы привязать анимацию к озвучке (например, «слабеет» / «растёт» в сцене 5).
 */
export const wordLocalFrame = (id: SceneId, prefix: string, fallbackSeconds: number): number => {
  const line = voiceFor(id);
  const w = voiceWords(line)?.find((x) => x.text.toLowerCase().startsWith(prefix.toLowerCase()));
  return line.offset + Math.round((w?.start ?? fallbackSeconds) * FPS);
};

export type Cue = {text: string; from: number; to: number};

/** Субтитры: каждая часть `subtitle` (через «|») — отдельный экран; время — по словам из forced alignment. */
export const buildCues = (): Cue[] => {
  const cues: Cue[] = [];
  for (const line of VOICE_LINES) {
    const chunks = line.subtitle.split('|').map((c) => c.trim());
    const chunkWords = chunks.map((c) => c.split(/\s+/).length);
    const totalWords = chunkWords.reduce((a, b) => a + b, 0);
    const words = voiceWords(line);
    const start = voiceStartFrame(line);
    const durSec = M[line.file]?.durationSeconds ?? totalWords / 2.3;

    let wi = 0;
    const local: {text: string; s: number; e: number}[] = [];
    chunks.forEach((text, i) => {
      const n = chunkWords[i];
      let s: number;
      let e: number;
      if (words && words.length === totalWords) {
        s = words[wi].start;
        e = words[wi + n - 1].end;
      } else {
        // Запасной вариант: пропорционально числу слов.
        s = (wi / totalWords) * durSec;
        e = ((wi + n) / totalWords) * durSec;
      }
      local.push({text, s, e});
      wi += n;
    });

    const LEAD = 2; // субтитр появляется на 2 кадра раньше слова
    local.forEach((c, i) => {
      const next = local[i + 1];
      const from = start + Math.round(c.s * FPS) - LEAD;
      // держим субтитр не больше 0,5 c после конца слова и строго до появления следующего (без наложений)
      let to = start + Math.round((c.e + (next ? 0.5 : 0.45)) * FPS);
      if (next) to = Math.min(to, start + Math.round(next.s * FPS) - LEAD);
      cues.push({text: c.text, from, to});
    });
  }
  // и между репликами разных сцен — тоже без наложений
  cues.sort((x, y) => x.from - y.from);
  for (let i = 0; i < cues.length - 1; i++) cues[i].to = Math.min(cues[i].to, cues[i + 1].from);
  return cues;
};

/** Интервалы речи (абсолютные кадры) — для дакинга музыки. */
const speechIntervals = (): [number, number][] =>
  VOICE_LINES.map((line) => {
    const words = voiceWords(line);
    const start = voiceStartFrame(line);
    const s = words ? words[0].start : 0;
    const e = words ? words[words.length - 1].end : (M[line.file]?.durationSeconds ?? 5);
    return [start + Math.round(s * FPS), start + Math.round(e * FPS)];
  });

const SPEECH = speechIntervals();

/** 1 — нет речи, ниже — под озвучкой; плавные рампы по 10 кадров. */
export const duckFactor = (frame: number, depth = 0.6): number => {
  let f = 1;
  for (const [s, e] of SPEECH) {
    const v = interpolate(frame, [s - 10, s, e, e + 12], [1, depth, depth, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    f = Math.min(f, v);
  }
  return f;
};

/**
 * Громкость музыки: база 0.15–0.25 — нарастание к сцене 3, пауза перед фактом 2 (0:20), сдержанно дальше,
 * спад в финале; плюс плавный спад под озвучкой.
 */
export const musicVolume = (frame: number): number => {
  const base = interpolate(
    frame,
    [0, 20, 390, 560, 588, 604, 624, 660, 990, 1120, 1196],
    [0, 0.15, 0.25, 0.25, 0.0, 0.0, 0.06, 0.18, 0.2, 0.15, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  return base * duckFactor(frame, 0.6);
};
