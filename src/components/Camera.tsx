import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

/**
 * Медленная «камера»: наезд/отъезд (scale) + сдвиг + еле заметное покачивание, как у стедикама.
 * Точка фокуса (originX/originY в %) — куда наезжаем.
 */
export const Camera: React.FC<{
  from?: number;
  to: number;
  scale: [number, number];
  originX?: number;
  originY?: number;
  pan?: [number, number]; // сдвиг по X, px
  tilt?: [number, number]; // сдвиг по Y, px
  sway?: number;
  easing?: (t: number) => number;
  children: React.ReactNode;
}> = ({from = 0, to, scale, originX = 50, originY = 50, pan = [0, 0], tilt = [0, 0], sway = 1, easing = Easing.inOut(Easing.cubic), children}) => {
  const frame = useCurrentFrame();
  const opts = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const, easing};
  const s = interpolate(frame, [from, to], scale, opts);
  const x = interpolate(frame, [from, to], pan, opts) + Math.sin(frame * 0.021) * 4 * sway;
  const y = interpolate(frame, [from, to], tilt, opts) + Math.cos(frame * 0.017) * 3 * sway;
  const r = Math.sin(frame * 0.013) * 0.25 * sway;
  return (
    <AbsoluteFill
      style={{
        transformOrigin: `${originX}% ${originY}%`,
        transform: `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
