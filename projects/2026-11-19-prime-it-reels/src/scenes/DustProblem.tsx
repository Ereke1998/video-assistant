// 2. ПЫЛЬ 3.00–10.00: рентген корпуса, пролёт внутрь к системе охлаждения,
// пыль нарастает, красные стрелки горячего воздуха упираются в пыль и отскакивают.
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {HeatArrows} from '../components/Effects3D';
import {Laptop3D} from '../components/Laptop3D';
import {Stage} from '../components/Stage';
import {camPath, easeInExpo, range, smoothstep} from '../lib/anim';
import {COLORS} from '../lib/colors';

export const DustProblem: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const xray = smoothstep(0, 50, f);
  const grow = 0.04 + 0.96 * smoothstep(30, 360, f);

  const cam = camPath(f, [
    {f: 0, pos: [2.9, 1.7, 4.0], target: [0.5, -0.1, -0.4], fov: 40},
    {f: 150, pos: [1.95, 0.95, 0.55], target: [1.08, 0.0, -0.42], fov: 40},
    {f: 400, pos: [2.15, 0.8, 0.15], target: [1.12, 0.0, -0.44], fov: 40},
  ]);
  const out = easeInExpo(range(f, 400, 420));
  cam.pos = [cam.pos[0] - out * 0.3, cam.pos[1] - out * 0.2, cam.pos[2] - out * 0.35];
  const flashIn = 1 - smoothstep(0, 14, f);

  // вентилятор вязнет в пыли
  const fanAngle = t * 30 - t * t * 1.4;

  return (
    <AbsoluteFill>
      <Stage
        camera={cam}
        fx={{bloom: 0.9, vignette: 0.7, flash: Math.max(flashIn * 0.55, out * 0.4), flashColor: '#ffffff'}}
        light={{rim: 2.2, rimColor: COLORS.heat, key: 2.8, env: 0.6}}
        tint={COLORS.heat}
        grid={0.5}
      >
        <Laptop3D
          time={t}
          heat={1}
          chipHeat={0.45}
          xray={xray}
          fanAngle={fanAngle}
          screen={{hot: 0.6}}
          dust={{grow, blow: 0}}
        >
          <HeatArrows time={t} amount={smoothstep(100, 140, f)} />
        </Laptop3D>
      </Stage>
    </AbsoluteFill>
  );
};
