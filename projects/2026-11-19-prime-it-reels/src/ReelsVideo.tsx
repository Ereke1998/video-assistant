import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Background} from './components/neon/Background';
import {Glitch} from './components/neon/Glitch';
import {Header} from './components/neon/Header';
import {SoundTrack} from './components/SoundTrack';
import {Subtitles} from './components/Subtitles';
import {sceneFrames} from './data/script';
import {Brand} from './scenes/Brand';
import {DustProblem} from './scenes/DustProblem';
import {Hook} from './scenes/Hook';
import {Solution} from './scenes/Solution';
import {GLITCH_FROM, GLITCH_TO, ThermalProblem} from './scenes/ThermalProblem';

const scenes = [
  {id: 'hook', C: Hook},
  {id: 'dust', C: DustProblem},
  {id: 'thermal', C: ThermalProblem},
  {id: 'solution', C: Solution},
  {id: 'brand', C: Brand},
] as const;

const thermal = sceneFrames('thermal');

export const ReelsVideo: React.FC = () => (
  <AbsoluteFill>
    <Glitch from={thermal.from + GLITCH_FROM} to={thermal.from + GLITCH_TO}>
      <Background />
      {scenes.map(({id, C}) => {
        const {from, duration} = sceneFrames(id);
        return (
          <Sequence key={id} from={from} durationInFrames={duration} name={id}>
            <C />
          </Sequence>
        );
      })}
      <Header />
      <Subtitles />
    </Glitch>
    <SoundTrack />
  </AbsoluteFill>
);
