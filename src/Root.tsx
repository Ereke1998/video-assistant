import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH} from './content';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Main"
      component={Main}
      durationInFrames={DURATION_IN_FRAMES} // 1200 кадров = 40 c
      fps={FPS} // 30 fps
      width={WIDTH} // 1080
      height={HEIGHT} // 1920 (9:16)
    />
  );
};
