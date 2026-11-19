// 3. ТЕРМОПАСТА И ПРОКЛАДКИ 10.00–18.00: паста каменеет и трескается →
// прокладки рассыпаются → карточка 100°C (глитч на 14.0 с) → ШУМ/ЛАГИ + FPS → пламя.
import React from 'react';
import {AbsoluteFill, Sequence, interpolateColors, useCurrentFrame} from 'remotion';
import {IconChip, IconFlame, IconLaptop, IconSpeaker, IconSpinner, Line, NeonSvg} from '../components/neon/Icons';
import {BigNumber, NeonCard, Pill, ShotFx, TopPill, countUp, glow} from '../components/neon/ui';
import {FONT_FAMILY} from '../components/font';
import {rand, range, smoothstep} from '../lib/anim';
import {COLORS} from '../lib/colors';

const R = COLORS.red;
const O = COLORS.heat;

export const GLITCH_FROM = 240; // 14.0 с (от начала сцены)
export const GLITCH_TO = 270;

const CRACKS = [
  'M100 100 L82 74 L88 52 L70 34',
  'M100 100 L126 86 L140 62 L166 56',
  'M100 100 L112 128 L104 150 L118 172',
  'M100 100 L72 112 L50 106 L34 124',
  'M82 74 L58 70',
  'M126 86 L150 104',
  'M112 128 L136 138',
  'M72 112 L76 138 L62 156',
];

const ShotPaste: React.FC = () => {
  const f = useCurrentFrame();
  const stone = smoothstep(10, 60, f);
  const shake = f >= 54 && f < 66 ? Math.sin(f * 3) * 8 : 0;
  const paste = interpolateColors(stone, [0, 1], ['#e9edf2', '#4a4846']);
  return (
    <ShotFx dur={108}>
      <TopPill color={O}>#2 Термопаста</TopPill>
      <div style={{position: 'absolute', inset: 0, transform: `translateX(${shake}px)`}}>
        <NeonSvg size={620} x={540} y={790} color={O}>
          <IconChip color={O} draw={range(f, 0, 20)} sw={5} />
        </NeonSvg>
        {/* капля пасты + трещины */}
        <svg width={620} height={620} viewBox="0 0 200 200" style={{position: 'absolute', left: 230, top: 480}}>
          <defs>
            <radialGradient id="pasteG" cx="40%" cy="35%" r="70%">
              <stop offset="0" stopColor={stone < 0.5 ? '#ffffff' : '#6a6764'} />
              <stop offset="1" stopColor={paste} />
            </radialGradient>
          </defs>
          <ellipse cx={100} cy={100} rx={44} ry={40} fill="url(#pasteG)" opacity={smoothstep(4, 12, f)} />
          <g style={{filter: `drop-shadow(0 0 4px ${O}) drop-shadow(0 0 10px ${O})`}}>
            {CRACKS.map((d, i) => (
              <Line key={i} d={d} color={i < 4 ? '#ffb070' : O} sw={i < 4 ? 3.2 : 2.2} draw={range(f, 60 + i * 3, 78 + i * 3)} />
            ))}
          </g>
        </svg>
        <div style={{position: 'absolute', left: 0, right: 0, top: 1130, display: 'flex', justifyContent: 'center'}}>
          <Pill color={O} delay={60} size={32}>
            Сухая · как камень
          </Pill>
        </div>
      </div>
    </ShotFx>
  );
};

const ShotPads: React.FC = () => {
  const f = useCurrentFrame();
  const pieces = React.useMemo(() => {
    const r = rand(5);
    const out: {pad: number; i: number; j: number; d: number; vx: number; vy: number; rot: number}[] = [];
    for (let pad = 0; pad < 3; pad++)
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 4; j++) out.push({pad, i, j, d: 20 + pad * 10 + r() * 40, vx: (r() - 0.5) * 6, vy: -r() * 4, rot: (r() - 0.5) * 30});
    return out;
  }, []);
  const PW = 240;
  const PH = 160;
  const cell = PW / 6;
  return (
    <ShotFx dur={96}>
      <TopPill color={O}>#3 Термопрокладки</TopPill>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, filter: `drop-shadow(0 0 5px ${O}) drop-shadow(0 0 14px ${O}88)`}}>
        {pieces.map((p, k) => {
          const x0 = 540 + (p.pad - 1) * 290 - PW / 2 + p.i * cell;
          const y0 = 700 + (p.pad === 1 ? -60 : 40) + p.j * (PH / 4);
          const t = Math.max(0, f - p.d);
          const x = x0 + p.vx * t;
          const y = Math.min(1180, y0 + p.vy * t + 0.35 * t * t);
          const appear = smoothstep(p.pad * 4, p.pad * 4 + 10, f);
          return (
            <rect
              key={k}
              x={x}
              y={y}
              width={cell - 4}
              height={PH / 4 - 4}
              rx={4}
              fill={t > 0 ? '#3a2a20' : `${O}55`}
              stroke={O}
              strokeWidth={3}
              opacity={appear * (1 - smoothstep(60, 90, t))}
              transform={`rotate(${p.rot * Math.min(t, 20) * 0.1} ${x + cell / 2} ${y + PH / 8})`}
            />
          );
        })}
      </svg>
    </ShotFx>
  );
};

const ShotCritical: React.FC = () => {
  const f = useCurrentFrame();
  const v = countUp(f, 98, 100, 4, 20);
  return (
    <ShotFx dur={72}>
      <NeonCard color={R} width={720} height={420} x={540} y={790} delay={0} fill={0.3}>
        <BigNumber color={R} size={270}>
          {Math.round(v)}°C
        </BigNumber>
      </NeonCard>
      <div style={{position: 'absolute', left: 0, right: 0, top: 975, display: 'flex', justifyContent: 'center'}}>
        <Pill color={R} delay={6}>
          Критический нагрев
        </Pill>
      </div>
    </ShotFx>
  );
};

const fpsAt = (t: number) => {
  const base = 144 - (144 - 12) * Math.pow(t, 0.8);
  return Math.max(8, base + Math.sin(t * 60) * 7 + Math.sin(t * 143) * 4);
};

const ShotLag: React.FC = () => {
  const f = useCurrentFrame();
  const p = range(f, 10, 100);
  const N = 60;
  const pts: string[] = [];
  const last = Math.max(1, Math.floor(N * p));
  for (let i = 0; i <= last; i++) {
    const t = i / N;
    pts.push(`${(t * 760).toFixed(1)},${(220 - (fpsAt(t) / 150) * 200).toFixed(1)}`);
  }
  const cur = fpsAt(last / N);
  return (
    <ShotFx dur={108}>
      <NeonCard color={O} width={420} height={330} x={300} y={640} delay={0}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <svg width={170} height={170} viewBox="0 0 200 200" style={{overflow: 'visible', filter: `drop-shadow(0 0 6px ${O})`}}>
            <IconSpeaker color="#fff" sw={9} waves={0.5 + 0.5 * Math.sin(f * 0.5)} />
          </svg>
          <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 64, color: '#fff', textShadow: glow(O, 0.6)}}>ШУМ</div>
        </div>
      </NeonCard>
      <NeonCard color={R} width={420} height={330} x={780} y={640} delay={8}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <svg width={170} height={170} viewBox="0 0 200 200" style={{overflow: 'visible', filter: `drop-shadow(0 0 6px ${R})`}}>
            <IconSpinner color="#fff" sw={12} angle={Math.floor(f / 4) * 45} />
          </svg>
          <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 64, color: '#fff', textShadow: glow(R, 0.6)}}>ЛАГИ</div>
        </div>
      </NeonCard>
      {/* график FPS */}
      <div
        style={{
          position: 'absolute',
          left: 100,
          top: 860,
          width: 880,
          height: 300,
          borderRadius: 30,
          border: `4px solid ${R}`,
          boxShadow: glow(R, 0.6),
          background: 'rgba(8,8,12,0.85)',
          opacity: smoothstep(6, 14, f),
        }}
      >
        <svg width={880} height={300} style={{position: 'absolute', left: 0, top: 0}}>
          {[0.33, 0.66].map((g) => (
            <line key={g} x1={40} x2={840} y1={40 + g * 220} y2={40 + g * 220} stroke="#ffffff18" strokeWidth={2} />
          ))}
          <polyline
            transform="translate(60 40)"
            points={pts.join(' ')}
            fill="none"
            stroke={R}
            strokeWidth={8}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{filter: `drop-shadow(0 0 8px ${R})`}}
          />
        </svg>
        <div style={{position: 'absolute', right: 30, top: 18, fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 60, color: '#fff', textShadow: glow(R, 0.6)}}>
          <span style={{fontSize: 36, color: '#9aa0ae', marginRight: 12}}>FPS</span>
          {Math.round(cur)}
        </div>
      </div>
    </ShotFx>
  );
};

const ShotFire: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 60;
  const pulse = 0.5 + 0.5 * Math.sin(f * 0.35);
  return (
    <ShotFx dur={96} out={false}>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 540px 800px, ${R}${Math.round(30 + pulse * 40).toString(16)} 0px, transparent 620px)`}} />
      <NeonSvg size={700} x={540} y={720} color={O} glowK={1.3}>
        <IconFlame color={O} t={t} draw={range(f, 0, 22)} sw={5} />
      </NeonSvg>
      <NeonSvg size={460} x={540} y={900} color="#ffffff">
        <IconLaptop color="#ffffff" draw={range(f, 4, 24)} sw={6} />
      </NeonSvg>
    </ShotFx>
  );
};

export const ThermalProblem: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={108} layout="none">
      <ShotPaste />
    </Sequence>
    <Sequence from={108} durationInFrames={96} layout="none">
      <ShotPads />
    </Sequence>
    <Sequence from={204} durationInFrames={72} layout="none">
      <ShotCritical />
    </Sequence>
    <Sequence from={276} durationInFrames={108} layout="none">
      <ShotLag />
    </Sequence>
    <Sequence from={384} durationInFrames={96} layout="none">
      <ShotFire />
    </Sequence>
  </AbsoluteFill>
);

