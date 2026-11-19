// 3. ТЕРМОПАСТА И ТЕРМОПРОКЛАДКИ 10.00–18.00: макро-зум на CPU/GPU,
// паста трескается и каменеет, прокладки крошатся, глитч 0.5 с, падающий FPS.
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {FpsGraph} from '../components/FpsGraph';
import {Gauge} from '../components/Gauge';
import {Laptop3D, P} from '../components/Laptop3D';
import {Stage} from '../components/Stage';
import {camPath, easeInOut, easeOutExpo, range, smoothstep} from '../lib/anim';
import {COLORS} from '../lib/colors';

export const GLITCH_FROM = 240; // 14.0 с
export const GLITCH_TO = 270; // +0.5 с

export const ThermalProblem: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;

  const [cx, cz] = P.cpu;
  const [gx, gz] = P.gpu;
  // быстрый макро-зум (ease-out expo) и дальше плавные ключи
  const cam = camPath(
    f,
    [
      {f: 0, pos: [0.6, 1.5, 1.5], target: [-0.35, -0.2, -0.4], fov: 40},
      {f: 36, pos: [cx + 0.14, 0.5, cz + 0.6], target: [cx, -0.02, cz - 0.02], fov: 34},
    ],
    easeOutExpo,
  );
  if (f > 36) {
    const c2 = camPath(f, [
      {f: 36, pos: [cx + 0.14, 0.5, cz + 0.6], target: [cx, -0.02, cz - 0.02], fov: 34},
      {f: 190, pos: [cx + 0.22, 0.45, cz + 0.55], target: [cx, -0.02, cz - 0.01], fov: 34},
      {f: 225, pos: [gx + 0.1, 1.45, gz + 1.7], target: [gx, -0.05, gz - 0.02], fov: 36},
      {f: 330, pos: [gx + 0.05, 1.38, gz + 1.6], target: [gx, -0.05, gz - 0.02], fov: 36},
      {f: 420, pos: [0.1, 1.7, 1.75], target: [-0.3, -0.3, -0.42], fov: 40},
      {f: 480, pos: [0.05, 1.6, 1.6], target: [-0.3, -0.3, -0.42], fov: 40},
    ]);
    Object.assign(cam, c2);
  }

  const stone = easeInOut(range(f, 40, 200));
  const crack = easeInOut(range(f, 60, 215));
  const crumble = Math.max(0, (f - 228) / 60);
  const glitch = f >= GLITCH_FROM && f < GLITCH_TO ? 1 - range(f, GLITCH_FROM + 22, GLITCH_TO) : 0;
  const chipHeat = 0.4 + 0.6 * smoothstep(40, 300, f);
  const flashIn = 1 - smoothstep(0, 10, f);

  return (
    <AbsoluteFill>
      <Stage
        camera={{...cam, shake: glitch * 0.05}}
        fx={{
          bloom: 0.9,
          vignette: 0.75,
          rgb: glitch * (0.6 + 0.4 * Math.sin(f * 2.3)),
          scan: glitch,
          slice: glitch,
          haze: 0.25 * chipHeat,
          flash: flashIn * 0.45,
          flashColor: '#ffffff',
        }}
        light={{rim: 4.5, rimColor: COLORS.heat, key: 2.6, env: 0.55}}
        tint={COLORS.heat}
        grid={0.3}
      >
        <Laptop3D
          time={t}
          xray={1}
          caseVisible={1 - smoothstep(0, 24, f)}
          coolerLift={1}
          chipHeat={chipHeat}
          heat={1}
          screen={{hot: 1}}
          paste={{stone, crack, wipe: 0, drop: 0}}
          pads={{crumble, showOld: true}}
          dust={{grow: 0.5, blow: 0}}
        />
      </Stage>
      <Gauge value={98 + Math.sin(f * 0.7) * 0.6 + smoothstep(240, 300, f)} opacity={smoothstep(0, 12, f)} blink={Math.floor(f / 8) % 2} />
      <FpsGraph progress={range(f, 20, 470)} opacity={smoothstep(12, 30, f)} blink={f > 250 ? Math.floor(f / 10) % 2 === 0 : f > 150 && Math.floor(f / 20) % 2 === 0} />
    </AbsoluteFill>
  );
};
