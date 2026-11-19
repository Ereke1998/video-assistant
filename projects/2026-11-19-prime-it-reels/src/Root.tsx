import React from 'react';
import {Composition} from 'remotion';
import {DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH} from './data/script';
import {ReelsVideo} from './ReelsVideo';

export const RemotionRoot: React.FC = () => (
  <Composition id="ReelsVideo" component={ReelsVideo} durationInFrames={DURATION_IN_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
);
