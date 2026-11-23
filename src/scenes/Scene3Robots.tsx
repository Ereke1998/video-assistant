import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {Backdrop, Dust, LightRays, SceneFade} from '../components/Atmosphere';
import {Camera} from '../components/Camera';
import {BUST_PATH, RimLit} from '../components/Figures';
import {SceneAudio} from '../components/SceneAudio';
import {SFX} from '../content';
import {sceneById} from '../timeline';

// Сцена 3 — Роботы (0:13–0:20, кадры 390–600)
// Толпа с телефонами, синхронные движения, холодный синий свет. Наезд на одного человека — его кожа на
// мгновение становится пластиковой (синхронно с sfx-glitch) и возвращается.
const DURATION = 210;
const GLITCH = SFX.find((s) => s.file.includes('glitch'))!.at - sceneById(3).from; // локальный кадр
const GLITCH_LEN = 12;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Синхронное «роботизированное» движение: все головы опускаются и поднимаются в одном ритме, рывками. */
const syncPose = (frame: number) => {
  const beat = frame / 24;
  const step = Math.floor(beat) + Easing.inOut(Easing.cubic)(beat % 1);
  return Math.sin(step * Math.PI) * 0.5 + 0.5; // 0..1
};

const Person: React.FC<{x: number; y: number; scale: number; seed: number; blur: number; dim: number; frame: number}> = ({
  x,
  y,
  scale,
  seed,
  blur,
  dim,
  frame,
}) => {
  const pose = syncPose(frame);
  const nod = pose * 8; // наклон головы вниз, px
  const w = 400 * scale;
  const h = 460 * scale;
  const jitter = (random(`pj${seed}`) - 0.5) * 0.6;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        filter: `blur(${blur}px) brightness(${dim})`,
      }}
    >
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${nod * scale}px) rotate(${jitter}deg)`}}>
        <RimLit width={w} height={h} viewBox="0 0 400 460" rim="rgba(255, 170, 100, 0.7)" rimOffset={[6, -4]} rimBlur={6} rimOpacity={0.6}>
          {(fill) => <path d={BUST_PATH} fill={fill} />}
        </RimLit>
      </div>
      {/* телефон у груди: холодный свет снизу на лицо */}
      <div
        style={{
          position: 'absolute',
          left: w * 0.43,
          top: h * 0.62 + pose * 4 * scale,
          width: w * 0.14,
          height: w * 0.22,
          borderRadius: 6 * scale,
          background: 'linear-gradient(180deg, #d9fbff, #6fdcff)',
          boxShadow: `0 0 ${40 * scale}px ${12 * scale}px rgba(110, 220, 255, 0.55)`,
          transform: 'rotateX(35deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: w * 0.3,
          top: h * 0.2,
          width: w * 0.4,
          height: h * 0.35,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 100%, rgba(110, 220, 255, 0.35), transparent 70%)',
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
};

/** Главный герой крупно: лицо подсвечено телефоном; в момент глитча кожа — глянцевый пластик манекена. */
const Hero: React.FC<{frame: number}> = ({frame}) => {
  const pose = syncPose(frame);
  const g = interpolate(frame, [GLITCH, GLITCH + 2, GLITCH + GLITCH_LEN - 3, GLITCH + GLITCH_LEN], [0, 1, 1, 0], clamp);
  // «рваный» сдвиг полос во время глитча
  const slice = g > 0 ? (random(`sl${frame}`) - 0.5) * 40 * g : 0;
  const rgb = g * 10;
  const face = (plastic: boolean) => (
    <svg width={600} height={690} viewBox="0 0 400 460" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs>
        <radialGradient id={plastic ? 'plastic' : 'skinS3'} cx="0.5" cy="0.62" r="0.55">
          {plastic ? (
            <>
              <stop offset="0" stopColor="#f3c9b4" />
              <stop offset="0.7" stopColor="#d79a82" />
              <stop offset="1" stopColor="#8a5a4c" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#3a6f86" />
              <stop offset="0.6" stopColor="#14313f" />
              <stop offset="1" stopColor="#050e15" />
            </>
          )}
        </radialGradient>
      </defs>
      <g transform={`translate(0 ${pose * 6})`}>
        <ellipse cx="200" cy="125" rx="90" ry="108" fill={`url(#${plastic ? 'plastic' : 'skinS3'})`} />
        {/* черты лица */}
        <ellipse cx="168" cy="120" rx="15" ry={plastic ? 9 : 6} fill={plastic ? '#5b3a30' : '#02070b'} />
        <ellipse cx="232" cy="120" rx="15" ry={plastic ? 9 : 6} fill={plastic ? '#5b3a30' : '#02070b'} />
        {!plastic && (
          <>
            <circle cx="170" cy="122" r="2.5" fill="#bff4ff" />
            <circle cx="234" cy="122" r="2.5" fill="#bff4ff" />
          </>
        )}
        <path d="M200 128 L193 165 L207 165" stroke={plastic ? '#a0695a' : '#081620'} strokeWidth="4" fill="none" />
        <path d="M178 190 C192 196 208 196 222 190" stroke={plastic ? '#7a4438' : '#0a1a24'} strokeWidth="5" fill="none" />
        {plastic && (
          <>
            {/* глянцевые блики пластика */}
            <ellipse cx="170" cy="70" rx="38" ry="18" fill="rgba(255,255,255,0.75)" transform="rotate(-18 170 70)" />
            <ellipse cx="255" cy="150" rx="14" ry="30" fill="rgba(255,255,255,0.55)" />
            <path d="M120 120 C125 190 160 225 200 232" stroke="rgba(255,255,255,0.35)" strokeWidth="6" fill="none" />
          </>
        )}
      </g>
    </svg>
  );
  return (
    <div style={{position: 'absolute', left: 540 - 300, top: 760, width: 600, height: 690}}>
      <RimLit width={600} height={690} viewBox="0 0 400 460" rimOffset={[8, -6]} rimBlur={7}>
        {(fill) => <path d={BUST_PATH} fill={fill} transform={`translate(0 ${pose * 6})`} />}
      </RimLit>
      {face(false)}
      {g > 0 && (
        <>
          <div style={{position: 'absolute', inset: 0, opacity: g, transform: `translateX(${slice}px)`}}>{face(true)}</div>
          {/* RGB-расслоение */}
          <div style={{position: 'absolute', inset: 0, opacity: 0.5 * g, mixBlendMode: 'screen', transform: `translateX(${rgb}px)`, filter: 'hue-rotate(160deg) saturate(3)'}}>
            {face(true)}
          </div>
          <div
            style={{
              position: 'absolute',
              left: -100,
              right: -100,
              top: 120 + random(`gy${frame}`) * 300,
              height: 18 + random(`gh${frame}`) * 30,
              background: 'rgba(160, 240, 255, 0.35)',
              mixBlendMode: 'screen',
              transform: `translateX(${slice * 3}px)`,
            }}
          />
        </>
      )}
      {/* телефон в руках */}
      <div
        style={{
          position: 'absolute',
          left: 263,
          top: 400 + pose * 6,
          width: 74,
          height: 120,
          borderRadius: 12,
          background: 'linear-gradient(180deg, #e4fdff, #78e0ff)',
          boxShadow: '0 0 60px 16px rgba(110, 220, 255, 0.45)',
        }}
      />
    </div>
  );
};

export const Scene3Robots: React.FC = () => {
  const frame = useCurrentFrame();
  const rows = [
    {y: 760, scale: 0.42, count: 9, blur: 3.5, dim: 0.55},
    {y: 900, scale: 0.6, count: 7, blur: 2.2, dim: 0.7},
    {y: 1080, scale: 0.85, count: 5, blur: 1.2, dim: 0.85},
  ];
  const heroIn = interpolate(frame, [0, 30], [0, 1], clamp);
  const flash = interpolate(frame, [GLITCH, GLITCH + 1, GLITCH + 6], [0, 0.35, 0], clamp);
  return (
    <SceneFade duration={DURATION}>
      <Camera to={GLITCH + 10} scale={[1, 1.8]} originX={50} originY={53} tilt={[0, -40]}>
        <Backdrop glowY={35} glowColor="rgba(30, 90, 170, 0.6)" />
        <LightRays count={8} seed="s3" spread={70} color="130, 190, 255" opacity={0.9} />
        {/* туман площади */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, transparent 30%, rgba(40, 90, 150, 0.25) 55%, transparent 80%)'}} />
        {rows.map((r, ri) =>
          new Array(r.count).fill(0).map((_, i) => {
            const spacing = 1080 / (r.count - 1.2);
            const x = -40 + i * spacing + (ri % 2) * spacing * 0.5;
            // центральное место переднего ряда занимает герой
            if (ri === rows.length - 1 && Math.abs(x - 540) < spacing * 0.5) return null;
            return <Person key={`${ri}-${i}`} x={x} y={r.y} scale={r.scale} seed={ri * 10 + i} blur={r.blur} dim={r.dim} frame={frame} />;
          }),
        )}
        <div style={{opacity: heroIn}}>
          <Hero frame={frame} />
        </div>
        {/* передний план — размытые плечи, глубина резкости */}
        <Person x={120} y={1640} scale={1.6} seed={91} blur={14} dim={0.5} frame={frame} />
        <Person x={980} y={1680} scale={1.7} seed={92} blur={16} dim={0.45} frame={frame} />
        <Dust count={50} seed="s3d" color="170, 210, 255" />
      </Camera>
      <AbsoluteFill style={{background: `rgba(200, 240, 255, ${flash})`, mixBlendMode: 'screen'}} />
      <AbsoluteFill style={{background: 'rgba(20, 60, 140, 0.12)', mixBlendMode: 'color'}} />
      <SceneAudio scene={3} />
    </SceneFade>
  );
};
