import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop, Dust, LightRays, SceneFade} from '../components/Atmosphere';
import {Camera} from '../components/Camera';
import {WriterFigure} from '../components/Figures';
import {OnScreenText} from '../components/SafeText';
import {SceneAudio} from '../components/SceneAudio';
import {C} from '../theme';

// Сцена 6 — Финал (0:33–0:40, кадры 990–1200)
// Человек пишет ручкой в пустом пространстве; камера отъезжает — он становится маленьким в центре света.
const DURATION = 210;
const FIG = 700; // высота фигуры, px
const FIG_X = 400;
const FIG_Y = 880;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Светящаяся «рукописная» строка в воздухе (условная пропись).
const SCRIPT_PATH =
  'M0 60 C20 10 40 10 45 50 C50 90 70 90 80 50 C90 10 110 10 112 55 C114 95 135 95 145 55 C152 25 170 20 178 50 C186 80 200 85 212 60 C224 35 236 30 246 55 C256 80 274 82 286 52 C296 26 316 26 322 58 C328 88 348 88 360 56';

export const Scene6Final: React.FC = () => {
  const frame = useCurrentFrame();
  // рука двигается мелкими «письменными» движениями
  const armAngle = -6 + Math.sin(frame * 0.45) * 4 + Math.sin(frame * 0.13) * 3;
  const write = interpolate(frame, [8, 150], [0, 1], clamp);
  const pool = interpolate(frame, [0, 40], [0.6, 1], clamp);
  const endFade = interpolate(frame, [DURATION - 14, DURATION], [1, 0.0], clamp);
  return (
    <SceneFade duration={DURATION} fadeOut={0}>
      <AbsoluteFill style={{opacity: endFade}}>
        {/* камера отъезжает: от крупного плана руки к маленькой фигуре в центре светового круга */}
        <Camera to={DURATION - 6} scale={[2.4, 0.62]} originX={50} originY={52} easing={Easing.out(Easing.cubic)} sway={0.6}>
          <Backdrop glowY={55} glowColor="rgba(20, 80, 110, 0.35)" intensity={0.8} />
          <AbsoluteFill style={{background: '#000', opacity: 0.25}} />
          {/* конус света сверху и световое пятно на «полу» */}
          <LightRays count={4} seed="s6" spread={16} originX={540} originY={-600} color="255, 220, 180" opacity={0.8 * pool} length={2400} />
          <div
            style={{
              position: 'absolute',
              left: 540 - 420,
              top: FIG_Y + FIG - 110,
              width: 840,
              height: 220,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(255, 215, 170, 0.55) 0%, rgba(255, 180, 120, 0.18) 45%, transparent 72%)',
              filter: 'blur(12px)',
              opacity: pool,
            }}
          />
          {/* фигура */}
          <div style={{position: 'absolute', left: FIG_X, top: FIG_Y}}>
            <WriterFigure armAngle={armAngle} size={FIG} />
          </div>
          {/* светящаяся надпись в воздухе перед ручкой */}
          <svg
            width={380}
            height={140}
            viewBox="-10 -10 380 120"
            style={{
              position: 'absolute',
              left: FIG_X + 130,
              top: FIG_Y + 110,
              overflow: 'visible',
              filter: `drop-shadow(0 0 8px ${C.warm}) drop-shadow(0 0 20px rgba(255,160,90,0.7))`,
            }}
          >
            <path
              d={SCRIPT_PATH}
              fill="none"
              stroke="#ffe2c2"
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - write}
            />
          </svg>
          <Dust count={60} seed="s6d" color="255, 225, 195" drift={0.4} />
        </Camera>
        <OnScreenText text="Подумай сам" appearAt={96} top={420} size={124} />
      </AbsoluteFill>
      <SceneAudio scene={6} />
    </SceneFade>
  );
};
