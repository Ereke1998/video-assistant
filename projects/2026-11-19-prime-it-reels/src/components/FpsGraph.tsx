// График FPS (падает) + мигающая иконка критического перегрева.
import React from 'react';
import {COLORS} from '../lib/colors';
import {FONT_FAMILY} from './font';

export const fpsAt = (t: number) => {
  // t: 0..1 прогресс сцены
  const base = t < 0.25 ? 144 - t * 120 : t < 0.55 ? 114 - (t - 0.25) * 230 : Math.max(9, 45 - (t - 0.55) * 80);
  const jitter = Math.sin(t * 91) * 6 + Math.sin(t * 237) * 4;
  return Math.max(6, base + jitter * (t > 0.45 ? 1.4 : 1));
};

export const FpsGraph: React.FC<{progress: number; opacity: number; blink: boolean; y?: number}> = ({progress, opacity, blink, y = 1290}) => {
  const W = 760;
  const H = 210;
  const N = 90;
  const pts: string[] = [];
  const last = Math.max(1, Math.floor(N * progress));
  for (let i = 0; i <= last; i++) {
    const t = i / N;
    const v = fpsAt(t);
    pts.push(`${(t * (W - 40)).toFixed(1)},${(H - 30 - (v / 150) * (H - 50)).toFixed(1)}`);
  }
  const cur = fpsAt(last / N);
  const lineCol = cur < 40 ? COLORS.heat : cur < 90 ? COLORS.accent : COLORS.cool;
  return (
    <div style={{position: 'absolute', left: 60, top: y, width: 960, height: H + 20, opacity, display: 'flex', alignItems: 'center', gap: 22}}>
      <div
        style={{
          width: W,
          height: H,
          borderRadius: 26,
          background: 'rgba(10,12,18,0.78)',
          border: `3px solid ${lineCol}66`,
          boxShadow: `0 0 30px ${lineCol}33`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <svg width={W} height={H} style={{position: 'absolute', left: 20, top: 0}}>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1={0} x2={W - 40} y1={g * (H - 20)} y2={g * (H - 20)} stroke="#ffffff14" strokeWidth={2} />
          ))}
          <polyline points={pts.join(' ')} fill="none" stroke={lineCol} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" style={{filter: `drop-shadow(0 0 8px ${lineCol})`}} />
        </svg>
        <div style={{position: 'absolute', right: 22, top: 12, fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 46, color: lineCol, textAlign: 'right', lineHeight: 1}}>
          <span style={{fontSize: 30, color: '#9aa3b5', marginRight: 10}}>FPS</span>
          {Math.round(cur)}
        </div>
      </div>
      {/* иконка критического перегрева */}
      <svg width={160} height={150} viewBox="0 0 160 150" style={{opacity: blink ? 1 : 0.18, filter: blink ? `drop-shadow(0 0 22px ${COLORS.heat})` : 'none'}}>
        <polygon points="80,8 154,140 6,140" fill={COLORS.heat} stroke="#fff" strokeWidth={6} strokeLinejoin="round" />
        <rect x={72} y={48} width={16} height={50} rx={8} fill="#fff" />
        <circle cx={80} cy={112} r={14} fill="#fff" />
        <circle cx={80} cy={112} r={8} fill={COLORS.heat} />
        <rect x={77} y={70} width={6} height={40} fill={COLORS.heat} />
      </svg>
    </div>
  );
};
