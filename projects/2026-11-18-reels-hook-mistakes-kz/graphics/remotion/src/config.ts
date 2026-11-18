// Единый конфиг проекта (../../project.config.json) + артефакты конвейера из public/.
import cfg from "../../../project.config.json";
import subs from "../public/subtitles.json";
import tl from "../public/timeline.json";
import script from "../public/script.json";
import wordsJson from "../public/words.json";
import { THEMES, Theme } from "./themes";

export const config = cfg as any;
export type SubWord = { text: string; accent: boolean; start: number; end: number };
export type SubBlock = { start: number; end: number; words: SubWord[] };
export const subtitles = subs as SubBlock[];
export type Word = { word: string; start: number; end: number };
export const words = wordsJson as Word[];

export const theme: Theme = { ...THEMES[cfg.theme.preset] ?? THEMES.night, ...(cfg.theme.overrides ?? {}) };
theme.hud = { ...theme.hud, ...(cfg.hud?.show ?? {}) };
if (cfg.headline?.reveal && cfg.headline.reveal !== "auto") theme.reveal = cfg.headline.reveal as Theme["reveal"];

// Подписи внутри визуалов — по языку проекта (project.language).
const LABELS: Record<string, Record<string, string>> = {
  ru: { stats: "Статистика", ui: "подпись · кнопки", here: "текст\nздесь" },
  kk: { stats: "Статистика", ui: "жазба · батырмалар", here: "мәтін\nосында" },
};
export const L = LABELS[cfg.project.language] ?? LABELS.ru;

export const FPS: number = cfg.format.fps;
export const sec = (s: number) => Math.round(s * FPS);

// Токен заголовка: wi — индекс слова в общей озвучке (для караоке); br — перенос строки.
export type Token = { text: string; style: "normal" | "accent" | "strike" | "big" | "kicker"; wi: number | null; br?: boolean };

// Разбор разметки, если script.json ещё не сгенерирован (зеркало pipeline/generate_script.py).
const tokenize = (voice: string, offset: number): Token[] => {
  const out: Token[] = []; let style: Token["style"] = "normal"; let wi = offset;
  const MARK: Record<string, Token["style"]> = { "*": "accent", "~": "strike", "^": "big", "_": "kicker" };
  for (const raw of voice.split(/\s+/).filter(Boolean)) {
    if (raw === "|") { out.push({ text: "", style: "normal", wi: null, br: true }); continue; }
    let t = raw; let s: Token["style"] = style;
    if (MARK[t[0]]) { s = MARK[t[0]]; style = s; t = t.slice(1); }
    const close = MARK[t[t.length - 1]] && MARK[t[t.length - 1]] === s ? true : false;
    if (close) t = t.slice(0, -1);
    const isWord = /[\p{L}\p{N}]/u.test(t);
    out.push({ text: t, style: s, wi: isWord ? wi++ : null });
    if (close) style = "normal";
  }
  return out;
};

const rawScenes: any[] = (script as any).scenes.length
  ? (script as any).scenes
  : (() => { let off = 0; return (cfg.scenes as any[]).filter((s) => s.enabled !== false).map((s) => {
      const tokens = tokenize(s.voice || "", off); off += tokens.filter((t) => t.wi !== null).length;
      return { ...s, tokens };
    }); })();
export const scenes: any[] = rawScenes;

type Slot = { id: string; from: number; frames: number };
const estimate = (): Slot[] => {
  const wps = (cfg.script.pace_wps as any)[cfg.project.language] ?? 2.2;
  let from = 0;
  return scenes.map((s) => {
    const n = s.tokens.filter((t: Token) => t.wi !== null).length;
    const frames = sec(Math.max(n / wps, 1.5) + cfg.voiceover.pad_after_sec);
    const slot = { id: s.id, from, frames }; from += frames; return slot;
  });
};
export const timeline: Slot[] = (tl as any).scenes.length ? (tl as any).scenes : estimate();
export const totalFrames = timeline.reduce((m, s) => Math.max(m, s.from + s.frames), 1);
export const hasVoiceover = (tl as any).scenes.length > 0 && (tl as any).engine !== "preview";

// Время слова: из words.json; если пусто — равномерно внутри сцены.
export const wordTime = (wi: number): { start: number; end: number } => {
  if (words[wi]) return words[wi];
  for (let i = 0; i < scenes.length; i++) {
    const ws = scenes[i].tokens.filter((t: Token) => t.wi !== null);
    const k = ws.findIndex((t: Token) => t.wi === wi);
    if (k >= 0) {
      const sl = timeline[i]; const a = sl.from / FPS; const d = (sl.frames / FPS - cfg.voiceover.pad_after_sec) / ws.length;
      return { start: a + k * d, end: a + (k + 1) * d };
    }
  }
  return { start: 0, end: 0 };
};
export const sceneIndexAt = (frame: number) => Math.max(0, timeline.findIndex((s) => frame >= s.from && frame < s.from + s.frames));
