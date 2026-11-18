import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {ActTheme, FONT_DISPLAY, FONT_BODY, glow, SAFE} from '../theme';

export type SceneProps<P = Record<string, any>> = P & {
  /** длительность сцены, кадры */
  dur: number;
  /** точки синхронизации внутри сцены, кадры от начала сцены */
  marks: Record<string, number>;
  theme: ActTheme;
  footage: Record<string, string>;
};

/** Пружина 0→1 с задержкой (кадры) */
export const useSpringIn = (delay = 0, config: Partial<{damping: number; stiffness: number; mass: number}> = {}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping: 13, stiffness: 160, mass: 0.7, ...config}});
};

/** Линейный прогресс 0→1 между кадрами a и b с easing */
export const useProgress = (a: number, b: number, ease = Easing.out(Easing.cubic)) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [a, Math.max(a + 1, b)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
};

/** Подогнать кегль под ширину */
export const fit = (text: string, maxWidth: number, base: number, k = 0.72) =>
  Math.min(base, maxWidth / Math.max(1, text.length * k));

export const fmtNum = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Область сцены: между HUD и субтитрами */
export const Stage: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: SAFE.top + 110,
      height: SAFE.captionY - SAFE.top - 150,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 36,
      ...style,
    }}
  >
    {children}
  </div>
);

export const NeonText: React.FC<{
  children: React.ReactNode;
  color: string;
  size: number;
  font?: 'display' | 'body';
  glowK?: number;
  fill?: string;
  style?: React.CSSProperties;
}> = ({children, color, size, font = 'display', glowK = 1, fill = '#fff', style}) => (
  <div
    style={{
      fontFamily: font === 'display' ? FONT_DISPLAY : FONT_BODY,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 1.02,
      color: fill,
      textShadow: glow(color, glowK),
      textAlign: 'center',
      letterSpacing: font === 'display' ? -1 : 0,
      whiteSpace: 'pre-line',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Pill: React.FC<{
  children: React.ReactNode;
  color: string;
  filled?: boolean;
  size?: number;
  style?: React.CSSProperties;
}> = ({children, color, filled, size = 34, style}) => (
  <div
    style={{
      fontFamily: FONT_BODY,
      fontWeight: 900,
      fontSize: size,
      padding: `${size * 0.32}px ${size * 0.75}px`,
      borderRadius: size * 0.6,
      border: `${Math.max(3, size * 0.1)}px solid ${color}`,
      background: filled ? color : 'rgba(5,2,12,0.75)',
      color: filled ? '#08040f' : '#fff',
      boxShadow: `0 0 18px ${color}, inset 0 0 12px ${filled ? 'transparent' : color + '55'}`,
      letterSpacing: 1,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);

export const NeonBox: React.FC<{
  color: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  radius?: number;
}> = ({color, children, style, radius = 36}) => (
  <div
    style={{
      border: `6px solid ${color}`,
      borderRadius: radius,
      background: 'linear-gradient(180deg, rgba(10,4,20,0.85), rgba(4,2,10,0.92))',
      boxShadow: `0 0 20px ${color}, 0 0 60px ${color}66, inset 0 0 30px ${color}44`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Обёртка появления: scale/blur/opacity по пружине */
export const PopIn: React.FC<{
  at?: number;
  children: React.ReactNode;
  from?: number;
  y?: number;
  rotate?: number;
  style?: React.CSSProperties;
}> = ({at = 0, children, from = 0.4, y = 0, rotate = 0, style}) => {
  const frame = useCurrentFrame();
  const s = useSpringIn(at);
  if (frame < at) return <div style={{opacity: 0, ...style}}>{children}</div>;
  return (
    <div
      style={{
        transform: `translateY(${(1 - s) * y}px) scale(${from + (1 - from) * s}) rotate(${(1 - s) * rotate}deg)`,
        opacity: Math.min(1, s * 1.6),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Детерминированный «шум» для дрожания */
export const jitter = (frame: number, seed: number, amp: number) =>
  Math.sin(frame * 12.9898 + seed * 78.233) * 43758.5453 % 1 * amp;
