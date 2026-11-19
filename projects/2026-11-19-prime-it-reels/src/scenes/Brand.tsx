// 5. ФИНАЛ И БРЕНД 26.00–32.00: перечёркнутый чек → 3D-голограмма закрывается,
// из-за неё поднимается неоновый PRIME IT → плашки БЫСТРО/ГАРАНТИЯ → директ.
// С 30.5 с (кадр 270 сцены) — статичный кадр.
import React from 'react';
import {AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_FAMILY} from '../components/font';
import {Laptop3D} from '../components/Laptop3D';
import {IconBolt, IconPlane, IconReceipt, IconShield, Line, NeonSvg} from '../components/neon/Icons';
import {Pill, ShotFx, glow} from '../components/neon/ui';
import {Stage} from '../components/Stage';
import {camPath, easeInOut, lerp, range, smoothstep} from '../lib/anim';
import {COLORS} from '../lib/colors';

const B = COLORS.cool;
const CY = COLORS.cyan;
export const FREEZE_AT = 270;
export const LOGO_AT = 104; // ≈27.73 с — click.wav

const ShotReceipt: React.FC = () => {
  const f = useCurrentFrame();
  const R = COLORS.red;
  return (
    <ShotFx dur={78}>
      <NeonSvg size={560} x={540} y={790} color={COLORS.heat}>
        <IconReceipt color={COLORS.heat} sw={5} draw={range(f, 0, 18)} />
      </NeonSvg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 760, display: 'flex', justifyContent: 'center', fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 150, color: '#fff', textShadow: glow(COLORS.heat, 0.8), opacity: smoothstep(8, 16, f)}}>
        ₸₸₸
      </div>
      <NeonSvg size={700} x={540} y={790} color={R} glowK={1.4}>
        <Line color={R} sw={12} d="M20 30 L180 170" draw={range(f, 26, 40)} />
      </NeonSvg>
    </ShotFx>
  );
};

const Final: React.FC = () => {
  const raw = useCurrentFrame(); // от 78 кадра сцены
  const F = Math.min(raw + 78, FREEZE_AT); // кадр сцены, замороженный с 30.5 с
  const f = F - 78;
  const {fps} = useVideoConfig();
  const t = (F + 1560) / 60;

  const lid = lerp(-0.28, Math.PI / 2 - 0.035, easeInOut(range(f, 0, 50)));
  const cam = camPath(f, [
    {f: 0, pos: [7.2, 4.6, 10.5], target: [0.3, -0.45, -0.35], fov: 40},
    {f: 60, pos: [0.0, 3.8, 8.4], target: [0, 0.22, 0], fov: 42},
  ]);
  const logo = spring({frame: F - LOGO_AT, fps, config: {damping: 14, stiffness: 120, mass: 0.8}});
  const flick = F < LOGO_AT + 30 && F >= LOGO_AT ? [1, 0.3, 1, 0.5, 1, 1, 0.4, 1][Math.floor((F - LOGO_AT) / 4) & 7] : 1;
  const g = logo * flick;
  const plate = spring({frame: F - (LOGO_AT + 22), fps, config: {damping: 16, stiffness: 140}});
  const CTA_AT = 267; // 30.45 с — после последнего субтитра
  const planeP = easeInOut(range(F, 216, CTA_AT));
  const planeX = lerp(-150, 330, planeP);
  const planeY = lerp(1700, 1500, planeP) - Math.sin(planeP * Math.PI) * 160;

  return (
    <AbsoluteFill>
      <Stage transparent camera={cam} fx={{bloom: 0.8, flash: (1 - smoothstep(0, 10, f)) * 0.45, flashColor: '#bfd3ff'}} light={{rim: 5, rimColor: B, key: 3.2, env: 1.0, ambient: 0.4}}>
        <Laptop3D time={t} lid={lid} screen={{cool: 1, on: 1 - smoothstep(30, 50, f)}} fanAngle={t * 20} />
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.85, 1.9, 96]} />
          <meshBasicMaterial color={B} toneMapped={false} transparent opacity={0.9 * smoothstep(40, 90, f)} />
        </mesh>
      </Stage>

      {/* логотип поднимается из-за ноутбука (маска по верхней кромке корпуса) */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 900, overflow: 'hidden'}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 370,
            textAlign: 'center',
            transform: `translateY(${(1 - logo) * 560}px) scale(${0.85 + 0.15 * logo})`,
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            fontSize: 240,
            lineHeight: 1,
            letterSpacing: 8,
            color: '#ffffff',
            textShadow: `0 0 ${18 * g}px ${B}, 0 0 ${50 * g}px ${B}aa, 0 0 ${110 * g}px ${B}66`,
          }}
        >
          PRIME <span style={{color: CY, textShadow: `0 0 ${24 * g}px ${CY}, 0 0 ${80 * g}px ${CY}`}}>IT</span>
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 650, display: 'flex', justifyContent: 'center', opacity: plate, transform: `translateY(${(1 - plate) * 40}px)`}}>
        <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 46, color: '#fff', padding: '16px 40px', borderRadius: 999, background: 'rgba(47,107,255,0.14)', border: `3px solid ${B}`, boxShadow: `${glow(B, 0.6)}, inset 0 0 20px ${B}33`, letterSpacing: 1}}>
          Обслуживание и ремонт ноутбуков
        </div>
      </div>
      {F >= 156 && (
        <Sequence from={156 - 78} layout="none">
          <div style={{position: 'absolute', left: 0, right: 0, top: 760, display: 'flex', justifyContent: 'center', gap: 28}}>
            <Pill color={CY} delay={0} size={42} icon={<svg width={46} height={46} viewBox="0 0 200 200"><IconBolt color="#fff" sw={16} /></svg>}>
              Быстро
            </Pill>
            <Pill color={CY} delay={12} size={42} icon={<svg width={46} height={46} viewBox="0 0 200 200"><IconShield color="#fff" sw={16} /></svg>}>
              Гарантия
            </Pill>
          </div>
        </Sequence>
      )}
      {/* самолётик директа и CTA-плашка */}
      {F >= 216 && F < CTA_AT && (
        <NeonSvg size={170} x={planeX} y={planeY} color={CY} rotate={-15}>
          <IconPlane color="#fff" sw={10} />
        </NeonSvg>
      )}
      {F >= CTA_AT - 1 && (
        <Sequence from={CTA_AT - 1 - 78} layout="none">
          <div style={{position: 'absolute', left: 0, right: 0, top: 1450, display: 'flex', justifyContent: 'center'}}>
            <Pill color={CY} delay={0} size={56} icon={<svg width={66} height={66} viewBox="0 0 200 200"><IconPlane color="#fff" sw={14} /></svg>}>
              Пиши в директ
            </Pill>
          </div>
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

export const Brand: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={78} layout="none">
      <ShotReceipt />
    </Sequence>
    <Sequence from={78} durationInFrames={282} layout="none">
      <Final />
    </Sequence>
  </AbsoluteFill>
);
