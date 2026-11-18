import React from 'react';
import {Composition} from 'remotion';
import {Documentary} from './Documentary';
import {TL, FPS, sec} from './timeline';
import {loadFonts} from './fonts';

loadFonts();

export const Root: React.FC = () => (
  <>
    <Composition
      id="GTA6Documentary"
      component={Documentary}
      durationInFrames={Math.max(1, sec(TL.duration))}
      fps={FPS}
      width={TL.width}
      height={TL.height}
    />
  </>
);
