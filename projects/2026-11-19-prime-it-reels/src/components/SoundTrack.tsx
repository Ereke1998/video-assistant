// Звук: озвучка (нормализована до −16 LUFS) по центру, музыка с дакингом под голос, SFX тише голоса.
import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {CHUNKS, FPS} from '../data/script';
import {dbToGain} from '../lib/anim';

const VO_DB = 0; // стем уже −16 LUFS
const MUSIC_UNDER_VOICE_DB = -24; // музыка под голосом
const MUSIC_GAP_DB = -17; // в паузах
const SFX_DB = -16;
const RAMP = 8; // кадров на атаку/отпускание дакинга

// 1 — идёт речь, 0 — пауза (с плавными краями)
const speech = (frame: number) => {
  let v = 0;
  for (const c of CHUNKS) {
    const a = c.from * FPS;
    const b = c.to * FPS;
    const k = Math.min(1, Math.max(0, (frame - (a - RAMP)) / RAMP)) * Math.min(1, Math.max(0, (b + RAMP - frame) / RAMP));
    v = Math.max(v, k);
  }
  return v;
};

const musicDb = (frame: number) => {
  const s = speech(frame);
  let db = MUSIC_GAP_DB + (MUSIC_UNDER_VOICE_DB - MUSIC_GAP_DB) * s;
  const t = frame / FPS;
  if (t > 31.2) db -= (t - 31.2) * 20; // затухание в конце
  return db;
};

type Sfx = {file: string; at: number; db?: number};
// at — секунды старта файла. У whoosh пик громкости ~0.33 с после старта.
export const SFX: Sfx[] = [
  {file: 'fan_takeoff.wav', at: 0.0, db: -24},
  {file: 'alarm.wav', at: 0.2, db: -26},
  {file: 'whoosh.wav', at: 2.67, db: -18},
  {file: 'whoosh.wav', at: 9.75, db: -22},
  {file: 'crack_stone.wav', at: 11.0},
  {file: 'system_freeze.wav', at: 14.0, db: -18},
  {file: 'whoosh.wav', at: 17.67, db: -18},
  {file: 'fresh_air.wav', at: 19.0, db: -20},
  {file: 'tech_click.wav', at: 24.0},
  {file: 'ding.wav', at: 25.0, db: -18},
  {file: 'whoosh.wav', at: 25.67, db: -22},
  {file: 'click.wav', at: 27.73},
];

export const SoundTrack: React.FC = () => (
  <>
    <Audio src={staticFile('audio/voiceover.mp3')} volume={dbToGain(VO_DB)} />
    <Audio src={staticFile('audio/music.mp3')} volume={(f) => dbToGain(musicDb(f))} />
    {SFX.map((s, i) => (
      <Sequence key={i} from={Math.round(s.at * FPS)} layout="none" name={`sfx ${s.file}`}>
        <Audio src={staticFile(`audio/sfx/${s.file}`)} volume={dbToGain(s.db ?? SFX_DB)} />
      </Sequence>
    ))}
  </>
);
