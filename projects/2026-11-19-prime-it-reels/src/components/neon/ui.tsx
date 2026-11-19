// Базовые неоновые элементы: плашка-таблетка, карточка, обёртка шота, поп-анимации.
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp} from '../../lib/anim';
import {FONT_FAMILY} from '../font';

/** Пружинный «поп» 0.6 → 1.15 → 1.0 (как у субтитров). */
export const usePop = (delay = 0, dur = 10) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - delay, fps, config: {damping: 200, stiffness: 300, mass: 0.6}, durationInFrames: dur});
  return {
    scale: interpolate(p, [0, 0.55, 1], [0.6, 1.12, 1.0]),
    opacity: interpolate(f - delay, [0, 3], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
    p,
  };
};

export const glow = (c: string, k = 1) =>
  `0 0 ${8 * k}px ${c}, 0 0 ${22 * k}px ${c}aa, 0 0 ${48 * k}px ${c}55`;

export const Pill: React.FC<{
  children: React.ReactNode;
  color: string;
  delay?: number;
  size?: number;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({children, color, delay = 0, size = 36, icon, style}) => {
  const {scale, opacity} = usePop(delay);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: `${size * 0.28}px ${size * 0.75}px`,
        borderRadius: 999,
        background: 'rgba(8,8,12,0.88)',
        border: `3px solid ${color}`,
        boxShadow: `${glow(color, 0.6)}, inset 0 0 14px ${color}44`,
        fontFamily: FONT_FAMILY,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1,
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        whiteSpace: 'nowrap',
        transform: `scale(${scale})`,
        opacity,
        ...style,
      }}
    >
      {icon}
      {children}
    </div>
  );
};

/** Плашка, отцентрованная по горизонтали на заданном y. */
export const TopPill: React.FC<{children: React.ReactNode; color: string; y?: number; delay?: number; icon?: React.ReactNode; size?: number}> = ({
  y = 380,
  ...rest
}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center'}}>
    <Pill {...rest} />
  </div>
);

export const NeonCard: React.FC<{
  color: string;
  width: number;
  height: number;
  x: number; // центр
  y: number; // центр
  delay?: number;
  radius?: number;
  fill?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({color, width, height, x, y, delay = 0, radius = 40, fill = 0.14, children, style}) => {
  const {scale, opacity} = usePop(delay, 12);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - width / 2,
        top: y - height / 2,
        width,
        height,
        borderRadius: radius,
        border: `5px solid ${color}`,
        background: `linear-gradient(160deg, ${color}${Math.round(fill * 255).toString(16).padStart(2, '0')}, rgba(8,8,12,0.85) 70%)`,
        boxShadow: `${glow(color)}, inset 0 0 30px ${color}55`,
        transform: `scale(${scale})`,
        opacity,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const BigNumber: React.FC<{children: React.ReactNode; color: string; size?: number; style?: React.CSSProperties}> = ({children, color, size = 200, style}) => (
  <div
    style={{
      fontFamily: FONT_FAMILY,
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1,
      color: '#fff',
      textShadow: glow(color, 1.2),
      whiteSpace: 'nowrap',
      fontVariantNumeric: 'tabular-nums',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Обёртка шота: появление — поп, уход — короткий зум-аут с затуханием. */
export const ShotFx: React.FC<{dur: number; children: React.ReactNode; out?: boolean; inFrames?: number}> = ({dur, children, out = true, inFrames = 10}) => {
  const f = useCurrentFrame();
  const enter = clamp(f / inFrames);
  const leave = out ? clamp((f - (dur - 8)) / 8) : 0;
  const s = interpolate(enter, [0, 1], [0.92, 1]) * (1 + leave * 0.12);
  return (
    <div style={{position: 'absolute', inset: 0, transform: `scale(${s})`, opacity: Math.min(enter * 1.5, 1) * (1 - leave)}}>{children}</div>
  );
};

/** Счётчик с ease-out. */
export const countUp = (f: number, from: number, to: number, start: number, dur: number) => {
  const t = clamp((f - start) / dur);
  return from + (to - from) * (1 - Math.pow(1 - t, 3));
};
