import 'dotenv/config';
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const MANIFEST_PATH = path.join(ROOT, 'src', 'audio-manifest.json');
export const API_BASE = 'https://api.elevenlabs.io';

/** Ключ берётся только из окружения (.env подхватывается dotenv). В код и коммиты не попадает. */
export function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    console.error('Нет ELEVENLABS_API_KEY. Задайте переменную окружения или добавьте её в .env (см. .env.example).');
    process.exit(1);
  }
  return key;
}

export async function postAudio(
  endpoint: string,
  body: unknown,
  query: Record<string, string> = {},
): Promise<Buffer> {
  const url = new URL(endpoint, API_BASE);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': getApiKey(),
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text.slice(0, 600));
  }
  return Buffer.from(await res.arrayBuffer());
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`HTTP ${status}: ${body}`);
  }
}

export function saveFile(relPath: string, data: Buffer) {
  const abs = path.join(PUBLIC_DIR, relPath);
  mkdirSync(path.dirname(abs), {recursive: true});
  writeFileSync(abs, data);
  return abs;
}

/** Длительность аудио через ffprobe (если он установлен). */
export function probeDuration(absPath: string): number | null {
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', absPath],
      {encoding: 'utf8'},
    );
    const d = parseFloat(out.trim());
    return Number.isFinite(d) ? d : null;
  } catch {
    return null;
  }
}

export type LevelStats = {meanDb: number; maxDb: number} | null;

/** Средний и пиковый уровень через ffmpeg volumedetect — грубая автоматическая проверка «звук не пустой и не клиппует». */
export function levelStats(absPath: string): LevelStats {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', absPath, '-af', 'volumedetect', '-f', 'null', '-'], {
    encoding: 'utf8',
  });
  return r.stderr ? parseLevels(r.stderr) : null;
}

function parseLevels(s: string): LevelStats {
  const mean = s.match(/mean_volume:\s*(-?[\d.]+) dB/);
  const max = s.match(/max_volume:\s*(-?[\d.]+) dB/);
  if (!mean || !max) return null;
  return {meanDb: parseFloat(mean[1]), maxDb: parseFloat(max[1])};
}

export type ManifestEntry = {
  loudnessLufs?: number;
  words?: {text: string; start: number; end: number}[];
  durationSeconds: number | null;
  meanDb?: number;
  maxDb?: number;
  model?: string;
  attempts?: number;
  prompt?: string;
  generatedAt: string;
  ok: boolean;
  note?: string;
};
export type Manifest = Record<string, ManifestEntry>;

export function readManifest(): Manifest {
  if (!existsSync(MANIFEST_PATH)) return {};
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

export function updateManifest(file: string, entry: ManifestEntry) {
  const m = readManifest();
  m[file] = entry;
  const sorted = Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + '\n');
}

export function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Целевая громкость (EBU R128, LUFS) по типу файла — чтобы громкости в Remotion (1.0 / 0.4–0.6 / 0.15–0.25) работали предсказуемо. */
export const LOUDNESS_TARGET = {voice: -16, sfx: -20, music: -16} as const;

/**
 * Нормализация громкости (ffmpeg loudnorm). Меняет только уровень, не длительность и не темп.
 * Перезаписывает файл; возвращает итоговые уровни.
 */
export function normalizeLoudness(absPath: string, lufs: number): LevelStats {
  const tmp = absPath.replace(/\.mp3$/, '.norm.mp3');
  const r = spawnSync(
    'ffmpeg',
    ['-y', '-v', 'error', '-i', absPath, '-af', `loudnorm=I=${lufs}:TP=-1.5:LRA=11`, '-ar', '44100', '-b:a', '128k', tmp],
    {encoding: 'utf8'},
  );
  if (r.status !== 0) {
    console.warn(`  (нормализация не удалась: ${r.stderr?.slice(0, 200)})`);
    return levelStats(absPath);
  }
  renameSync(tmp, absPath);
  return levelStats(absPath);
}

export function kindOf(file: string): keyof typeof LOUDNESS_TARGET {
  if (file.includes('voice-')) return 'voice';
  if (file.includes('music')) return 'music';
  return 'sfx';
}
