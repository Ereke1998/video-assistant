// 4. РЕШЕНИЕ 18.00–26.00: пыль выдувается, паста стирается до зеркала,
// капля свежей пасты, новые прокладки на пружине, голубой поток, 98 → 52 °C.
import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {AirStreaks, FlowWaves} from '../components/Effects3D';
import {Gauge} from '../components/Gauge';
import {Laptop3D, P} from '../components/Laptop3D';
import {Stage} from '../components/Stage';
import {camPath, easeInOut, lerp, range, smoothstep} from '../lib/anim';
import {COLORS} from '../lib/colors';

export const Solution: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const [cx, cz] = P.cpu;
  const [gx, gz] = P.gpu;

  const cam = camPath(f, [
    {f: 0, pos: [2.1, 0.8, 0.2], target: [1.12, 0.0, -0.44], fov: 40},
    {f: 90, pos: [2.25, 0.9, 0.3], target: [1.15, 0.0, -0.44], fov: 40},
    {f: 120, pos: [cx + 0.14, 0.5, cz + 0.6], target: [cx, -0.02, cz - 0.02], fov: 34},
    {f: 270, pos: [cx + 0.22, 0.45, cz + 0.55], target: [cx, -0.02, cz - 0.01], fov: 34},
    {f: 300, pos: [gx + 0.1, 1.45, gz + 1.7], target: [gx, -0.05, gz - 0.02], fov: 36},
    {f: 370, pos: [gx + 0.05, 1.38, gz + 1.6], target: [gx, -0.05, gz - 0.02], fov: 36},
    {f: 440, pos: [4.6, 2.9, 6.6], target: [0.3, -0.4, -0.35], fov: 44},
    {f: 480, pos: [4.3, 2.7, 6.2], target: [0.3, -0.4, -0.35], fov: 44},
  ]);

  const blow = easeInOut(range(f, 6, 95));
  const coolerLift = smoothstep(95, 118, f) * (1 - smoothstep(372, 400, f));
  const wipe = easeInOut(range(f, 128, 178));
  const drop = range(f, 190, 262);
  const fresh = [0, 1, 2, 3].map((i) =>
    f < 280 ? 0 : spring({frame: f - 290 - i * 9, fps, config: {damping: 11, stiffness: 160, mass: 0.7}}),
  );
  const xray = 1 - smoothstep(395, 440, f);
  const caseVisible = smoothstep(380, 420, f);
  const cool = smoothstep(20, 120, f);
  const temp = lerp(98, 52, easeInOut(range(f, 60, 440)));
  const flashIn = 1 - smoothstep(0, 14, f);
  // голубой блик при стирании пасты до зеркала
  const glint = smoothstep(150, 172, f) * (1 - smoothstep(172, 200, f));

  return (
    <AbsoluteFill>
      <Stage
        camera={cam}
        fx={{bloom: 0.85 + glint * 0.8, vignette: 0.65, flash: flashIn * 0.6, flashColor: '#bff6ff'}}
        light={{rim: 4.5, rimColor: COLORS.cool, key: 2.6, env: (f > 110 && f < 380 ? 1.3 : 0.6) + glint}}
        tint={COLORS.cool}
      >
        <Laptop3D
          time={t}
          xray={xray}
          caseVisible={f < 120 ? 1 : caseVisible}
          coolerLift={coolerLift}
          chipHeat={0.5 * (1 - cool)}
          heat={0.15 * (1 - cool)}
          fanAngle={t * 55}
          screen={{cool: 1, hot: 1 - cool}}
          paste={{stone: 1, crack: 1, wipe, drop}}
          pads={{crumble: 0, showOld: f < 120, fresh}}
          dust={{grow: 1, blow}}
        >
          <AirStreaks time={t} amount={smoothstep(10, 60, f) * (1 - smoothstep(100, 120, f)) + smoothstep(390, 430, f)} />
        </Laptop3D>
        <FlowWaves time={t} amount={smoothstep(395, 440, f) * 0.9} color={COLORS.cool} speed={1.6} />
      </Stage>
      <Gauge value={temp} opacity={1} />
    </AbsoluteFill>
  );
};
