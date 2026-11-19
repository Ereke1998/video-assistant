// Стилизованный термометр-циферблат со стрелкой (HUD поверх 3D).
import React from 'react';
import {COLORS} from '../lib/colors';
import {FONT_FAMILY} from './font';

const MIN = 20;
const MAX = 110;
const A0 = -125;
const A1 = 125;

export const Gauge: React.FC<{value: number; opacity?: number; x?: number; y?: number; scale?: number; blink?: number}> = ({
  value,
  opacity = 1,
  x = 790,
  y = 300,
  scale = 1,
  blink = 0,
}) => {
  const k = Math.min(1, Math.max(0, (value - MIN) / (MAX - MIN)));
  const ang = A0 + (A1 - A0) * k;
  const R = 120;
  const hot = Math.min(1, Math.max(0, (value - 60) / 30));
  const col = hot > 0.5 ? COLORS.heat : value < 60 ? COLORS.cool : COLORS.accent;
  const arc = (a0: number, a1: number, r: number) => {
    const p = (a: number) => {
      const rad = ((a - 90) * Math.PI) / 180;
      return [Math.cos(rad) * r, Math.sin(rad) * r];
    };
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const ticks = Array.from({length: 10}).map((_, i) => A0 + ((A1 - A0) * i) / 9);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 150 * scale,
        top: y,
        width: 300,
        height: 300,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        opacity,
        filter: `drop-shadow(0 0 ${10 + hot * 18}px ${col}aa)`,
      }}
    >
      <svg width={300} height={300} viewBox="-150 -150 300 300">
        <defs>
          <linearGradient id="gArc" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={COLORS.cool} />
            <stop offset="0.55" stopColor={COLORS.accent} />
            <stop offset="1" stopColor={COLORS.heat} />
          </linearGradient>
          <radialGradient id="gBg">
            <stop offset="0" stopColor="#151822" />
            <stop offset="1" stopColor="#07080c" />
          </radialGradient>
        </defs>
        <circle r={142} fill="url(#gBg)" stroke="#2a2f3c" strokeWidth={4} />
        <path d={arc(A0, A1, R)} stroke="#20242e" strokeWidth={18} fill="none" strokeLinecap="round" />
        <path d={arc(A0, Math.max(A0 + 0.5, ang), R)} stroke="url(#gArc)" strokeWidth={18} fill="none" strokeLinecap="round" />
        {ticks.map((a, i) => {
          const rad = ((a - 90) * Math.PI) / 180;
          return (
            <line key={i} x1={Math.cos(rad) * 92} y1={Math.sin(rad) * 92} x2={Math.cos(rad) * 102} y2={Math.sin(rad) * 102} stroke="#6b7280" strokeWidth={3} />
          );
        })}
        {/* иконка термометра */}
        <g transform="translate(0,-52)" opacity={0.9}>
          <rect x={-7} y={-26} width={14} height={34} rx={7} fill="none" stroke="#cfd6e4" strokeWidth={3.5} />
          <circle cy={14} r={11} fill={col} stroke="#cfd6e4" strokeWidth={3.5} />
          <rect x={-3} y={-12 + (1 - k) * 14} width={6} height={26 - (1 - k) * 14} fill={col} />
        </g>
        {/* стрелка */}
        <g transform={`rotate(${ang})`}>
          <polygon points="-7,0 7,0 1.5,-112 -1.5,-112" fill="#ffffff" />
          <polygon points="-7,0 7,0 0,22" fill="#ffffff" />
        </g>
        <circle r={14} fill="#0b0d12" stroke="#ffffff" strokeWidth={4} />
        <text
          y={82}
          textAnchor="middle"
          fontFamily={FONT_FAMILY}
          fontWeight={700}
          fontSize={52}
          fill={blink > 0.5 ? '#ffffff' : col}
          style={{paintOrder: 'stroke'}}
          stroke="#000"
          strokeWidth={6}
        >
          {Math.round(value)}°C
        </text>
      </svg>
    </div>
  );
};
