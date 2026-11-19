// Шапка как в инфографике: бренд слева, тема справа, градиентная линия-прогресс.
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../../lib/colors';
import {FONT_FAMILY} from '../font';
import {sceneColorAt} from './Background';

export const Header: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const p = Math.min(1, frame / (durationInFrames - 90));
  const c = sceneColorAt(frame);
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 262, fontFamily: FONT_FAMILY, fontWeight: 700, textTransform: 'uppercase'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <div style={{fontSize: 40, color: '#fff', letterSpacing: 2}}>
          PRIME <span style={{color: COLORS.cyan}}>IT</span>
        </div>
        <div style={{fontSize: 30, color: '#9aa0ae', letterSpacing: 2}}>Ремонт ноутбуков</div>
      </div>
      <div style={{marginTop: 10, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', overflow: 'hidden'}}>
        <div style={{width: `${p * 100}%`, height: '100%', background: `linear-gradient(90deg, ${COLORS.heat}, ${c})`, boxShadow: `0 0 12px ${c}`}} />
      </div>
    </div>
  );
};
