// Тёмный фон с лучами из центра (sunburst), центральным свечением и мерцающими звёздочками.
import React from 'react';
import {AbsoluteFill, interpolateColors, useCurrentFrame} from 'remotion';
import {SCENES} from '../../data/script';
import {rand} from '../../lib/anim';
import {COLORS, SCENE_COLOR} from '../../lib/colors';

export const CENTER = {x: 540, y: 820};

export const sceneColorAt = (frame: number) => {
  const xs: number[] = [];
  const cs: string[] = [];
  SCENES.forEach((s, i) => {
    const f0 = s.from * 60;
    if (i > 0) {
      xs.push(f0 - 6);
      cs.push(SCENE_COLOR[SCENES[i - 1].id]);
    }
    xs.push(f0 + (i > 0 ? 6 : 0));
    cs.push(SCENE_COLOR[s.id]);
  });
  return interpolateColors(frame, xs, cs);
};

const STARS = (() => {
  const r = rand(31);
  return Array.from({length: 12}).map(() => ({
    x: 80 + r() * 920,
    y: 380 + r() * 900,
    s: 14 + r() * 26,
    ph: r() * 6.28,
    sp: 0.06 + r() * 0.08,
  }));
})();

export const Star: React.FC<{x: number; y: number; size: number; color: string; opacity: number}> = ({x, y, size, color, opacity}) => (
  <svg width={size} height={size} viewBox="-10 -10 20 20" style={{position: 'absolute', left: x - size / 2, top: y - size / 2, opacity, filter: `drop-shadow(0 0 6px ${color})`}}>
    <path d="M0 -10 Q1.2 -1.2 10 0 Q1.2 1.2 0 10 Q-1.2 1.2 -10 0 Q-1.2 -1.2 0 -10 Z" fill="#ffffff" />
  </svg>
);

export const Background: React.FC<{freezeAt?: number}> = ({freezeAt = 1830}) => {
  const raw = useCurrentFrame();
  const frame = Math.min(raw, freezeAt);
  const c = sceneColorAt(frame);
  const rot = frame * 0.06;
  const pulse = 0.85 + 0.15 * Math.sin(frame * 0.05);
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg, overflow: 'hidden'}}>
      {/* лучи */}
      <div
        style={{
          position: 'absolute',
          left: CENTER.x - 1300,
          top: CENTER.y - 1300,
          width: 2600,
          height: 2600,
          background: `repeating-conic-gradient(from ${rot}deg at 50% 50%, ${c} 0deg, transparent 4.5deg, transparent 15deg)`,
          opacity: 0.42 * pulse,
          filter: 'blur(10px)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.9) 12%, rgba(0,0,0,0.35) 32%, transparent 52%)',
        }}
      />
      {/* центральное свечение */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at ${CENTER.x}px ${CENTER.y}px, ${c}55 0px, ${c}22 260px, transparent 720px)`,
        }}
      />
      {/* виньетка */}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,0.75) 100%)'}} />
      {STARS.map((s, i) => (
        <Star key={i} x={s.x} y={s.y} size={s.s} color={c} opacity={Math.max(0, Math.sin(frame * s.sp + s.ph)) * 0.9} />
      ))}
    </AbsoluteFill>
  );
};
