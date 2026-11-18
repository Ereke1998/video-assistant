// Единый конфиг проекта (../../project.config.json) — правки делаются там, не в коде.
import cfg from "../../../project.config.json";
import subs from "../public/subtitles.json";
import tl from "../public/timeline.json";
import script from "../public/script.json";

export const config = cfg as any;
export type SubWord = { text: string; accent: boolean; start: number; end: number };
export type SubBlock = { start: number; end: number; words: SubWord[] };
export const subtitles = subs as SubBlock[];

export const FPS: number = cfg.format.fps;
export const sec = (s: number) => Math.round(s * FPS);
// Сцены из build/script.json (хук/CTA уже заполнены генератором); до генерации — прямо из конфига.
export const scenes: any[] = (script as any).scenes.length
  ? (script as any).scenes
  : (cfg.scenes as any[]).filter((s) => s.enabled !== false);

type Slot = { id: string; from: number; frames: number };
// Тайминги из озвучки (build/timeline.json); до запуска voiceover.py — оценка по темпу речи.
const estimate = (): Slot[] => {
  const wps = (cfg.script.pace_wps as any)[cfg.project.language] ?? 2.2;
  let from = 0;
  return scenes.map((s) => {
    const n = (s.voice || "").split(/\s+/).filter(Boolean).length;
    const frames = sec(Math.max(n / wps, 1.5) + cfg.voiceover.pad_after_sec);
    const slot = { id: s.id, from, frames }; from += frames; return slot;
  });
};
export const timeline: Slot[] = (tl as any).scenes.length ? (tl as any).scenes : estimate();
export const totalFrames = timeline.reduce((m, s) => Math.max(m, s.from + s.frames), 1);
export const hasVoiceover = (tl as any).scenes.length > 0;
