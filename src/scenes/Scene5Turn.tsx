import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop, Dust, SceneFade} from '../components/Atmosphere';
import {Camera} from '../components/Camera';
import {RimLit} from '../components/Figures';
import {SceneAudio} from '../components/SceneAudio';
import {SFX} from '../content';
import {sceneById, wordLocalFrame} from '../timeline';
import {C} from '../theme';

// Сцена 5 — Поворот (0:27–0:33, кадры 810–990)
// Рука в луче света: мышцы напрягаются (в такт sfx-pulse), на «слабеет» — расслабляются, на «растёт» —
// напрягаются сильнее всего, затем свет гаснет.
const DURATION = 180;
const PULSE_AT = SFX.find((s) => s.file.includes('pulse'))!.at - sceneById(5).from;
// удары в sfx-pulse (измерено по огибающей файла): 0.0 c, 1.3 c, 2.1 c
const BEATS = [0, 39, 63].map((b) => PULSE_AT + b);
const WEAK = wordLocalFrame(5, 'слабеет', 3.0);
const GROW = wordLocalFrame(5, 'растёт', 5.1);
// свет гаснет сразу после вспышки на «растёт»
const LIGHT_OUT = Math.min(GROW + 4, DURATION - 20);

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const pulseAt = (frame: number) => BEATS.reduce((acc, b) => acc + interpolate(frame, [b - 2, b + 1, b + 14], [0, 1, 0], clamp), 0);

/**
 * Рука в позе «бицепс»: плечо уходит за левый край кадра, локоть справа внизу, предплечье поднято вверх,
 * кулак в центре луча. С напряжением бицепс и предплечье становятся объёмнее, кулак сжимается.
 */
const Arm: React.FC<{tension: number; frame: number; light: number}> = ({tension, frame, light}) => {
  const tremor = tension > 0.6 ? Math.sin(frame * 2.3) * (tension - 0.6) * 5 : 0;
  // при напряжении предплечье чуть подтягивается к плечу
  const curl = tension * 26;
  const bicepRy = 62 + tension * 52;
  const bicepRx = 200 + tension * 18;
  const foreRx = 66 + tension * 14;
  const wrist = {x: 640 - curl, y: 830 + curl * 0.3};
  const fist = {x: wrist.x - 6, y: wrist.y - 96};
  const squeeze = 1 - tension * 0.05;
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translate(${tremor}px, ${tremor * 0.6}px)`}}>
      <RimLit width={1080} height={1920} viewBox="0 0 1080 1920" rim={C.warm} rimOffset={[-8, -9]} rimBlur={9} rimOpacity={0.3 + light * 0.7} fillTop="#22404f">
        {(fill) => (
          <g fill={fill} stroke={fill} strokeLinecap="round" strokeLinejoin="round">
            {/* плечо → локоть */}
            <path d="M-120 1265 L700 1255" strokeWidth={170} fill="none" />
            {/* бицепс */}
            <ellipse cx={360} cy={1215 - tension * 18} rx={bicepRx} ry={bicepRy} stroke="none" />
            {/* локоть → запястье */}
            <path d={`M700 1250 L${wrist.x} ${wrist.y}`} strokeWidth={128} fill="none" />
            {/* мышца предплечья */}
            <ellipse cx={(700 + wrist.x) / 2 + 18} cy={(1250 + wrist.y) / 2 + 30} rx={foreRx} ry={200} stroke="none" transform={`rotate(${-4 - curl * 0.1} ${(700 + wrist.x) / 2} ${(1250 + wrist.y) / 2})`} />
            {/* кулак */}
            <g transform={`translate(${fist.x} ${fist.y}) scale(${squeeze}) translate(${-fist.x} ${-fist.y})`}>
              <rect x={fist.x - 105} y={fist.y - 95} width={200} height={190} rx={62} stroke="none" />
              <rect x={fist.x - 125} y={fist.y - 20} width={80} height={100} rx={36} stroke="none" />
            </g>
          </g>
        )}
      </RimLit>
      {/* костяшки, вены и рельеф проступают при напряжении */}
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
        {[0, 1, 2, 3].map((k) => (
          <path
            key={k}
            d={`M${fist.x - 80 + k * 50} ${fist.y - 70} q 20 -14 40 0`}
            stroke={C.warm}
            strokeOpacity={0.25 + tension * 0.35 * light}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />
        ))}
        {[
          `M${wrist.x + 20} ${wrist.y + 60} C ${wrist.x + 40} ${wrist.y + 160} ${wrist.x + 20} ${wrist.y + 260} ${wrist.x + 50} ${wrist.y + 360}`,
          `M260 ${1180 - tension * 18} C 330 ${1150 - tension * 30} 420 ${1150 - tension * 30} 500 ${1185 - tension * 18}`,
        ].map((d, i) => (
          <path key={i} d={d} stroke={C.warm} strokeOpacity={tension * 0.4 * light} strokeWidth={4} fill="none" strokeLinecap="round" />
        ))}
      </svg>
    </div>
  );
};

export const Scene5Turn: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = pulseAt(frame);
  const tension = Math.min(
    1,
    interpolate(
      frame,
      [0, WEAK - 4, WEAK + 10, GROW - 6, GROW + 10],
      [0.15, 0.75, 0.2, 0.25, 1],
      {...clamp, easing: Easing.inOut(Easing.cubic)},
    ) +
      pulse * 0.12,
  );
  const lightBase = interpolate(frame, [0, 18, WEAK, WEAK + 12, GROW - 8, GROW - 2, LIGHT_OUT, DURATION - 2], [0, 0.9, 0.9, 0.55, 0.6, 1, 1, 0], clamp);
  const light = Math.min(1.15, lightBase * (1 + pulse * 0.25));
  return (
    <SceneFade duration={DURATION} fadeOut={6}>
      <Camera to={DURATION} scale={[1.0, 1.12]} originY={45}>
        <Backdrop glowY={30} glowColor={`rgba(30, 100, 130, ${0.35 * light})`} intensity={light} />
        {/* объёмный луч сверху */}
        <AbsoluteFill style={{mixBlendMode: 'screen', opacity: light}}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(255, 225, 185, 0.55) 0%, rgba(255, 200, 150, 0.22) 45%, rgba(255, 180, 120, 0.05) 100%)',
              clipPath: 'polygon(44% 0%, 56% 0%, 82% 100%, 18% 100%)',
              filter: 'blur(26px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(255, 240, 215, 0.5) 0%, rgba(255, 220, 180, 0.08) 80%)',
              clipPath: 'polygon(47% 0%, 53% 0%, 64% 100%, 36% 100%)',
              filter: 'blur(12px)',
            }}
          />
          {/* источник света */}
          <div
            style={{
              position: 'absolute',
              left: 540 - 140,
              top: -110,
              width: 280,
              height: 220,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,245,225,1) 0%, rgba(255,200,140,0.4) 45%, transparent 70%)',
            }}
          />
        </AbsoluteFill>
        <Dust count={70} seed="s5d" color="255, 225, 190" opacity={light} drift={0.5} />
        <Arm tension={tension} frame={frame} light={light} />
        {/* световое пятно на кулаке */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 22% 10% at 58% 38%, rgba(255, 210, 160, ${0.22 * light}), transparent 70%)`,
            mixBlendMode: 'screen',
          }}
        />
      </Camera>
      <SceneAudio scene={5} />
    </SceneFade>
  );
};
