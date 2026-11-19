// 1. ХУК 0.00–3.00: 3D-ноутбук раскаляется, волны жара, тряска; карточка 36 → 98°C.
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {FlowWaves} from '../components/Effects3D';
import {Laptop3D} from '../components/Laptop3D';
import {IconWarning} from '../components/neon/Icons';
import {BigNumber, NeonCard, Pill, TopPill, countUp} from '../components/neon/ui';
import {FONT_FAMILY} from '../components/font';
import {Stage} from '../components/Stage';
import {camPath, easeInExpo, range, smoothstep} from '../lib/anim';
import {COLORS} from '../lib/colors';

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const heat = smoothstep(0.4, 2.0, t);

  const cam = camPath(f, [
    {f: 0, pos: [8.6, 5.6, 12.6], target: [0.25, 0.05, -0.35], fov: 40},
    {f: 84, pos: [7.6, 4.9, 11.1], target: [0.25, 0.0, -0.35], fov: 40},
    {f: 165, pos: [7.2, 4.6, 10.5], target: [0.25, -0.1, -0.35], fov: 40},
  ]);
  const out = easeInExpo(range(f, 165, 180));
  cam.pos = [cam.pos[0] - out * 1.2, cam.pos[1] - out * 0.5, cam.pos[2] - out * 2.0];

  const temp = countUp(f, 36, 98, 86, 40) + (f > 126 ? Math.sin(f * 0.9) * 0.4 : 0);
  const cardShake = f > 126 ? Math.sin(f * 2.1) * 4 : 0;

  return (
    <AbsoluteFill>
      <Stage
        transparent
        camera={{...cam, shake: 0.02 + 0.03 * heat}}
        fx={{bloom: 0.8 + heat * 0.5, haze: heat * 0.6, flash: out * 0.5, flashColor: '#ffffff'}}
        light={{rim: 3 + heat * 4, rimColor: COLORS.heat, key: 2.4}}
      >
        <Laptop3D time={t} heat={heat} reveal={smoothstep(0, 36, f)} chipHeat={heat} fanAngle={t * 45} screen={{hot: heat}} />
        <FlowWaves time={t} amount={heat} color={COLORS.heat} speed={1.2} />
      </Stage>

      <TopPill color={COLORS.red} delay={10} icon={<svg width={38} height={38} viewBox="0 0 200 200"><IconWarning color="#fff" sw={16} /></svg>}>
        Перегрев
      </TopPill>

      {f >= 84 && (
        <div style={{position: 'absolute', inset: 0, transform: `translateX(${cardShake}px)`}}>
          <NeonCard color={COLORS.red} width={520} height={250} x={540} y={1065} delay={84}>
            <BigNumber color={COLORS.red} size={170}>
              {Math.round(temp)}°C
            </BigNumber>
          </NeonCard>
          <div style={{position: 'absolute', left: 0, right: 0, top: 1168, display: 'flex', justifyContent: 'center'}}>
            <Pill color={COLORS.red} delay={92} size={30}>
              Температура CPU
            </Pill>
          </div>
        </div>
      )}
      <div style={{display: 'none', fontFamily: FONT_FAMILY}} />
    </AbsoluteFill>
  );
};
