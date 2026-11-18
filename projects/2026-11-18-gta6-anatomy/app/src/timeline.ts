import raw from './data/timeline.generated.json';

export type TWord = {text: string; norm: string; start: number; end: number; act: number; keyword: boolean};
export type TScene = {
  id: string;
  type: string;
  act: number;
  start: number;
  end: number;
  props: Record<string, any>;
  marks: Record<string, number>;
};
export type TAct = {
  id: number;
  roman: string;
  title: string;
  start: number;
  end: number;
  voiceStart: number;
  audio: string | null;
  plannedStart: number;
  plannedEnd: number;
};
export type Timeline = {
  estimated: boolean;
  fps: number;
  width: number;
  height: number;
  duration: number;
  music: string | null;
  footage: Record<string, string>;
  acts: TAct[];
  scenes: TScene[];
  words: TWord[];
  chunks: {start: number; end: number; words: number[]}[];
  sfx: {name: string; file: string; time: number; volume: number}[];
};

export const TL = raw as unknown as Timeline;
export const FPS = TL.fps;
export const sec = (s: number) => Math.round(s * FPS);
