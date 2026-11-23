import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {C} from '../theme';

/** Фон: глубокий тёмно-синий с бирюзовой дымкой. */
export const Backdrop: React.FC<{
  glowX?: number;
  glowY?: number;
  glowColor?: string;
  intensity?: number;
}> = ({glowX = 50, glowY = 40, glowColor = 'rgba(25, 120, 150, 0.55)', intensity = 1}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 70% 45% at ${glowX}% ${glowY}%, ${glowColor} 0%, rgba(8,40,60,${0.35 * intensity}) 45%, transparent 75%),
        linear-gradient(180deg, ${C.deep} 0%, ${C.navy} 55%, ${C.black} 100%)`,
    }}
  />
);

/** Объёмные лучи света: размытые полупрозрачные полосы с режимом наложения screen. */
export const LightRays: React.FC<{
  count?: number;
  originX?: number; // px
  originY?: number; // px
  spread?: number; // градусы
  color?: string;
  opacity?: number;
  seed?: string;
  length?: number;
}> = ({count = 6, originX = 540, originY = -200, spread = 50, color = '150, 230, 255', opacity = 1, seed = 'rays', length = 2600}) => {
  const frame = useCurrentFrame();
  const rays = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => ({
        angle: -spread / 2 + (spread * (i + random(`${seed}-a${i}`) * 0.8)) / count,
        width: 60 + random(`${seed}-w${i}`) * 180,
        alpha: 0.05 + random(`${seed}-o${i}`) * 0.09,
        speed: 0.01 + random(`${seed}-s${i}`) * 0.02,
        phase: random(`${seed}-p${i}`) * Math.PI * 2,
      })),
    [count, spread, seed],
  );
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', pointerEvents: 'none', opacity}}>
      {rays.map((r, i) => {
        const breathe = 0.65 + 0.35 * Math.sin(frame * r.speed + r.phase);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: originX - r.width / 2,
              top: originY,
              width: r.width,
              height: length,
              transformOrigin: '50% 0%',
              transform: `rotate(${r.angle + Math.sin(frame * 0.004 + r.phase) * 1.5}deg)`,
              background: `linear-gradient(180deg, rgba(${color}, ${r.alpha * 1.6 * breathe}) 0%, rgba(${color}, ${r.alpha * breathe}) 40%, transparent 100%)`,
              filter: 'blur(28px)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Пыль в воздухе с глубиной резкости: крупные частицы ближе и сильнее размыты. */
export const Dust: React.FC<{count?: number; seed?: string; color?: string; drift?: number; opacity?: number}> = ({
  count = 60,
  seed = 'dust',
  color = '200, 240, 255',
  drift = 1,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const parts = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => {
        const depth = random(`${seed}-d${i}`);
        return {
          x: random(`${seed}-x${i}`) * 1080,
          y: random(`${seed}-y${i}`) * 1920,
          size: 2 + depth * depth * 16,
          blur: depth > 0.75 ? 2 + (depth - 0.75) * 30 : depth < 0.2 ? 1.5 : 0.3,
          speed: (0.15 + depth * 0.6) * drift,
          sway: random(`${seed}-s${i}`) * Math.PI * 2,
          alpha: 0.18 + random(`${seed}-a${i}`) * 0.5,
        };
      }),
    [count, seed, drift],
  );
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
      {parts.map((p, i) => {
        const y = (((p.y - frame * p.speed) % 2000) + 2000) % 2000 - 40;
        const x = p.x + Math.sin(frame * 0.02 + p.sway) * 14;
        const twinkle = 0.6 + 0.4 * Math.sin(frame * 0.05 + p.sway * 3);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: `rgba(${color}, ${p.alpha * twinkle})`,
              filter: `blur(${p.blur}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{strength?: number}> = ({strength = 0.85}) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `radial-gradient(ellipse 85% 70% at 50% 48%, transparent 45%, rgba(0,0,0,${strength}) 100%)`,
    }}
  />
);

/** Плёночное зерно: SVG-шум, меняющий seed каждый кадр. */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.07}) => {
  const frame = useCurrentFrame();
  const seed = frame % 12;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity}}>
      <svg width="100%" height="100%">
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Цветокоррекция «teal & orange»: холодные тени, лёгкое поднятие чёрного. */
export const Grade: React.FC = () => (
  <>
    <AbsoluteFill style={{pointerEvents: 'none', background: 'rgba(10, 60, 80, 0.10)', mixBlendMode: 'soft-light'}} />
    <AbsoluteFill style={{pointerEvents: 'none', background: 'rgba(8, 18, 28, 0.12)', mixBlendMode: 'lighten'}} />
  </>
);

/** Мягкое затемнение в начале/конце сцены (dip to black). */
export const SceneFade: React.FC<{duration: number; fadeIn?: number; fadeOut?: number; children: React.ReactNode}> = ({
  duration,
  fadeIn = 10,
  fadeOut = 10,
  children,
}) => {
  const frame = useCurrentFrame();
  const inOp = fadeIn > 0 ? interpolate(frame, [0, fadeIn], [0, 1], {extrapolateRight: 'clamp'}) : 1;
  const outOp =
    fadeOut > 0
      ? interpolate(frame, [duration - fadeOut, duration], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
      : 1;
  return <AbsoluteFill style={{opacity: Math.min(inOp, outOp), backgroundColor: C.black}}>{children}</AbsoluteFill>;
};
