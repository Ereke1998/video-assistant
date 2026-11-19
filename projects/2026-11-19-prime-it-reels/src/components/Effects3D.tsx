// Процедурные эффекты: волны жара/потоки воздуха (шейдер), стрелки горячего воздуха,
// частицы-линии голубого потока.
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {clamp, rand, smoothstep} from '../lib/anim';
import {COLORS} from '../lib/colors';
import {L, P} from './Laptop3D';

/** Полупрозрачные полосы-волны, вырывающиеся из решётки (+X). */
export const FlowWaves: React.FC<{time: number; amount: number; color?: string; speed?: number; length?: number}> = ({
  time,
  amount,
  color = COLORS.heat,
  speed = 1,
  length = 2.4,
}) => {
  const makeMat = () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
        uniforms: {uTime: {value: 0}, uAmt: {value: 0}, uColor: {value: new THREE.Color()}, uSpeed: {value: 1}, uSeed: {value: 0}},
        vertexShader: /* glsl */ `
          uniform float uTime, uSpeed, uSeed; varying vec2 vUv;
          void main(){
            vUv = uv; vec3 p = position;
            // искажение: волна изгибает полотно по мере удаления от решётки
            p.y += sin(uv.x*9.0 - uTime*6.0*uSpeed + uSeed) * 0.12 * uv.x;
            p.y += sin(uv.x*3.0 - uTime*2.0 + uSeed*2.0) * 0.18 * uv.x * uv.x;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime, uAmt, uSpeed, uSeed; uniform vec3 uColor; varying vec2 vUv;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
          void main(){
            float x = vUv.x, y = vUv.y;
            float n = noise(vec2(x*6.0 - uTime*3.0*uSpeed, y*4.0 + uSeed));
            float bands = smoothstep(0.55, 1.0, sin((x*14.0 - uTime*9.0*uSpeed) + n*4.0 + y*2.0)*0.5+0.5);
            float streak = smoothstep(0.35, 0.0, abs(y-0.5 + (n-0.5)*0.4));
            float fade = smoothstep(0.0, 0.08, x) * (1.0 - smoothstep(0.45, 1.0, x));
            float a = (bands*0.8 + 0.25) * streak * fade * uAmt;
            gl_FragColor = vec4(uColor * (1.2 + bands), a * 0.7);
          }
        `,
      });
  const planes = [
    {z: -0.62, y: 0.06, rx: 0, s: 0},
    {z: -0.4, y: 0.07, rx: Math.PI / 2, s: 1.3},
    {z: -0.18, y: 0.06, rx: 0.4, s: 2.1},
    {z: -0.5, y: 0.08, rx: -0.5, s: 3.3},
    {z: -0.3, y: 0.05, rx: 1.0, s: 4.1},
  ];
  const mats = useMemo(() => planes.map(() => makeMat()), []);
  mats.forEach((m, i) => {
    m.uniforms.uTime.value = time;
    m.uniforms.uAmt.value = amount;
    m.uniforms.uSpeed.value = speed;
    m.uniforms.uColor.value.set(color);
    m.uniforms.uSeed.value = planes[i].s;
  });
  if (amount <= 0.001) return null;
  return (
    <group position={[L.W / 2 + 0.02, 0, 0]}>
      {planes.map((p, i) => {
        const m = mats[i];
        return (
          <mesh key={i} position={[length / 2, p.y, p.z]} rotation={[p.rx, 0, 0]} material={m}>
            <planeGeometry args={[length, 0.55, 48, 4]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Красные стрелки горячего воздуха: летят к радиатору, упираются в пыль, отскакивают. */
export const HeatArrows: React.FC<{time: number; amount: number}> = ({time, amount}) => {
  const mats = useMemo(() => Array.from({length: 9}).map(() => new THREE.MeshBasicMaterial({color: new THREE.Color(COLORS.heat).multiplyScalar(2.2), toneMapped: false, transparent: true})), []);
  const lanes = useMemo(() => {
    const r = rand(3);
    return Array.from({length: 9}).map((_, i) => ({
      z: P.rad.z0 + 0.06 + (i / 8) * (P.rad.z1 - P.rad.z0 - 0.12),
      y: 0.085 + (r() - 0.5) * 0.03,
      phase: r(),
      deflect: (r() - 0.5) * 1.2,
    }));
  }, []);
  if (amount <= 0.001) return null;
  return (
    <group>
      {lanes.map((ln, i) => {
        const cycle = 1.1;
        const u = ((time / cycle + ln.phase) % 1 + 1) % 1;
        const xStart = P.fan[0] + 0.05;
        const xHit = P.rad.x - 0.15;
        let x: number;
        let y = ln.y;
        let z = ln.z;
        let dir = 1;
        let tilt = 0;
        if (u < 0.55) {
          const k = u / 0.55;
          x = xStart + (xHit - xStart) * k * k * (3 - 2 * k) * 0.7 + (xHit - xStart) * 0.3 * k;
        } else {
          const k = (u - 0.55) / 0.45;
          x = xHit - k * 0.35;
          y = ln.y + k * 0.25;
          z = ln.z + ln.deflect * k * 0.15;
          dir = -1;
          tilt = 0.6 * k;
        }
        const op = smoothstep(0, 0.08, u) * (1 - smoothstep(0.85, 1, u)) * amount;
        const m = mats[i];
        m.opacity = op;
        const s = 0.9 + 0.25 * Math.sin(u * 20);
        return (
          <group key={i} position={[x, y, z]} rotation={[0, dir > 0 ? 0 : Math.PI, dir > 0 ? 0 : -tilt]} scale={s}>
            <mesh position={[-0.05, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={m}>
              <cylinderGeometry args={[0.009, 0.009, 0.1, 8]} />
            </mesh>
            <mesh position={[0.025, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={m}>
              <coneGeometry args={[0.025, 0.05, 12]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/** Голубой поток: частицы-линии от вентилятора через радиатор наружу. */
export const AirStreaks: React.FC<{time: number; amount: number; color?: string; count?: number}> = ({
  time,
  amount,
  color = COLORS.cool,
  count = 140,
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(2.0), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}), [color]);
  const items = useMemo(() => {
    const r = rand(21);
    return Array.from({length: count}).map(() => ({
      y: 0.05 + r() * 0.07 + (r() < 0.3 ? r() * 0.3 : 0),
      z: P.rad.z0 + r() * (P.rad.z1 - P.rad.z0),
      speed: 1.6 + r() * 1.6,
      phase: r(),
      len: 0.08 + r() * 0.2,
      spread: (r() - 0.5) * 0.8,
      lift: r() * 0.4,
    }));
  }, [count]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const x0 = P.fan[0];
    const span = 3.2;
    items.forEach((it, i) => {
      const u = ((time * it.speed) / span + it.phase) % 1;
      const x = x0 + u * span;
      const out = Math.max(0, x - L.W / 2);
      p.set(x, it.y + out * it.lift * 0.4, it.z + out * it.spread * 0.5);
      const fade = smoothstep(0, 0.1, u) * (1 - smoothstep(0.7, 1, u));
      const th = 0.006 * fade * clamp(amount * 1.2);
      s.set(it.len * (0.5 + amount * 0.5), th, th);
      q.identity();
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  mat.opacity = clamp(amount);
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} visible={amount > 0.001} />;
};
