import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {Backdrop, Dust, LightRays, SceneFade} from '../components/Atmosphere';
import {Camera} from '../components/Camera';
import {OnScreenText} from '../components/SafeText';
import {SceneAudio} from '../components/SceneAudio';
import {SFX} from '../content';
import {sceneById} from '../timeline';
import {C} from '../theme';

// Сцена 2 — Факт 1 (0:06–0:13, кадры 180–390)
// Голографические карточки кружатся; одна вспыхивает, превращается в светящуюся схему мозга и гаснет.
const DURATION = 210;
const CARDS = 9;
const RADIUS = 360;
const PERSPECTIVE = 1300;
const CENTER_Y = 1020;
// вспышка синхронизирована с sfx-hologram
const FLASH = SFX.find((s) => s.file.includes('hologram'))!.at - sceneById(2).from;
const BRAIN_IN = FLASH + 6;
const BRAIN_OUT = 170;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const Card: React.FC<{i: number; frame: number}> = ({i, frame}) => {
  // кольцо вращается; к моменту FLASH карточка 0 оказывается ровно спереди
  const spin = (frame - FLASH) * 0.9;
  const theta = ((i / CARDS) * 360 + spin) % 360;
  const rad = (theta * Math.PI) / 180;
  const x = Math.sin(rad) * RADIUS;
  const z = Math.cos(rad) * RADIUS;
  const bob = Math.sin(frame * 0.05 + i) * 26 + (random(`cy${i}`) - 0.5) * 220;
  const depth = (z + RADIUS) / (2 * RADIUS); // 0 — сзади, 1 — спереди
  const isHero = i === 0;
  const flash = isHero ? interpolate(frame, [FLASH - 8, FLASH, FLASH + 10], [0, 1, 0], clamp) : 0;
  const heroGone = isHero ? interpolate(frame, [FLASH + 2, FLASH + 8], [1, 0], clamp) : 1;
  const ringFade = interpolate(frame, [BRAIN_IN, BRAIN_IN + 20, BRAIN_OUT, BRAIN_OUT + 25], [1, 0.25, 0.25, 0.6], clamp);
  const blur = (1 - depth) * 7 + (depth > 0.92 ? 0 : 0.5);
  const lines = 3 + Math.floor(random(`cl${i}`) * 4);
  return (
    <div
      style={{
        position: 'absolute',
        left: 540 - 120,
        top: CENTER_Y - 160,
        width: 240,
        height: 320,
        transform: `perspective(${PERSPECTIVE}px) translate3d(${x}px, ${bob}px, ${z}px) rotateY(${theta}deg)`,
        zIndex: Math.round(depth * 100),
        opacity: (0.35 + depth * 0.65) * heroGone * ringFade + flash,
        filter: `blur(${blur}px) brightness(${1 + flash * 2.5})`,
        borderRadius: 18,
        border: `1.5px solid rgba(120, 230, 255, ${0.35 + depth * 0.4})`,
        background: 'linear-gradient(160deg, rgba(80, 210, 255, 0.20), rgba(10, 60, 90, 0.10))',
        boxShadow: `0 0 ${30 + flash * 120}px rgba(90, 220, 255, ${0.25 + flash * 0.7}), inset 0 0 30px rgba(90, 220, 255, 0.12)`,
        padding: 22,
      }}
    >
      <div style={{height: 46, borderRadius: 8, background: 'rgba(150, 235, 255, 0.35)', marginBottom: 18}} />
      {new Array(lines).fill(0).map((_, k) => (
        <div
          key={k}
          style={{
            height: 10,
            width: `${55 + random(`cw${i}-${k}`) * 45}%`,
            borderRadius: 5,
            background: 'rgba(170, 240, 255, 0.4)',
            marginBottom: 16,
          }}
        />
      ))}
    </div>
  );
};

// Стилизованная схема мозга: контур полушарий, извилины и нейросеть из узлов.
const BRAIN_OUTLINE =
  'M300 70 C230 40 150 60 120 120 C70 130 40 190 60 240 C25 280 40 350 95 370 C110 430 180 455 230 430 C260 460 300 455 300 455 C300 455 340 460 370 430 C420 455 490 430 505 370 C560 350 575 280 540 240 C560 190 530 130 480 120 C450 60 370 40 300 70 Z';
const GYRI = [
  'M300 75 L300 450',
  'M150 140 C190 160 210 200 190 240 C170 280 200 320 240 320',
  'M110 260 C150 250 170 290 150 330',
  'M220 110 C230 150 270 160 270 200',
  'M450 140 C410 160 390 200 410 240 C430 280 400 320 360 320',
  'M490 260 C450 250 430 290 450 330',
  'M380 110 C370 150 330 160 330 200',
  'M200 380 C230 360 270 380 280 410',
  'M400 380 C370 360 330 380 320 410',
];
const NODES = [
  [150, 180], [220, 150], [270, 230], [180, 300], [240, 360], [120, 290],
  [450, 180], [380, 150], [330, 230], [420, 300], [360, 360], [480, 290], [300, 300],
] as const;
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 3], [6, 7], [7, 8], [8, 9], [9, 10], [6, 11], [11, 9], [2, 12], [8, 12], [4, 12], [10, 12]] as const;

const Brain: React.FC<{frame: number}> = ({frame}) => {
  const p = interpolate(frame, [BRAIN_IN, BRAIN_IN + 45], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const out = interpolate(frame, [BRAIN_OUT, BRAIN_OUT + 26], [1, 0], {...clamp, easing: Easing.in(Easing.quad)});
  if (p <= 0 || out <= 0) return null;
  // «низкая активность»: узлы мерцают всё слабее, к концу гаснут
  const activity = interpolate(frame, [BRAIN_IN + 20, BRAIN_OUT], [1, 0.25], clamp);
  const scale = 0.7 + p * 0.3 + (1 - out) * 0.08;
  return (
    <div
      style={{
        position: 'absolute',
        left: 540 - 300,
        top: CENTER_Y - 250,
        width: 600,
        height: 500,
        transform: `scale(${scale * 1.25})`,
        opacity: out,
        filter: 'drop-shadow(0 0 14px rgba(95, 227, 255, 0.9)) drop-shadow(0 0 40px rgba(95, 227, 255, 0.5))',
        zIndex: 200,
      }}
    >
      <svg width={600} height={500} viewBox="0 0 600 500">
        <path d={BRAIN_OUTLINE} fill="rgba(60, 200, 240, 0.07)" stroke={C.cyan} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
        {GYRI.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={C.ice}
            strokeOpacity={0.55}
            strokeWidth={2.5}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - interpolate(p, [0.2, 1], [0, 1], clamp)}
          />
        ))}
        {EDGES.map(([a, b], i) => (
          <line
            key={i}
            x1={NODES[a][0]}
            y1={NODES[a][1]}
            x2={NODES[b][0]}
            y2={NODES[b][1]}
            stroke={C.cyan}
            strokeWidth={1.6}
            strokeOpacity={0.5 * p * activity}
          />
        ))}
        {NODES.map(([x, y], i) => {
          const pulse = 0.5 + 0.5 * Math.sin(frame * 0.25 + i * 1.7);
          return <circle key={i} cx={x} cy={y} r={5 + pulse * 4 * activity} fill={C.ice} opacity={p * (0.25 + 0.75 * pulse * activity)} />;
        })}
      </svg>
    </div>
  );
};

export const Scene2Fact1: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [FLASH - 4, FLASH + 2, FLASH + 18], [0, 0.55, 0], clamp);
  return (
    <SceneFade duration={DURATION}>
      <Camera to={DURATION} scale={[1.08, 1.0]} originY={52} pan={[-10, 10]}>
        <Backdrop glowY={52} glowColor="rgba(20, 130, 160, 0.55)" />
        <LightRays count={7} seed="s2" originX={600} opacity={0.9} />
        <Dust count={55} seed="s2d" />
        {/* отражение на «полу» */}
        <AbsoluteFill
          style={{background: 'radial-gradient(ellipse 45% 6% at 50% 76%, rgba(95, 227, 255, 0.25), transparent 70%)', filter: 'blur(10px)'}}
        />
        {new Array(CARDS).fill(0).map((_, i) => (
          <Card key={i} i={i} frame={frame} />
        ))}
        <Brain frame={frame} />
        <AbsoluteFill style={{background: `rgba(180, 240, 255, ${flash})`, mixBlendMode: 'screen'}} />
      </Camera>
      <OnScreenText kicker="MIT · 2025" text="Факт: активность мозга ниже" appearAt={22} top={330} size={86} />
      <SceneAudio scene={2} />
    </SceneFade>
  );
};
