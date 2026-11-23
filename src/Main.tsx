import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Grade, Grain, Vignette} from './components/Atmosphere';
import {Subtitles} from './components/Subtitles';
import {MUSIC_FILE, SCENES} from './content';
import {ensureFonts} from './fonts';
import {Scene1Hook} from './scenes/Scene1Hook';
import {Scene2Fact1} from './scenes/Scene2Fact1';
import {Scene3Robots} from './scenes/Scene3Robots';
import {Scene4Fact2} from './scenes/Scene4Fact2';
import {Scene5Turn} from './scenes/Scene5Turn';
import {Scene6Final} from './scenes/Scene6Final';
import {musicVolume} from './timeline';

ensureFonts();

const SCENE_COMPONENTS: Record<number, React.FC> = {
  1: Scene1Hook,
  2: Scene2Fact1,
  3: Scene3Robots,
  4: Scene4Fact2,
  5: Scene5Turn,
  6: Scene6Final,
};

export const Main: React.FC = () => {
  return (
    <AbsoluteFill data-composition-root style={{backgroundColor: '#000', overflow: 'hidden'}}>
      {SCENES.map((s) => {
        const Comp = SCENE_COMPONENTS[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.durationInFrames} name={`Сцена ${s.id} — ${s.name}`}>
            <Comp />
          </Sequence>
        );
      })}

      {/* общий «плёночный» слой */}
      <Grade />
      <Vignette strength={0.8} />
      <Grain opacity={0.08} />

      {/* субтитры поверх всего, в безопасной зоне */}
      <Subtitles />

      {/* фоновая музыка: 0.15–0.25, нарастание к сцене 3, пауза перед фактом 2, спад в финале, дакинг под голосом */}
      <Sequence name="music" layout="none">
        <Audio src={staticFile(MUSIC_FILE)} startFrom={0} volume={(f) => musicVolume(f)} />
      </Sequence>
    </AbsoluteFill>
  );
};
