import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop, Dust, LightRays, SceneFade} from '../components/Atmosphere';
import {Camera} from '../components/Camera';
import {RimLit} from '../components/Figures';
import {useSafeZoneGuard} from '../components/SafeText';
import {SceneAudio} from '../components/SceneAudio';
import {C, FONT, TEXT_SHADOW} from '../theme';

// Сцена 1 — Зацепка (0:00–0:06, кадры 0–180)
// Чёрный экран → окно чата с курсором → печатается «Что мне подумать?» → рука замирает → текст стирается
// → наезд камеры на глаза.
const DURATION = 180;
const PROMPT = 'Что мне подумать?';
const TYPE_START = 34;
const TYPE_END = 92;
const ERASE_START = 112;
const ERASE_END = 136;
const EYES_START = 128;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const ChatWindow: React.FC = () => {
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [12, 34], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const typed = Math.round(interpolate(frame, [TYPE_START, TYPE_END], [0, PROMPT.length], clamp));
  const erased = Math.round(interpolate(frame, [ERASE_START, ERASE_END], [0, PROMPT.length], {...clamp, easing: Easing.in(Easing.quad)}));
  const visible = PROMPT.slice(0, Math.max(0, typed - erased));
  const typing = frame >= TYPE_START && frame < TYPE_END;
  const cursorOn = typing || (frame >= ERASE_START && frame < ERASE_END) || Math.floor(frame / 15) % 2 === 0;
  const ref = useSafeZoneGuard(PROMPT);

  return (
    <div
      style={{
        position: 'absolute',
        left: 90,
        right: 90,
        top: 470,
        height: 420,
        borderRadius: 40,
        background: 'linear-gradient(160deg, rgba(40, 90, 120, 0.32), rgba(8, 24, 38, 0.55))',
        border: '1.5px solid rgba(150, 230, 255, 0.28)',
        boxShadow: '0 0 80px rgba(60, 200, 255, 0.18), inset 0 0 60px rgba(100, 220, 255, 0.06), 0 40px 120px rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        opacity: appear,
        transform: `scale(${0.94 + appear * 0.06})`,
        filter: `blur(${(1 - appear) * 12}px)`,
        overflow: 'hidden',
      }}
    >
      {/* шапка окна */}
      <div style={{display: 'flex', gap: 14, padding: '28px 34px'}}>
        {[0.55, 0.35, 0.25].map((o, i) => (
          <div key={i} style={{width: 18, height: 18, borderRadius: 9, background: `rgba(160, 235, 255, ${o})`}} />
        ))}
      </div>
      <div style={{height: 1, background: 'rgba(150, 230, 255, 0.15)'}} />
      {/* поле ввода */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          right: 40,
          bottom: 48,
          height: 170,
          borderRadius: 28,
          background: 'rgba(0, 10, 18, 0.55)',
          border: '1px solid rgba(150, 230, 255, 0.18)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 36px',
        }}
      >
        <div
          ref={ref}
          style={{fontFamily: FONT, fontWeight: 600, fontSize: 64, color: C.white, textShadow: TEXT_SHADOW, whiteSpace: 'nowrap'}}
        >
          {visible}
          <span
            style={{
              display: 'inline-block',
              width: 5,
              height: 70,
              marginLeft: 6,
              verticalAlign: 'middle',
              background: C.cyan,
              boxShadow: `0 0 18px ${C.cyan}`,
              opacity: cursorOn ? 1 : 0,
            }}
          />
        </div>
      </div>
    </div>
  );
};

/** Клавиатура в перспективе + рука над ней. */
const KeyboardAndHand: React.FC = () => {
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [20, 50], [0, 1], clamp);
  const typing = frame >= TYPE_START && frame < TYPE_END;
  // во время печати пальцы «стучат», на TYPE_END рука замирает над клавишами
  const tap = typing ? Math.abs(Math.sin(frame * 0.9)) * 10 : 0;
  const freezeLift = interpolate(frame, [TYPE_END, TYPE_END + 14], [0, -26], {...clamp, easing: Easing.out(Easing.cubic)});
  const rows = 4;
  const cols = 11;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 960, height: 520, opacity: appear}}>
      <div style={{position: 'absolute', left: 90, right: 90, top: 120, height: 330, perspective: 900}}>
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: 'rotateX(58deg)',
            transformOrigin: '50% 100%',
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 10,
            padding: 18,
            borderRadius: 26,
            background: 'linear-gradient(180deg, rgba(20,60,80,0.5), rgba(4,14,22,0.9))',
            boxShadow: '0 0 60px rgba(60, 200, 255, 0.15)',
          }}
        >
          {new Array(rows * cols).fill(0).map((_, i) => {
            const lit = typing && (i * 7 + Math.floor(frame / 3)) % 13 === 0;
            return (
              <div
                key={i}
                style={{
                  borderRadius: 8,
                  background: lit ? 'rgba(120, 230, 255, 0.45)' : 'rgba(30, 80, 100, 0.35)',
                  border: '1px solid rgba(140, 225, 255, 0.22)',
                  boxShadow: lit ? '0 0 18px rgba(120,230,255,0.7)' : 'none',
                }}
              />
            );
          })}
        </div>
      </div>
      {/* рука: тёмный силуэт с тёплым контровым светом */}
      <div style={{position: 'absolute', left: 380, top: -20 + tap + freezeLift}}>
        <RimLit width={440} height={355} viewBox="0 0 520 420" rimOffset={[-6, -8]} rimBlur={9}>
          {(fill) => (
            <g fill={fill} stroke={fill} strokeLinecap="round" strokeLinejoin="round">
              {/* предплечье из правого нижнего угла */}
              <path d="M520 420 L330 250" strokeWidth="110" fill="none" />
              {/* ладонь */}
              <ellipse cx="300" cy="225" rx="105" ry="70" transform="rotate(-22 300 225)" stroke="none" />
              {/* пальцы */}
              <path d="M220 185 Q150 160 125 205" strokeWidth="32" fill="none" />
              <path d="M212 220 Q135 205 112 255" strokeWidth="32" fill="none" />
              <path d="M222 255 Q150 255 135 305" strokeWidth="30" fill="none" />
              <path d="M242 285 Q180 300 172 340" strokeWidth="26" fill="none" />
              {/* большой палец */}
              <path d="M300 285 L250 340" strokeWidth="34" fill="none" />
            </g>
          )}
        </RimLit>
      </div>
    </div>
  );
};

/** Крупный план глаз: в радужке отражается окно чата. */
const Eyes: React.FC = () => {
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [EYES_START, EYES_START + 26], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  if (appear <= 0) return null;
  const blink = interpolate(frame, [168, 172, 176], [1, 0.15, 1], clamp);
  const eye = (cx: number) => (
    <g>
      {/* белок */}
      <path
        d={`M${cx - 150} 0 C${cx - 80} ${-95 * blink} ${cx + 80} ${-95 * blink} ${cx + 150} 0 C${cx + 80} ${70 * blink} ${cx - 80} ${70 * blink} ${cx - 150} 0 Z`}
        fill="url(#sclera)"
      />
      {/* верхнее веко: тень и складка */}
      <path
        d={`M${cx - 155} -4 C${cx - 80} ${-100 * blink} ${cx + 80} ${-100 * blink} ${cx + 155} -4`}
        stroke="#020509"
        strokeWidth={14}
        fill="none"
        strokeLinecap="round"
      />
      <path d={`M${cx - 130} -60 C${cx - 60} -130 ${cx + 60} -130 ${cx + 130} -60`} stroke="rgba(0,0,0,0.5)" strokeWidth={8} fill="none" />
      <clipPath id={`eyeclip-${cx}`}>
        <path
          d={`M${cx - 150} 0 C${cx - 80} ${-95 * blink} ${cx + 80} ${-95 * blink} ${cx + 150} 0 C${cx + 80} ${70 * blink} ${cx - 80} ${70 * blink} ${cx - 150} 0 Z`}
        />
      </clipPath>
      <g clipPath={`url(#eyeclip-${cx})`}>
        <circle cx={cx} cy={-8} r={66} fill="url(#iris)" />
        <circle cx={cx} cy={-8} r={28} fill="#010407" />
        {/* отражение окна чата */}
        <rect x={cx - 30} y={-42} width={42} height={24} rx={5} fill="rgba(170, 240, 255, 0.85)" />
        <rect x={cx - 24} y={-30} width={26} height={4} rx={2} fill="rgba(255,255,255,0.95)" />
        <circle cx={cx + 26} cy={-30} r={7} fill="rgba(255,255,255,0.9)" />
      </g>
    </g>
  );
  return (
    <AbsoluteFill style={{opacity: appear}}>
      <Backdrop glowY={45} glowColor="rgba(20, 90, 120, 0.5)" />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 40% at 70% 40%, rgba(255,150,80,0.10), transparent 70%)'}} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        <defs>
          <radialGradient id="sclera" cx="0.5" cy="0.45" r="0.6">
            <stop offset="0" stopColor="#7d939e" />
            <stop offset="1" stopColor="#1c2a33" />
          </radialGradient>
          <radialGradient id="iris" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.3" stopColor="#0b4a5a" />
            <stop offset="0.75" stopColor="#1ea7c4" />
            <stop offset="1" stopColor="#06222c" />
          </radialGradient>
          <radialGradient id="skin" cx="0.45" cy="0.5" r="0.75">
            <stop offset="0" stopColor="#1d3442" />
            <stop offset="0.7" stopColor="#0a151d" />
            <stop offset="1" stopColor="#03070b" />
          </radialGradient>
          <linearGradient id="rimface" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor={C.warm} stopOpacity="0.85" />
            <stop offset="0.25" stopColor={C.warm} stopOpacity="0" />
          </linearGradient>
          <filter id="soft">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>
        {/* лицо крупно: лоб/скулы */}
        <rect x={-100} y={-100} width={1280} height={2120} fill="url(#skin)" />
        <rect x={-100} y={-100} width={1280} height={2120} fill="url(#rimface)" filter="url(#soft)" />
        {/* затенение глазниц */}
        <ellipse cx={320} cy={915} rx={230} ry={140} fill="rgba(0,0,0,0.45)" filter="url(#soft)" />
        <ellipse cx={760} cy={915} rx={230} ry={140} fill="rgba(0,0,0,0.45)" filter="url(#soft)" />
        {/* брови */}
        <path d="M180 820 C260 770 380 770 450 800" stroke="#03080c" strokeWidth="34" strokeLinecap="round" fill="none" />
        <path d="M630 800 C700 770 820 770 900 820" stroke="#03080c" strokeWidth="34" strokeLinecap="round" fill="none" />
        <g transform="translate(0 930)">
          {eye(320)}
          {eye(760)}
        </g>
        {/* переносица / нос в тени */}
        <path d="M540 900 C520 1020 515 1120 500 1180" stroke="rgba(255,176,103,0.18)" strokeWidth="10" fill="none" filter="url(#soft)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const chatOut = interpolate(frame, [EYES_START, EYES_START + 20], [1, 0], clamp);
  return (
    <SceneFade duration={DURATION} fadeIn={0} fadeOut={8}>
      <AbsoluteFill style={{opacity: chatOut}}>
        <Camera to={EYES_START + 20} scale={[1, 1.12]} originY={45}>
          <Backdrop glowY={42} intensity={interpolate(frame, [10, 50], [0, 1], clamp)} />
          <LightRays count={5} opacity={interpolate(frame, [15, 60], [0, 0.8], clamp)} seed="s1" />
          <Dust count={40} seed="s1d" opacity={interpolate(frame, [20, 60], [0, 1], clamp)} />
          <ChatWindow />
          <KeyboardAndHand />
        </Camera>
      </AbsoluteFill>
      <Camera from={EYES_START} to={DURATION} scale={[1.0, 1.45]} originY={49} easing={Easing.in(Easing.quad)}>
        <Eyes />
      </Camera>
      <SceneAudio scene={1} />
    </SceneFade>
  );
};
