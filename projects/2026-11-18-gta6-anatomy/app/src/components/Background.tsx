import React, {useMemo} from 'react';
import {interpolateColors, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {ActTheme, ACT_THEME, H, W} from '../theme';
import {TL} from '../timeline';

const HORIZON = 1190;

/** Тема в момент времени t с плавным перетеканием на стыке актов (0.6 с) */
export const themeAt = (t: number): ActTheme => {
  const acts = TL.acts;
  let idx = acts.findIndex((a) => t < a.end);
  if (idx < 0) idx = acts.length - 1;
  const cur = ACT_THEME[acts[idx].id];
  const prev = idx > 0 ? ACT_THEME[acts[idx - 1].id] : null;
  const blendDur = 0.6;
  const k = prev ? Math.min(1, (t - acts[idx].start) / blendDur) : 1;
  if (!prev || k >= 1) return cur;
  const mix = (a: string, b: string) => interpolateColors(k, [0, 1], [a, b]);
  return {
    a: mix(prev.a, cur.a),
    b: mix(prev.b, cur.b),
    skyTop: mix(prev.skyTop, cur.skyTop),
    skyBottom: mix(prev.skyBottom, cur.skyBottom),
    sun: [mix(prev.sun[0], cur.sun[0]), mix(prev.sun[1], cur.sun[1])],
  };
};

type Building = {x: number; w: number; h: number; windows: {x: number; y: number; on: number}[]};

const useCity = () =>
  useMemo(() => {
    const out: Building[] = [];
    let x = -20;
    let i = 0;
    while (x < W + 20) {
      const w = 50 + random(`bw${i}`) * 90;
      const tall = random(`bt${i}`) > 0.82;
      const h = (tall ? 250 : 70) + random(`bh${i}`) * (tall ? 140 : 170);
      const windows: Building['windows'] = [];
      for (let wy = 16; wy < h - 14; wy += 22) {
        for (let wx = 10; wx < w - 12; wx += 18) {
          if (random(`w${i}-${wx}-${wy}`) > 0.72) windows.push({x: wx, y: wy, on: random(`wo${i}-${wx}-${wy}`)});
        }
      }
      out.push({x, w, h, windows});
      x += w + 4;
      i++;
    }
    return out;
  }, []);

const Palm: React.FC<{x: number; scale: number; flip?: boolean; sway: number}> = ({x, scale, flip, sway}) => (
  <g transform={`translate(${x} ${HORIZON + 8}) scale(${flip ? -scale : scale} ${scale})`} fill="#040108">
    <path d={`M-6 0 C-4 -120 ${8 + sway} -240 ${18 + sway * 2} -330 L${30 + sway * 2} -328 C${18 + sway} -230 8 -120 8 0 Z`} />
    {[-70, -35, 0, 35, 70, 110, -110].map((a, k) => (
      <path
        key={k}
        transform={`translate(${24 + sway * 2} -330) rotate(${a + sway * 2})`}
        d="M0 0 C40 -30 110 -20 150 30 C110 0 50 -5 0 8 Z"
      />
    ))}
  </g>
);

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const th = themeAt(t);
  const city = useCity();

  const gridPhase = (t * 0.9) % 1;
  const hLines = Array.from({length: 18}).map((_, k) => {
    const z = (k + 1 - gridPhase) / 18; // 0..1
    return HORIZON + Math.pow(z, 2.4) * (H - HORIZON) * 1.05;
  });
  const vLines = Array.from({length: 23}).map((_, k) => (k - 11) * 170);
  const sunY = 1020 + Math.sin(t * 0.4) * 8;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={th.skyTop} />
          <stop offset="0.62" stopColor={th.skyBottom} />
          <stop offset="1" stopColor={th.skyBottom} />
        </linearGradient>
        <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={th.sun[0]} />
          <stop offset="1" stopColor={th.sun[1]} />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a0414" />
          <stop offset="1" stopColor="#020106" />
        </linearGradient>
        <radialGradient id="vig" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.85" />
        </radialGradient>
        <mask id="sunStripes">
          <rect x="0" y="0" width={W} height={H} fill="#fff" />
          {Array.from({length: 9}).map((_, k) => {
            const y = sunY + 30 + k * 34 + ((t * 30) % 34);
            return <rect key={k} x="0" y={y} width={W} height={4 + k * 1.6} fill="#000" />;
          })}
        </mask>
        <clipPath id="aboveHorizon">
          <rect x="0" y="0" width={W} height={HORIZON} />
        </clipPath>
      </defs>

      <rect width={W} height={H} fill="url(#sky)" />

      {/* лучи */}
      <g transform={`translate(540 860) rotate(${t * 6})`} opacity={0.12}>
        {Array.from({length: 18}).map((_, k) => (
          <path
            key={k}
            transform={`rotate(${k * 20})`}
            d="M0 0 L-60 -1500 L60 -1500 Z"
            fill={k % 2 ? th.a : th.b}
          />
        ))}
      </g>

      {/* звёзды/частицы */}
      {Array.from({length: 70}).map((_, k) => {
        const x = random(`sx${k}`) * W;
        const y = (random(`sy${k}`) * HORIZON + t * (6 + random(`ss${k}`) * 14)) % HORIZON;
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + k));
        return <circle key={k} cx={x} cy={y} r={1 + random(`sr${k}`) * 2.2} fill="#fff" opacity={0.35 * tw} />;
      })}

      {/* солнце */}
      <g clipPath="url(#aboveHorizon)">
        <circle cx={540} cy={sunY} r={330} fill={th.sun[1]} opacity={0.35} filter="blur(40px)" style={{filter: 'blur(40px)'}} />
        <circle cx={540} cy={sunY} r={300} fill="url(#sun)" mask="url(#sunStripes)" />
      </g>

      {/* город */}
      <g>
        {city.map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${HORIZON - b.h})`}>
            <rect width={b.w} height={b.h} fill="#06020c" />
            <rect width={b.w} height={3} fill={th.a} opacity={0.5} />
            {b.windows.map((w, k) => (
              <rect
                key={k}
                x={w.x}
                y={w.y}
                width={8}
                height={10}
                fill={w.on > 0.5 ? th.b : th.a}
                opacity={0.25 + 0.5 * Math.abs(Math.sin(t * 0.8 + w.on * 20))}
              />
            ))}
          </g>
        ))}
        <Palm x={70} scale={1.15} sway={Math.sin(t * 1.3) * 3} />
        <Palm x={1010} scale={1.25} flip sway={Math.sin(t * 1.1 + 1) * 3} />
      </g>

      {/* пол-сетка */}
      <rect x="0" y={HORIZON} width={W} height={H - HORIZON} fill="url(#floor)" />
      <g stroke={th.a} strokeWidth={3} opacity={0.75} style={{filter: `drop-shadow(0 0 6px ${th.a})`}}>
        {hLines.map((y, k) => (
          <line key={`h${k}`} x1={0} x2={W} y1={y} y2={y} opacity={Math.min(1, (y - HORIZON) / 200)} />
        ))}
        {vLines.map((dx, k) => (
          <line key={`v${k}`} x1={540 + dx * 0.05} y1={HORIZON} x2={540 + dx * 5} y2={H} />
        ))}
      </g>
      <rect x="0" y={HORIZON - 2} width={W} height={4} fill={th.a} style={{filter: `drop-shadow(0 0 12px ${th.a})`}} />

      {/* затемнение для читаемости графики */}
      <rect width={W} height={H} fill="#000" opacity={0.28} />
      <rect width={W} height={H} fill="url(#vig)" />
    </svg>
  );
};
