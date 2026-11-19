// 2. ПЫЛЬ 3.00–10.00: календарь 365 дней → пыль на вентиляторе + столбик →
// «одеяло» → стрелки горячего воздуха отскакивают от пыли, красный ✕ на решётке.
import React from 'react';
import {AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {DustBlobs, IconCalendar, IconFan, Line, NeonSvg} from '../components/neon/Icons';
import {BigNumber, Pill, ShotFx, TopPill, countUp, glow} from '../components/neon/ui';
import {FONT_FAMILY} from '../components/font';
import {clamp, range, smoothstep} from '../lib/anim';
import {COLORS} from '../lib/colors';

const C = COLORS.heat;

const ShotCalendar: React.FC = () => {
  const f = useCurrentFrame();
  const days = Math.round(countUp(f, 1, 365, 6, 70));
  return (
    <ShotFx dur={96}>
      <TopPill color={C} delay={0}>#1 Пыль</TopPill>
      <NeonSvg size={520} x={540} y={780} color={C}>
        <IconCalendar color={C} draw={range(f, 0, 22)} sw={6} />
      </NeonSvg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 735, display: 'flex', justifyContent: 'center'}}>
        <BigNumber color={C} size={210} style={{opacity: smoothstep(8, 16, f)}}>
          {days}
        </BigNumber>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1080, display: 'flex', justifyContent: 'center'}}>
        <Pill color={C} delay={14}>
          Дней
        </Pill>
      </div>
    </ShotFx>
  );
};

const FanWithDust: React.FC<{f: number; dust: number; speed: number; blanket?: number}> = ({f, dust, speed}) => (
  <>
    <NeonSvg size={560} x={540} y={760} color={C}>
      <IconFan color={C} draw={range(f, 0, 18)} angle={f * speed} sw={6} />
    </NeonSvg>
    <NeonSvg size={560} x={540} y={760} color={C} style={{filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))'}}>
      <DustBlobs amount={dust} />
    </NeonSvg>
  </>
);

const ShotDust: React.FC = () => {
  const f = useCurrentFrame();
  const dust = smoothstep(8, 110, f);
  return (
    <ShotFx dur={120}>
      <FanWithDust f={f} dust={dust} speed={9 - dust * 6} />
      {/* столбик «слой пыли» */}
      <div style={{position: 'absolute', left: 150, top: 1105, width: 780, fontFamily: FONT_FAMILY, fontWeight: 700, color: '#fff', textTransform: 'uppercase'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 34, marginBottom: 10, letterSpacing: 1.5}}>
          <span>Слой пыли</span>
          <span style={{color: C, textShadow: glow(C, 0.5)}}>{Math.round(dust * 100)}%</span>
        </div>
        <div style={{height: 30, borderRadius: 15, border: `3px solid ${C}`, boxShadow: glow(C, 0.5), overflow: 'hidden', background: 'rgba(8,8,12,0.8)'}}>
          <div
            style={{
              width: `${dust * 100}%`,
              height: '100%',
              background: `repeating-linear-gradient(135deg, ${C} 0 14px, ${C}88 14px 28px)`,
            }}
          />
        </div>
      </div>
    </ShotFx>
  );
};

const ShotBlanket: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const drop = spring({frame: f - 8, fps, config: {damping: 13, stiffness: 120, mass: 0.9}});
  const y = -520 + drop * 520;
  const sag = 1 - clamp(drop) * 0.0;
  return (
    <ShotFx dur={96}>
      <FanWithDust f={f + 120} dust={1} speed={2.2 * (1 - clamp(drop))} />
      <NeonSvg size={640} x={540} y={760 + y} color={C}>
        <g opacity={0.95}>
          <path d="M8 34 Q54 14 100 34 T192 34 L196 178 Q150 194 100 176 T4 178 Z" fill="rgba(40,14,0,0.85)" />
          <Line color={C} sw={5} d="M8 34 Q54 14 100 34 T192 34 L196 178 Q150 194 100 176 T4 178 Z" draw={range(f, 4, 26)} />
          {[0, 1, 2, 3].map((i) => (
            <Line key={i} color={C} sw={3} d={`M${30 + i * 46} 40 L${10 + i * 46 + 40} 172`} draw={range(f, 14 + i * 3, 30 + i * 3)} />
          ))}
          {[0, 1, 2].map((i) => (
            <Line key={`h${i}`} color={C} sw={3} d={`M10 ${75 + i * 38} Q100 ${68 + i * 38 + sag * 8} 194 ${75 + i * 38}`} draw={range(f, 18 + i * 3, 34 + i * 3)} />
          ))}
        </g>
      </NeonSvg>
    </ShotFx>
  );
};

const ShotBlocked: React.FC = () => {
  const f = useCurrentFrame();
  const R = COLORS.red;
  const wallX = 690;
  const arrows = [0, 1, 2, 3, 4];
  const xMark = range(f, 34, 46);
  return (
    <ShotFx dur={108} out={false}>
      <TopPill color={R} delay={0}>Воздух заперт</TopPill>
      {/* решётка */}
      <NeonSvg size={420} x={870} y={780} color={C}>
        <Line color={C} sw={6} d="M40 10 H160 Q172 10 172 22 V178 Q172 190 160 190 H40 Q28 190 28 178 V22 Q28 10 40 10 Z" draw={range(f, 0, 16)} />
        {Array.from({length: 6}).map((_, i) => (
          <Line key={i} color={C} sw={8} d={`M${52 + i * 19} 30 V170`} draw={range(f, 4 + i * 2, 16 + i * 2)} />
        ))}
      </NeonSvg>
      {/* стена пыли */}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <g transform={`translate(${wallX - 100} ${780 - 100})`}>
          <DustBlobs amount={1} seed={8} cx={100} cy={100} r={95} />
        </g>
      </svg>
      {/* стрелки горячего воздуха */}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, filter: `drop-shadow(0 0 6px ${R}) drop-shadow(0 0 16px ${R})`}}>
        {arrows.map((i) => {
          const cyc = 46;
          const u = (((f + i * 9) % cyc) + cyc) % cyc / cyc;
          const y = 640 + i * 70;
          let x: number;
          let dir = 1;
          let dy = 0;
          if (u < 0.55) x = 90 + (wallX - 210) * (u / 0.55);
          else {
            const k = (u - 0.55) / 0.45;
            x = wallX - 120 - k * 220;
            dir = -1;
            dy = (i - 2) * 30 * k;
          }
          const op = Math.min(1, u * 8) * Math.min(1, (1 - u) * 6);
          return (
            <g key={i} transform={`translate(${x} ${y + dy}) scale(${dir} 1)`} opacity={op}>
              <path d="M-70 0 H20" stroke={R} strokeWidth={10} strokeLinecap="round" />
              <path d="M0 -24 L28 0 L0 24" stroke={R} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
          );
        })}
      </svg>
      {/* красный ✕ на решётке */}
      <NeonSvg size={300} x={860} y={780} color={R} glowK={1.4}>
        <Line color={R} sw={16} d="M40 40 L160 160" draw={xMark} />
        <Line color={R} sw={16} d="M160 40 L40 160" draw={range(f, 40, 52)} />
      </NeonSvg>
    </ShotFx>
  );
};

export const DustProblem: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={96} layout="none">
      <ShotCalendar />
    </Sequence>
    <Sequence from={96} durationInFrames={120} layout="none">
      <ShotDust />
    </Sequence>
    <Sequence from={216} durationInFrames={96} layout="none">
      <ShotBlanket />
    </Sequence>
    <Sequence from={312} durationInFrames={108} layout="none">
      <ShotBlocked />
    </Sequence>
  </AbsoluteFill>
);
