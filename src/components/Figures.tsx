import React from 'react';
import {C} from '../theme';

/**
 * Стилизованные силуэты людей. Приём «контровой свет»: под тёмным силуэтом лежит его тёплая размытая
 * копия со смещением — по краю проступает тёплое свечение, как от контрового прибора.
 */

let uid = 0;
const useId = (p: string) => React.useMemo(() => `${p}-${uid++}`, [p]);

export const RimLit: React.FC<{
  width: number;
  height: number;
  viewBox: string;
  rim?: string;
  rimOffset?: [number, number];
  rimBlur?: number;
  rimOpacity?: number;
  fill?: string;
  fillTop?: string;
  children: (fill: string) => React.ReactNode;
  style?: React.CSSProperties;
}> = ({
  width,
  height,
  viewBox,
  rim = C.warm,
  rimOffset = [7, -5],
  rimBlur = 7,
  rimOpacity = 0.95,
  fill,
  fillTop = '#0d1f2e',
  children,
  style,
}) => {
  const gid = useId('body');
  const fid = useId('rimblur');
  return (
    <svg width={width} height={height} viewBox={viewBox} style={{overflow: 'visible', ...style}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={fillTop} />
          <stop offset="1" stopColor="#02060b" />
        </linearGradient>
        <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={rimBlur} />
        </filter>
      </defs>
      <g transform={`translate(${rimOffset[0]} ${rimOffset[1]})`} filter={`url(#${fid})`} opacity={rimOpacity}>
        {children(rim)}
      </g>
      <g transform={`translate(${rimOffset[0] * 0.35} ${rimOffset[1] * 0.35})`} opacity={rimOpacity * 0.9}>
        {children(rim)}
      </g>
      <g>{children(fill ?? `url(#${gid})`)}</g>
    </svg>
  );
};

/** Голова + плечи (бюст), вид спереди. viewBox 0 0 400 460. */
export const BUST_PATH =
  'M200 20 C255 20 290 62 290 125 C290 175 270 215 245 238 L245 272 C300 288 360 305 385 345 C398 368 400 410 400 460 L0 460 C0 410 2 368 15 345 C40 305 100 288 155 272 L155 238 C130 215 110 175 110 125 C110 62 145 20 200 20 Z';

/** Человек в полный рост, пишет в воздухе (вид сбоку, правая рука вытянута вперёд). viewBox 0 0 300 700. */
export const WriterFigure: React.FC<{armAngle: number; size: number; rimOpacity?: number}> = ({armAngle, size, rimOpacity = 1}) => (
  <RimLit width={size * 0.43} height={size} viewBox="0 0 300 700" rimOffset={[-8, -6]} rimBlur={8} rimOpacity={rimOpacity}>
    {(fill) => (
      <g fill={fill} stroke={fill} strokeLinecap="round" strokeLinejoin="round">
        {/* голова */}
        <ellipse cx="128" cy="72" rx="44" ry="52" stroke="none" />
        {/* шея + торс */}
        <path d="M112 118 L146 118 L150 150 C190 162 200 200 196 260 L188 380 L84 380 L76 260 C72 200 80 160 110 150 Z" stroke="none" />
        {/* ноги */}
        <path d="M100 370 L92 520 L86 680" strokeWidth="44" fill="none" />
        <path d="M168 370 L172 520 L182 680" strokeWidth="44" fill="none" />
        <path d="M70 684 L118 684" strokeWidth="26" fill="none" />
        <path d="M160 684 L214 684" strokeWidth="26" fill="none" />
        {/* дальняя рука вдоль тела */}
        <path d="M92 175 L78 285 L88 360" strokeWidth="30" fill="none" />
        {/* ближняя рука с ручкой — плечо 165,175; угол меняется */}
        <g transform={`rotate(${armAngle} 165 178)`}>
          <path d="M165 178 L205 262 L268 236" strokeWidth="30" fill="none" />
          <path d="M268 236 L300 214" strokeWidth="6" fill="none" />
        </g>
      </g>
    )}
  </RimLit>
);
