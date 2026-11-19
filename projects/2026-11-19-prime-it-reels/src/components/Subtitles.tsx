// Субтитры по фразам (2–3 слова), ВСЁ ЗАГЛАВНЫМИ, акцентное слово в цвете сцены.
// Появление фразы: pop-in 0.6 → 1.15 → 1.0 через spring за 8 кадров.
import {measureText} from '@remotion/layout-utils';
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CHUNKS, FPS} from '../data/script';
import {SCENE_COLOR} from '../lib/colors';
import {FONT_FAMILY, FONT_NAME} from './font';

const BASE_SIZE = 112;
const MAX_WIDTH = 960;

export const isAccent = (w: string) => {
  const letters = w.replace(/[^\p{L}]/gu, '');
  return letters.length >= 2 && letters === letters.toUpperCase();
};

export const Subtitles: React.FC<{centerY?: number}> = ({centerY = 1340}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const chunk = CHUNKS.find((c) => frame >= Math.round(c.from * FPS) && frame < Math.round(c.to * FPS));
  if (!chunk) return null;
  const local = frame - Math.round(chunk.from * FPS);
  const prog = spring({frame: local, fps, config: {damping: 200, stiffness: 400, mass: 0.6}, durationInFrames: 8});
  const scale = interpolate(prog, [0, 0.55, 1], [0.6, 1.15, 1.0]);
  const opacity = interpolate(local, [0, 2], [0, 1], {extrapolateRight: 'clamp'});

  const tokens = chunk.text.split(/\s+/).filter((t) => t && !/^[—–-]+$/.test(t));
  const display = tokens.map((t) => t.toUpperCase()).join(' ');
  const {width} = measureText({text: display, fontFamily: FONT_NAME, fontWeight: '700', fontSize: BASE_SIZE, letterSpacing: '2px'});
  const fontSize = Math.min(BASE_SIZE, (BASE_SIZE * MAX_WIDTH) / width);
  const accent = SCENE_COLOR[chunk.scene];

  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: centerY, display: 'flex', justifyContent: 'center', transform: 'translateY(-50%)'}}>
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize,
          lineHeight: 1.05,
          letterSpacing: 2,
          whiteSpace: 'nowrap',
          color: '#fff',
          WebkitTextStroke: '6px rgba(0,0,0,0.85)',
          paintOrder: 'stroke fill',
          textShadow: '0 6px 24px rgba(0,0,0,0.8)',
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        {tokens.map((t, i) => (
          <span key={i} style={isAccent(t) ? {color: accent, textShadow: `0 0 18px ${accent}aa, 0 6px 24px rgba(0,0,0,0.8)`} : undefined}>
            {t.toUpperCase()}
            {i < tokens.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    </div>
  );
};
