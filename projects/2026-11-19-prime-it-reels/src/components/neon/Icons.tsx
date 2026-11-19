// Неоновые линейные иконки (SVG 200×200). draw — прорисовка линии 0..1.
import React from 'react';
import {rand} from '../../lib/anim';

type P = {draw?: number; color: string; sw?: number};

/** Контейнер иконки с неоновым свечением. */
export const NeonSvg: React.FC<{
  size: number;
  x: number; // центр
  y: number;
  color: string;
  children: React.ReactNode;
  opacity?: number;
  rotate?: number;
  scale?: number;
  glowK?: number;
  style?: React.CSSProperties;
}> = ({size, x, y, color, children, opacity = 1, rotate = 0, scale = 1, glowK = 1, style}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    style={{
      position: 'absolute',
      left: x - size / 2,
      top: y - size / 2,
      overflow: 'visible',
      opacity,
      transform: `rotate(${rotate}deg) scale(${scale})`,
      filter: `drop-shadow(0 0 ${4 * glowK}px ${color}) drop-shadow(0 0 ${14 * glowK}px ${color})`,
      ...style,
    }}
  >
    {children}
  </svg>
);

/** Линия с прорисовкой. */
export const Line: React.FC<P & {d: string; fill?: string}> = ({d, draw = 1, color, sw = 7, fill = 'none'}) => (
  <path
    d={d}
    pathLength={1}
    strokeDasharray="1 1"
    strokeDashoffset={1 - draw}
    stroke={color}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    fill={fill}
  />
);

const lines = (ds: string[], p: P) => ds.map((d, i) => <Line key={i} d={d} {...p} />);

export const IconCalendar: React.FC<P> = (p) => (
  <g>
    {lines(['M30 52 H170 Q178 52 178 60 V168 Q178 176 170 176 H30 Q22 176 22 168 V60 Q22 52 30 52 Z', 'M22 88 H178', 'M64 30 V68', 'M136 30 V68'], p)}
  </g>
);

export const IconFan: React.FC<P & {angle?: number}> = ({angle = 0, ...p}) => (
  <g>
    {lines(['M100 12 A88 88 0 1 1 99.9 12 Z'], p)}
    <g transform={`rotate(${angle} 100 100)`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`rotate(${i * 72} 100 100)`}>
          <Line d="M100 82 C108 52 132 34 158 44 C146 64 124 80 108 90" {...p} />
        </g>
      ))}
      <Line d="M100 82 A18 18 0 1 1 99.9 82 Z" {...p} />
    </g>
  </g>
);

export const IconChip: React.FC<P> = (p) => {
  const pins: string[] = [];
  for (let i = 0; i < 5; i++) {
    const o = 62 + i * 19;
    pins.push(`M${o} 44 V22`, `M${o} 156 V178`, `M44 ${o} H22`, `M156 ${o} H178`);
  }
  return <g>{lines(['M54 44 H146 Q156 44 156 54 V146 Q156 156 146 156 H54 Q44 156 44 146 V54 Q44 44 54 44 Z', ...pins], p)}</g>;
};

export const IconLaptop: React.FC<P> = (p) => (
  <g>{lines(['M44 50 H156 Q164 50 164 58 V132 H36 V58 Q36 50 44 50 Z', 'M14 140 H186 L176 158 H24 Z', 'M84 148 H116'], p)}</g>
);

export const IconFlame: React.FC<P & {t?: number}> = ({t = 0, ...p}) => {
  const k = 1 + 0.06 * Math.sin(t * 22);
  return (
    <g transform={`translate(100 190) scale(${1 / k} ${k}) translate(-100 -190)`}>
      {lines(
        [
          'M100 10 C126 48 166 70 158 126 C152 166 126 188 100 188 C74 188 46 166 42 126 C38 92 62 74 70 44 C82 66 90 76 100 10 Z',
          'M100 86 C114 108 132 122 126 150 C122 170 112 178 100 178 C88 178 76 170 74 150 C72 132 86 120 88 104 C94 116 96 118 100 86 Z',
        ],
        p,
      )}
    </g>
  );
};

export const IconSpeaker: React.FC<P & {waves?: number; muted?: boolean}> = ({waves = 1, muted, ...p}) => (
  <g>
    {lines(['M30 78 H62 L104 42 V158 L62 122 H30 Z'], p)}
    {!muted &&
      [0, 1, 2].map((i) => (
        <g key={i} opacity={Math.max(0, Math.min(1, waves * 3 - i))}>
          <Line d={`M${124 + i * 20} ${70 - i * 16} Q${148 + i * 24} 100 ${124 + i * 20} ${130 + i * 16}`} {...p} />
        </g>
      ))}
    {muted && lines(['M128 76 L176 124', 'M176 76 L128 124'], p)}
  </g>
);

export const IconSpinner: React.FC<P & {angle?: number}> = ({angle = 0, ...p}) => (
  <g transform={`rotate(${angle} 100 100)`}>
    {Array.from({length: 8}).map((_, i) => (
      <g key={i} transform={`rotate(${i * 45} 100 100)`} opacity={0.25 + (i / 8) * 0.75}>
        <Line d="M100 22 V58" {...p} />
      </g>
    ))}
  </g>
);

export const IconBolt: React.FC<P> = (p) => <g>{lines(['M116 12 L46 112 H96 L84 188 L156 84 H106 Z'], p)}</g>;

export const IconShield: React.FC<P> = (p) => (
  <g>{lines(['M100 14 L168 40 V96 C168 140 140 172 100 188 C60 172 32 140 32 96 V40 Z', 'M68 100 L92 124 L136 78'], p)}</g>
);

export const IconCheck: React.FC<P> = (p) => <g>{lines(['M100 10 A90 90 0 1 1 99.9 10 Z', 'M56 102 L88 134 L148 70'], p)}</g>;

export const IconPlane: React.FC<P> = (p) => (
  <g>{lines(['M14 96 L186 22 L142 178 L98 118 Z', 'M98 118 L186 22', 'M98 118 V164 L122 140'], p)}</g>
);

export const IconWarning: React.FC<P> = (p) => (
  <g>{lines(['M100 18 L186 170 H14 Z', 'M100 74 V118', 'M100 144 V146'], p)}</g>
);

export const IconReceipt: React.FC<P> = (p) => (
  <g>
    {lines(['M40 14 H160 V186 L144 174 L128 186 L112 174 L100 186 L88 174 L72 186 L56 174 L40 186 Z', 'M62 50 H138', 'M62 76 H120'], p)}
  </g>
);

export const IconTube: React.FC<P> = (p) => (
  <g>{lines(['M30 70 H130 L150 88 V112 L130 130 H30 Q20 130 20 120 V80 Q20 70 30 70 Z', 'M150 92 H180 V108 H150', 'M50 70 V130'], p)}</g>
);

export const IconPads: React.FC<P> = (p) => (
  <g>{lines(['M20 60 H90 V140 H20 Z', 'M110 60 H180 V140 H110 Z', 'M20 100 H90', 'M110 100 H180'], p)}</g>
);

export const IconBroom: React.FC<P> = (p) => (
  <g>{lines(['M150 16 L104 96', 'M84 88 L124 110 L104 180 Q70 170 44 150 Z', 'M72 140 L86 112', 'M92 160 L104 120'], p)}</g>
);

/** Серые комья пыли (не неон): плотность растёт с amount. */
export const DustBlobs: React.FC<{amount: number; seed?: number; cx?: number; cy?: number; r?: number; blow?: number}> = ({
  amount,
  seed = 3,
  cx = 100,
  cy = 100,
  r = 85,
  blow = 0,
}) => {
  const blobs = React.useMemo(() => {
    const g = rand(seed);
    return Array.from({length: 70}).map(() => {
      const a = g() * Math.PI * 2;
      const rr = 20 + Math.sqrt(g()) * (r - 20);
      return {x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr, s: 5 + g() * 11, t: g() * 0.9, vx: 0.6 + g(), vy: (g() - 0.5) * 1.2};
    });
  }, [seed, cx, cy, r]);
  return (
    <g style={{filter: 'none'}}>
      {blobs.map((b, i) => {
        const k = Math.max(0, Math.min(1, (amount - b.t) / 0.1));
        if (k <= 0) return null;
        const d = blow * blow * 260;
        return (
          <g key={i} transform={`translate(${b.x + b.vx * d} ${b.y + b.vy * d})`} opacity={1 - blow}>
            <circle r={b.s * k} fill="#8E8A86" />
            <circle r={b.s * k * 0.6} cx={b.s * 0.5} cy={-b.s * 0.3} fill="#a7a39f" />
            <circle r={b.s * k * 0.55} cx={-b.s * 0.55} cy={b.s * 0.25} fill="#77736f" />
          </g>
        );
      })}
    </g>
  );
};
