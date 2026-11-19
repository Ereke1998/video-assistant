// Пословные субтитры: одно слово за раз, pop-in 0.6 → 1.15 → 1.0 через spring.
import {measureText} from '@remotion/layout-utils';
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {WORDS} from '../data/script';
import {COLORS} from '../lib/colors';
import {FONT_FAMILY, FONT_NAME} from './font';

const BASE_SIZE = 150;
const MAX_WIDTH = 960;
const STROKE = 14;

export const isAccent = (w: string) => {
  const letters = w.replace(/[^\p{L}]/gu, '');
  return letters.length >= 2 && letters === letters.toUpperCase();
};

export const Subtitles: React.FC<{centerY?: number}> = ({centerY = 0.58}) => {
  const frame = useCurrentFrame();
  const {fps, height} = useVideoConfig();
  const word = WORDS.find((w) => frame >= w.start && frame < w.end);
  if (!word) return null;

  const local = frame - word.start;
  // spring без перелёта 0→1 за ~8 кадров, отображается в ключи 0.6 → 1.15 → 1.0
  const prog = spring({frame: local, fps, config: {damping: 200, stiffness: 400, mass: 0.6}, durationInFrames: 8});
  const scale = interpolate(prog, [0, 0.55, 1], [0.6, 1.15, 1.0]);
  const opacity = interpolate(local, [0, 2], [0, 1], {extrapolateRight: 'clamp'});

  const {width} = measureText({text: word.text, fontFamily: FONT_NAME, fontWeight: '800', fontSize: BASE_SIZE, letterSpacing: '0px'});
  const fontSize = Math.min(BASE_SIZE, (BASE_SIZE * MAX_WIDTH) / (width + STROKE * 2));
  const color = isAccent(word.text) ? COLORS.accent : COLORS.white;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: height * centerY,
        display: 'flex',
        justifyContent: 'center',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 800,
          fontSize,
          lineHeight: 1,
          color,
          WebkitTextStroke: `${STROKE}px #000`,
          paintOrder: 'stroke fill',
          textShadow: '0 10px 28px rgba(0,0,0,0.65), 0 0 6px rgba(0,0,0,0.5)',
          transform: `scale(${scale})`,
          opacity,
          whiteSpace: 'nowrap',
          letterSpacing: 0,
        }}
      >
        {word.text}
      </div>
    </div>
  );
};
