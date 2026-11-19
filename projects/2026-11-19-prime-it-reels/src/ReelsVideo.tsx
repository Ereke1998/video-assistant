import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {SoundTrack} from './components/SoundTrack';
import {Subtitles} from './components/Subtitles';
import {sceneFrames} from './data/script';
import {COLORS} from './lib/colors';
import {Brand} from './scenes/Brand';
import {DustProblem} from './scenes/DustProblem';
import {Hook} from './scenes/Hook';
import {Solution} from './scenes/Solution';
import {ThermalProblem} from './scenes/ThermalProblem';

const scenes = [
  {id: 'hook', C: Hook},
  {id: 'dust', C: DustProblem},
  {id: 'thermal', C: ThermalProblem},
  {id: 'solution', C: Solution},
  {id: 'brand', C: Brand},
] as const;

export const ReelsVideo: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
    {scenes.map(({id, C}) => {
      const {from, duration} = sceneFrames(id);
      return (
        <Sequence key={id} from={from} durationInFrames={duration} name={id}>
          <C />
        </Sequence>
      );
    })}
    <Subtitles />
    <SoundTrack />
  </AbsoluteFill>
);
