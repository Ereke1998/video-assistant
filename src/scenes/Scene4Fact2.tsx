import React from 'react';
import {Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {Backdrop, Dust, LightRays, SceneFade} from '../components/Atmosphere';
import {Camera} from '../components/Camera';
import {OnScreenText} from '../components/SafeText';
import {SceneAudio} from '../components/SceneAudio';

// Сцена 4 — Факт 2 (0:20–0:27, кадры 600–810)
// Белый лист парит в воздухе, строки на нём гаснут одна за другой.
const DURATION = 210;
const LINES = 13;
const FIRST_OFF = 44;
const LAST_OFF = 186;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const Sheet: React.FC<{frame: number}> = ({frame}) => {
  const enter = interpolate(frame, [0, 40], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const bob = Math.sin(frame * 0.045) * 18;
  const rx = 14 + Math.sin(frame * 0.03) * 4;
  const ry = -12 + Math.sin(frame * 0.022 + 1) * 6;
  const rz = -4 + Math.sin(frame * 0.027) * 2;
  // общий «свет» листа гаснет вместе со строками
  const glow = interpolate(frame, [FIRST_OFF, LAST_OFF + 10], [1, 0.45], clamp);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 650, height: 820, perspective: 1600}}>
      <div
        style={{
          position: 'absolute',
          left: 540 - 270,
          top: 30,
          width: 500,
          height: 680,
          transform: `translateY(${bob + (1 - enter) * 120}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
          opacity: enter,
          borderRadius: 6,
          background: `linear-gradient(160deg, rgba(255,255,255,${0.96 * glow + 0.04}) 0%, rgba(215,235,245,${0.9 * glow + 0.05}) 60%, rgba(170,200,215,${0.85 * glow + 0.05}) 100%)`,
          boxShadow: `0 0 ${90 * glow}px rgba(190, 240, 255, ${0.45 * glow}), 0 60px 120px rgba(0,0,0,0.6)`,
          padding: '64px 52px',
        }}
      >
        {new Array(LINES).fill(0).map((_, i) => {
          const off = FIRST_OFF + (i * (LAST_OFF - FIRST_OFF)) / LINES;
          const flicker = frame > off - 6 && frame < off ? (random(`fl${i}-${frame}`) > 0.5 ? 0.4 : 1) : 1;
          const alive = interpolate(frame, [off, off + 10], [1, 0.06], clamp) * flicker;
          const w = i === LINES - 1 ? 45 : 70 + random(`lw${i}`) * 30;
          return (
            <div
              key={i}
              style={{
                height: 14,
                width: `${w}%`,
                borderRadius: 7,
                marginBottom: braceGap(i),
                background: `rgba(20, 50, 70, ${0.08 + 0.72 * alive})`,
                boxShadow: alive > 0.3 ? `0 0 12px rgba(95, 227, 255, ${0.5 * alive})` : 'none',
              }}
            />
          );
        })}
      </div>
      {/* тень/отсвет на «полу» */}
      <div
        style={{
          position: 'absolute',
          left: 540 - 260,
          top: 860,
          width: 520,
          height: 70,
          borderRadius: '50%',
          background: `rgba(160, 230, 255, ${0.18 * glow})`,
          filter: 'blur(30px)',
          transform: `scale(${1 - bob / 200})`,
        }}
      />
    </div>
  );
};

// абзацы: после 4-й и 9-й строки — отступ побольше
const braceGap = (i: number) => (i === 3 || i === 8 ? 44 : 22);

export const Scene4Fact2: React.FC = () => {
  return (
    <SceneFade duration={DURATION}>
      <Camera to={DURATION} scale={[1.0, 1.1]} originY={58} pan={[0, -10]}>
        <Backdrop glowY={60} glowColor="rgba(40, 110, 140, 0.45)" />
        <LightRays count={5} seed="s4" originX={460} spread={30} color="210, 240, 255" opacity={0.75} />
        <Dust count={45} seed="s4d" drift={0.6} />
        <Sheet frame={useCurrentFrame()} />
      </Camera>
      <OnScreenText
        kicker="Microsoft × Carnegie Mellon · 2025"
        text="Факт: доверие к ИИ растёт, а думать меньше"
        appearAt={20}
        top={300}
        size={72}
        kickerSize={28}
      />
      <SceneAudio scene={4} />
    </SceneFade>
  );
};
