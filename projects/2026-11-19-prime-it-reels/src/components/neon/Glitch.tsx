// Глитч всего кадра: RGB-сдвиг (SVG-фильтр), горизонтальные срезы, scanlines, тряска.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {rand, shakeNoise} from '../../lib/anim';

export const Glitch: React.FC<{from: number; to: number; children: React.ReactNode}> = ({from, to, children}) => {
  const f = useCurrentFrame();
  const on = f >= from && f < to;
  if (!on) return <>{children}</>;
  const k = 1 - Math.max(0, (f - (to - 8)) / 8);
  const r = rand(f * 13 + 7);
  const dx = (14 + r() * 20) * k;
  const sx = shakeNoise(f / 60, 1) * 18 * k;
  const sy = shakeNoise(f / 60, 2) * 10 * k;
  const slices = Array.from({length: 5}).map(() => ({y: r() * 1920, h: 20 + r() * 90, x: (r() - 0.5) * 120 * k}));
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id="rgbsplit" x="-5%" y="0%" width="110%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx={dx} dy={0} result="r2" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="b" dx={-dx} dy={dx * 0.2} result="b2" />
          <feBlend mode="screen" in="r2" in2="g" result="rg" />
          <feBlend mode="screen" in="rg" in2="b2" />
        </filter>
      </svg>
      <div style={{position: 'absolute', inset: 0, filter: 'url(#rgbsplit)', transform: `translate(${sx}px, ${sy}px)`}}>{children}</div>
      {/* смещённые срезы — копии кадра сдвигать дорого, поэтому тёмные/цветные полосы */}
      {slices.map((s, i) => (
        <div key={i} style={{position: 'absolute', left: s.x, top: s.y, width: 1080, height: s.h, background: i % 2 ? 'rgba(255,45,58,0.18)' : 'rgba(61,216,255,0.14)', mixBlendMode: 'screen'}} />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 2px, transparent 2px, transparent 5px)',
          opacity: k,
        }}
      />
    </div>
  );
};
