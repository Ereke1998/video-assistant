// 5. ФИНАЛ И БРЕНД 26.00–32.00: крышка закрывается, из-за ноутбука
// появляется неоновый логотип PRIME IT и плашка. Последние 1.5 с — статичный кадр.
import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_FAMILY} from '../components/font';
import {Laptop3D} from '../components/Laptop3D';
import {Stage} from '../components/Stage';
import {camPath, easeInOut, lerp, range, smoothstep} from '../lib/anim';
import {COLORS} from '../lib/colors';

export const FREEZE_AT = 270; // 30.5 с — дальше кадр неподвижен
export const LOGO_AT = 84; // ~27.4 с — click.wav

export const Brand: React.FC = () => {
  const raw = useCurrentFrame();
  const f = Math.min(raw, FREEZE_AT);
  const {fps} = useVideoConfig();
  const t = f / fps;

  const lid = lerp(-0.28, Math.PI / 2 - 0.035, easeInOut(range(f, 8, 78)));
  const cam = camPath(f, [
    {f: 0, pos: [4.3, 2.7, 6.2], target: [0.3, -0.4, -0.35], fov: 44},
    {f: 110, pos: [0.0, 3.9, 8.6], target: [0, -0.15, 0], fov: 42},
    {f: FREEZE_AT, pos: [0.0, 3.75, 8.3], target: [0, -0.15, 0], fov: 42},
  ]);

  const logo = spring({frame: f - LOGO_AT, fps, config: {damping: 14, stiffness: 120, mass: 0.8}});
  const plate = spring({frame: f - LOGO_AT - 26, fps, config: {damping: 16, stiffness: 140}});
  // неоновое «зажигание»: мерцание после появления, затем ровное свечение
  const flick = f < LOGO_AT + 30 ? [1, 0.3, 1, 0.5, 1, 1, 0.4, 1][Math.floor((f - LOGO_AT) / 4) & 7] : 1;
  const glow = logo * flick;
  const flashIn = 1 - smoothstep(0, 12, f);

  return (
    <AbsoluteFill>
      <Stage
        camera={cam}
        fx={{bloom: 0.8, vignette: 0.8, flash: flashIn * 0.6, flashColor: '#bff6ff'}}
        light={{rim: 5 + glow * 3, rimColor: COLORS.cool, key: 3.6, env: 1.1, ambient: 0.5}}
        tint={COLORS.cool}
        grid={0.4 + 0.6 * smoothstep(20, 90, f)}
      >
        <Laptop3D time={t} lid={lid} screen={{cool: 1, on: 1 - smoothstep(55, 78, f)}} fanAngle={t * 20} />
        {/* неоновая подсветка под ноутбуком */}
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.85, 1.9, 96]} />
          <meshBasicMaterial color={COLORS.cool} toneMapped={false} transparent opacity={0.85 * smoothstep(60, 120, f)} />
        </mesh>
      </Stage>

      {/* логотип поднимается из-за ноутбука: маска обрезает его по верхней кромке корпуса */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 780, overflow: 'hidden'}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 300,
            textAlign: 'center',
            transform: `translateY(${(1 - logo) * 360}px) scale(${0.85 + 0.15 * logo})`,
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            fontSize: 240,
            lineHeight: 1,
            letterSpacing: 8,
            color: '#ffffff',
            textShadow: `0 0 ${18 * glow}px ${COLORS.cool}, 0 0 ${50 * glow}px ${COLORS.cool}aa, 0 0 ${110 * glow}px ${COLORS.cool}66`,
            WebkitTextStroke: `3px ${COLORS.cool}`,
            paintOrder: 'stroke fill',
          }}
        >
          PRIME <span style={{color: COLORS.cool, textShadow: `0 0 ${24 * glow}px ${COLORS.cool}, 0 0 ${80 * glow}px ${COLORS.cool}`}}>IT</span>
        </div>
      </div>
      {/* плашка */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 610, display: 'flex', justifyContent: 'center', opacity: plate, transform: `translateY(${(1 - plate) * 40}px)`}}>
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            fontSize: 44,
            color: '#ffffff',
            padding: '20px 40px',
            borderRadius: 999,
            background: 'rgba(0, 229, 255, 0.10)',
            border: `3px solid ${COLORS.cool}`,
            boxShadow: `0 0 30px ${COLORS.cool}55, inset 0 0 20px ${COLORS.cool}33`,
            letterSpacing: 0.5,
          }}
        >
          Обслуживание и ремонт ноутбуков
        </div>
      </div>
    </AbsoluteFill>
  );
};
