// 1. ХУК 0.00–3.00: перегретый ноутбук, волны жара, тряска, термометр до 98°C.
import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FlowWaves} from '../components/Effects3D';
import {Gauge} from '../components/Gauge';
import {Laptop3D} from '../components/Laptop3D';
import {Stage} from '../components/Stage';
import {camPath, easeInExpo, range, smoothstep} from '../lib/anim';
import {COLORS} from '../lib/colors';

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const heat = smoothstep(0.15, 2.4, t);

  const cam = camPath(f, [
    {f: 0, pos: [4.6, 2.9, 6.6], target: [0.3, -0.4, -0.35], fov: 44},
    {f: 160, pos: [3.9, 2.45, 5.6], target: [0.35, -0.35, -0.35], fov: 44},
  ]);
  // быстрый зум-переход в рентген (последние кадры)
  const out = easeInExpo(range(f, 160, 180));
  cam.pos = [cam.pos[0] - out * 1.0, cam.pos[1] - out * 0.4, cam.pos[2] - out * 1.6];

  // стрелка термометра: резкий бросок 36 → 98 с перелётом
  const sp = spring({frame: f - 14, fps, config: {damping: 9, stiffness: 120, mass: 0.6}});
  const temp = 36 + (98 - 36) * sp + (sp > 0.95 ? Math.sin(f * 0.9) * 0.4 : 0);

  return (
    <AbsoluteFill>
      <Stage
        camera={{...cam, shake: 0.02 + 0.03 * heat}}
        fx={{bloom: 0.75 + heat * 0.6, haze: heat * 0.9, vignette: 0.75, flash: out * 0.6, flashColor: '#ffffff'}}
        light={{rim: 3 + heat * 5, rimColor: COLORS.heat, key: 2.4}}
        tint={COLORS.heat}
      >
        <Laptop3D time={t} heat={heat} chipHeat={heat} fanAngle={t * 45} screen={{hot: heat}} />
        <FlowWaves time={t} amount={heat} color={COLORS.heat} speed={1.2} />
      </Stage>
      <Gauge value={temp} opacity={smoothstep(0, 10, f)} blink={temp > 97 ? (Math.floor(f / 8) % 2) : 0} />
    </AbsoluteFill>
  );
};
