// Процедурные комья пыли (instanced): плотность растёт с grow, выдуваются с blow.
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {clamp, rand, smoothstep} from '../lib/anim';
import {P} from './Laptop3D';

const lumpyGeometry = () => {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * 5.1 + v.y * 3.3) * 0.18 + Math.sin(v.z * 7.7 - v.x * 2.1) * 0.12 + Math.sin(v.y * 11.3) * 0.08;
    v.multiplyScalar(1 + n);
    pos.setXYZ(i, v.x, v.y * 0.75, v.z);
  }
  g.computeVertexNormals();
  return g;
};

const dustMaterial = () =>
  new THREE.MeshStandardMaterial({color: '#6f6c68', roughness: 1, metalness: 0, flatShading: true});

type Item = {x: number; y: number; z: number; s: number; t0: number; vx: number; vy: number; vz: number; rot: number};

const useDust = (items: Item[], grow: number, blow: number) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(lumpyGeometry, []);
  const mat = useMemo(dustMaterial, []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    items.forEach((it, i) => {
      const appear = smoothstep(it.t0, it.t0 + 0.12, grow);
      const b = clamp(blow * 1.25 - it.t0 * 0.25);
      const d = b * b * 2.2;
      p.set(it.x + it.vx * d, it.y + it.vy * d, it.z + it.vz * d);
      const s = it.s * appear * (1 - smoothstep(0.35, 1, b));
      sc.set(s, s, s);
      e.set(it.rot, it.rot * 1.7 + b * 6, it.rot * 0.6);
      q.setFromEuler(e);
      m.compose(p, q, sc);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return {ref, geo, mat};
};

/** Пыль на рёбрах радиатора и в кожухе вентилятора (координаты ноутбука). */
export const DustFins: React.FC<{grow: number; blow: number}> = ({grow, blow}) => {
  const items = useMemo(() => {
    const r = rand(5);
    const out: Item[] = [];
    // ковёр пыли на входной стороне радиатора
    for (let i = 0; i < 260; i++) {
      const z = P.rad.z0 + r() * (P.rad.z1 - P.rad.z0);
      out.push({
        x: P.rad.x - 0.1 + r() * 0.05,
        y: 0.045 + r() * 0.075,
        z,
        s: 0.012 + r() * 0.028,
        t0: r() * 0.85,
        vx: 1.0 + r() * 0.8,
        vy: 0.1 + r() * 0.5,
        vz: (r() - 0.5) * 0.6,
        rot: r() * 6,
      });
    }
    // комья на дне кожуха вентилятора и вокруг
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      const rr = 0.12 + r() * 0.2;
      out.push({
        x: P.fan[0] + Math.cos(a) * rr,
        y: 0.05 + r() * 0.02,
        z: P.fan[1] + Math.sin(a) * rr,
        s: 0.01 + r() * 0.022,
        t0: r() * 0.9,
        vx: 0.8 + r(),
        vy: 0.4 + r() * 0.6,
        vz: (r() - 0.5) * 0.8,
        rot: r() * 6,
      });
    }
    return out;
  }, []);
  const {ref, geo, mat} = useDust(items, grow, blow);
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false} visible={grow > 0.001} />;
};

/** Пыль на лопастях (локальные координаты вращающегося ротора). */
export const DustBlades: React.FC<{grow: number; blow: number}> = ({grow, blow}) => {
  const items = useMemo(() => {
    const r = rand(11);
    const out: Item[] = [];
    for (let i = 0; i < 110; i++) {
      const a = r() * Math.PI * 2;
      const rr = 0.1 + r() * 0.18;
      out.push({
        x: Math.cos(a) * rr,
        y: 0.02 + r() * 0.02,
        z: Math.sin(a) * rr,
        s: 0.01 + r() * 0.022,
        t0: r() * 0.9,
        vx: Math.cos(a) * 1.5,
        vy: 0.5 + r() * 0.5,
        vz: Math.sin(a) * 1.5,
        rot: r() * 6,
      });
    }
    return out;
  }, []);
  const {ref, geo, mat} = useDust(items, grow, blow);
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false} visible={grow > 0.001} />;
};
