// Звук: озвучка -6 dB, музыка -18 dB с подъёмом к 26 с, SFX -10 dB.
import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {dbToGain, keys} from '../lib/anim';
import {FPS} from '../data/script';

const VO_DB = -6;
const SFX_DB = -10;

const musicDb = (frame: number) =>
  keys(frame / FPS, [0, 24, 26, 30.6, 32], [-18, -18, -12, -12, -30]);

type Sfx = {file: string; at: number; db?: number};
// at — секунды старта файла. У whoosh пик громкости ~0.33 с после старта.
export const SFX: Sfx[] = [
  {file: 'fan_takeoff.wav', at: 0.0},
  {file: 'alarm.wav', at: 0.2, db: -13},
  {file: 'whoosh.wav', at: 2.67},
  {file: 'whoosh.wav', at: 9.75, db: -16},
  {file: 'crack_stone.wav', at: 11.0},
  {file: 'system_freeze.wav', at: 14.0},
  {file: 'whoosh.wav', at: 17.67},
  {file: 'fresh_air.wav', at: 19.0},
  {file: 'tech_click.wav', at: 24.0},
  {file: 'ding.wav', at: 25.0},
  {file: 'whoosh.wav', at: 25.67, db: -16},
  {file: 'click.wav', at: 27.4},
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
