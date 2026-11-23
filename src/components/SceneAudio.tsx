import React from 'react';
import {Audio, interpolate, Sequence, staticFile} from 'remotion';
import {SceneId, SFX} from '../content';
import {audioDurationFrames, sceneById, voiceFor} from '../timeline';

/**
 * Аудио сцены: озвучка (громкость 1.0) и SFX (0.4–0.6), каждое в своей <Sequence> с точным кадром.
 * Кадры здесь локальные — относительно начала сцены.
 */
export const SceneAudio: React.FC<{scene: SceneId}> = ({scene}) => {
  const s = sceneById(scene);
  const voice = voiceFor(scene);
  const effects = SFX.filter((x) => x.scene === scene);
  return (
    <>
      <Sequence from={voice.offset} durationInFrames={audioDurationFrames(voice.file, 7)} name={`voice-${scene}`} layout="none">
        <Audio src={staticFile(voice.file)} startFrom={0} volume={1} />
      </Sequence>
      {effects.map((fx) => {
        const dur = audioDurationFrames(fx.file, fx.durationSeconds);
        return (
          <Sequence key={fx.file} from={fx.at - s.from} durationInFrames={dur} name={fx.file.replace('audio/', '')} layout="none">
            <Audio
              src={staticFile(fx.file)}
              startFrom={0}
              // короткие фейды на краях, чтобы не было щелчков
              volume={(f) =>
                fx.volume *
                interpolate(f, [0, 3, dur - 8, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
              }
            />
          </Sequence>
        );
      })}
    </>
  );
};
