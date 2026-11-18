// Единый конфиг проекта (../../project.config.json) — правки делаются там, не в коде.
import cfg from "../../../project.config.json";
import subs from "../public/subtitles.json";

export const config = cfg;
export type SubWord = { text: string; accent: boolean; start: number; end: number };
export type SubBlock = { start: number; end: number; words: SubWord[] };
export const subtitles = subs as SubBlock[];

export const tcToSec = (tc: string) => {
  const [m, s] = tc.split(":");
  return Number(m) * 60 + Number(s);
};
export const FPS = cfg.format.fps;
export const sec = (s: number) => Math.round(s * FPS);
export const block = (id: string) => cfg.timeline.find((b) => b.id === id)!;
