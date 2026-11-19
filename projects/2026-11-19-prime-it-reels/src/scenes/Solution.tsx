// 4. РЕШЕНИЕ 18.00–26.00: 3D-голограмма перекрашивается в синий, пыль вылетает →
// чек-лист из трёх карточек → столбики ДО/ПОСЛЕ (−20…30°C) → ТИХИЙ / БЫСТРЫЙ.
import React from 'react';
import {AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {AirStreaks} from '../components/Effects3D';
import {FONT_FAMILY} from '../components/font';
import {Laptop3D} from '../components/Laptop3D';
import {IconBolt, IconBroom, IconCheck, IconPads, IconSpeaker, IconTube} from '../components/neon/Icons';
import {BigNumber, NeonCard, Pill, ShotFx, TopPill, countUp, glow, usePop} from '../components/neon/ui';
import {Stage} from '../components/Stage';
import {camPath, easeInOut, range, smoothstep} from '../lib/anim';
import {COLORS} from '../lib/colors';

const B = COLORS.cool;
const CY = COLORS.cyan;

const ShotClean: React.FC = () => {
  const f = useCurrentFrame();
  const t = (f + 1080) / 60;
  const cam = camPath(f, [
    {f: 0, pos: [7.4, 4.7, 10.8], target: [0.3, -0.45, -0.35], fov: 40},
    {f: 96, pos: [6.8, 4.3, 9.9], target: [0.3, -0.45, -0.35], fov: 40},
  ]);
  return (
    <ShotFx dur={96} inFrames={1}>
      <Stage transparent camera={cam} fx={{bloom: 0.9, flash: (1 - smoothstep(0, 12, f)) * 0.5, flashColor: '#bfd3ff'}} light={{rim: 4.5, rimColor: B, key: 2.6, env: 0.6}}>
        <Laptop3D
          time={t}
          heat={0}
          sweep={f < 80 ? range(f, 4, 70) : -1}
          xray={0.55}
          fanAngle={t * 60}
          screen={{cool: smoothstep(10, 60, f), hot: 1 - smoothstep(10, 60, f)}}
          dust={{grow: 1, blow: easeInOut(range(f, 8, 90))}}
        >
          <AirStreaks time={t} amount={smoothstep(20, 60, f)} color={CY} />
        </Laptop3D>
      </Stage>
      <TopPill color={B} delay={4}>Решение</TopPill>
    </ShotFx>
  );
};

const CheckRow: React.FC<{y: number; delay: number; label: string; icon: React.ReactNode}> = ({y, delay, label, icon}) => {
  const f = useCurrentFrame();
  const {scale, opacity} = usePop(delay, 10);
  return (
    <div
      style={{
        position: 'absolute',
        left: 110,
        width: 860,
        top: y - 85,
        height: 170,
        borderRadius: 34,
        border: `4px solid ${B}`,
        background: `linear-gradient(90deg, ${B}30, rgba(8,8,12,0.88) 60%)`,
        boxShadow: `${glow(B, 0.7)}, inset 0 0 22px ${B}44`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 36px',
        gap: 30,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <svg width={110} height={110} viewBox="0 0 200 200" style={{overflow: 'visible', filter: `drop-shadow(0 0 6px ${CY})`}}>
        {icon}
      </svg>
      <div style={{flex: 1, fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 70, color: '#fff', letterSpacing: 1.5}}>{label}</div>
      <svg width={110} height={110} viewBox="0 0 200 200" style={{overflow: 'visible', filter: `drop-shadow(0 0 8px ${CY}) drop-shadow(0 0 18px ${CY})`}}>
        <IconCheck color={CY} sw={14} draw={range(f, delay + 12, delay + 26)} />
      </svg>
    </div>
  );
};

const ShotChecklist: React.FC = () => (
  <ShotFx dur={132}>
    <CheckRow y={560} delay={0} label="ЧИСТКА" icon={<IconBroom color="#fff" sw={10} />} />
    <CheckRow y={780} delay={22} label="ТЕРМОПАСТА" icon={<IconTube color="#fff" sw={10} />} />
    <CheckRow y={1000} delay={60} label="ТЕРМОПРОКЛАДКИ" icon={<IconPads color="#fff" sw={10} />} />
  </ShotFx>
);

const ShotBars: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const k = 5.0; // px на °C
  const base = 1150;
  const g1 = spring({frame: f - 4, fps, config: {damping: 15, stiffness: 110}});
  const g2 = spring({frame: f - 22, fps, config: {damping: 15, stiffness: 110}});
  const hBefore = 98 * k * g1;
  const hAfterSolid = 68 * k * g2;
  const hAfterHatch = 10 * k * g2;
  const bar = (x: number, h: number, c: string, extra?: React.ReactNode) => (
    <div style={{position: 'absolute', left: x - 120, width: 240, top: base - h, height: h, borderRadius: '22px 22px 6px 6px', background: c, boxShadow: glow(c, 0.7)}}>{extra}</div>
  );
  const O = COLORS.heat;
  return (
    <ShotFx dur={132}>
      <TopPill color={B}>Нагрев CPU</TopPill>
      {bar(300, hBefore, O)}
      <div style={{position: 'absolute', left: 780 - 120, width: 240, top: base - hAfterSolid - hAfterHatch, height: hAfterHatch, borderRadius: '22px 22px 0 0', border: `4px dashed ${CY}`, background: `repeating-linear-gradient(135deg, ${CY}88 0 12px, transparent 12px 24px)`}} />
      {bar(780, hAfterSolid, B)}
      {/* значения */}
      <div style={{position: 'absolute', left: 300 - 150, width: 300, top: base - hBefore - 110, textAlign: 'center', opacity: g1}}>
        <BigNumber color={O} size={92}>
          98°C
        </BigNumber>
      </div>
      <div style={{position: 'absolute', left: 780 - 180, width: 360, top: base - hAfterSolid - hAfterHatch - 110, textAlign: 'center', opacity: g2}}>
        <BigNumber color={CY} size={92}>
          68–78°
        </BigNumber>
      </div>
      {/* подписи */}
      <div style={{position: 'absolute', left: 0, right: 0, top: base + 16, display: 'flex', justifyContent: 'space-around', padding: '0 120px', fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 48, color: '#cfd5e2'}}>
        <span style={{width: 240, textAlign: 'center'}}>ДО</span>
        <span style={{width: 240, textAlign: 'center'}}>ПОСЛЕ</span>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: base - 50 * k, display: 'flex', justifyContent: 'center'}}>
        <Pill color={CY} delay={44} size={46}>
          −20…30°C
        </Pill>
      </div>
    </ShotFx>
  );
};

const ShotFast: React.FC = () => {
  const f = useCurrentFrame();
  const fpsV = Math.round(countUp(f, 30, 144, 60, 30));
  const hl = smoothstep(60, 66, f) * (1 - smoothstep(66, 90, f));
  return (
    <ShotFx dur={120} out>
      <NeonCard color={B} width={440} height={520} x={290} y={790} delay={0}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
          <svg width={210} height={210} viewBox="0 0 200 200" style={{overflow: 'visible', filter: `drop-shadow(0 0 8px ${CY})`}}>
            <IconSpeaker color="#fff" sw={9} muted draw={range(f, 0, 18)} />
          </svg>
          <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 80, color: '#fff', textShadow: glow(CY, 0.6)}}>ТИХИЙ</div>
        </div>
      </NeonCard>
      <NeonCard color={CY} width={440} height={520} x={790} y={790} delay={58} fill={0.14 + hl * 0.3}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
          <svg width={180} height={180} viewBox="0 0 200 200" style={{overflow: 'visible', filter: `drop-shadow(0 0 8px ${CY})`}}>
            <IconBolt color="#fff" sw={10} draw={range(f, 58, 74)} />
          </svg>
          <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 80, color: '#fff', textShadow: glow(CY, 0.6)}}>БЫСТРЫЙ</div>
          <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 44, color: CY}}>{fpsV} FPS</div>
        </div>
      </NeonCard>
    </ShotFx>
  );
};

export const Solution: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={96} layout="none">
      <ShotClean />
    </Sequence>
    <Sequence from={96} durationInFrames={132} layout="none">
      <ShotChecklist />
    </Sequence>
    <Sequence from={228} durationInFrames={132} layout="none">
      <ShotBars />
    </Sequence>
    <Sequence from={360} durationInFrames={120} layout="none">
      <ShotFast />
    </Sequence>
  </AbsoluteFill>
);

