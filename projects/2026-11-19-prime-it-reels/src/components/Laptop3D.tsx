// Процедурная 3D-модель ноутбука (без логотипов): корпус из скруглённых плит,
// экран, клавиатура, решётка вентиляции и «начинка» для рентген/макро-сцен.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, lerp, rand} from '../lib/anim';
import {COLORS} from '../lib/colors';
import {DustBlades, DustFins} from './Dust';

// ---------------------------------------------------------------- размеры/координаты
export const L = {W: 3.0, D: 2.05, H: 0.13, T: 0.055};
export const Y = {boardTop: 0.04, chipTop: 0.06, dieTop: 0.072, pasteTop: 0.08, vramTop: 0.052, padTop: 0.066};
export const P = {
  cpu: [-0.75, -0.4] as [number, number],
  gpu: [0.05, -0.4] as [number, number],
  fan: [0.92, -0.4] as [number, number],
  fanR: 0.3,
  rad: {x: 1.34, z0: -0.72, z1: -0.08},
  vram: [
    [-0.31, -0.52],
    [-0.31, -0.28],
    [0.41, -0.52],
    [0.41, -0.28],
  ] as [number, number][],
};

// ---------------------------------------------------------------- геометрия
export const roundedSlab = (w: number, d: number, h: number, r: number, bevel = 0.018) => {
  const s = new THREE.Shape();
  const x = -w / 2 + bevel;
  const y = -d / 2 + bevel;
  const ww = w - bevel * 2;
  const dd = d - bevel * 2;
  const rr = Math.max(0.001, r - bevel);
  s.moveTo(x + rr, y);
  s.lineTo(x + ww - rr, y);
  s.quadraticCurveTo(x + ww, y, x + ww, y + rr);
  s.lineTo(x + ww, y + dd - rr);
  s.quadraticCurveTo(x + ww, y + dd, x + ww - rr, y + dd);
  s.lineTo(x + rr, y + dd);
  s.quadraticCurveTo(x, y + dd, x, y + dd - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.001, h - bevel * 2),
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  g.rotateX(-Math.PI / 2); // форма XY -> XZ, выдавливание вдоль +Y
  g.translate(0, bevel, 0);
  g.computeVertexNormals();
  return g;
};

// ---------------------------------------------------------------- шейдеры
const makeFresnel = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: {uColor: {value: new THREE.Color('#7fe6ff')}, uAmt: {value: 0}},
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main(){
        vec4 wp = modelMatrix * vec4(position,1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uAmt; varying vec3 vN; varying vec3 vV;
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        gl_FragColor = vec4(uColor * (0.04 + f * 0.7), (0.03 + f * 0.7) * uAmt);
      }
    `,
  });

const makeScreen = () =>
  new THREE.ShaderMaterial({
    toneMapped: false,
    uniforms: {uTime: {value: 0}, uHot: {value: 0}, uCool: {value: 0}, uOn: {value: 1}},
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uHot, uCool, uOn; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec2 uv = vUv;
        // нейтральный «рабочий стол»: градиент + мягкие волны (без текста/логотипов)
        vec3 idle = mix(vec3(0.03,0.06,0.14), vec3(0.08,0.22,0.42), uv.y);
        idle += 0.08 * vec3(0.2,0.6,1.0) * smoothstep(0.02, 0.0, abs(uv.y - 0.5 - 0.12*sin(uv.x*6.0 + uTime*1.5)));
        // перегрев: красные предупреждающие полосы + мерцание
        float stripes = step(0.5, fract((uv.x + uv.y) * 7.0 - uTime * 1.2));
        vec3 hot = mix(vec3(0.35,0.02,0.01), vec3(1.0,0.23,0.19), stripes*0.55 + 0.25*uv.y);
        hot *= 0.45 + 0.12 * step(0.5, fract(uTime * 4.0));
        hot += 0.04 * hash(floor(uv*vec2(80.0,50.0)) + floor(uTime*20.0));
        // спокойный режим: голубые волны
        vec3 cool = mix(vec3(0.0,0.10,0.16), vec3(0.0,0.55,0.70), uv.y);
        cool += 0.25 * vec3(0.0,0.9,1.0) * smoothstep(0.03, 0.0, abs(uv.y - 0.45 - 0.08*sin(uv.x*9.0 - uTime*2.0)));
        vec3 col = mix(idle, hot, uHot);
        col = mix(col, cool, uCool);
        gl_FragColor = vec4(col * uOn, 1.0);
      }
    `,
  });

const makeCracks = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    uniforms: {uCrack: {value: 0}, uGlow: {value: 0}, uSeed: {value: 0}},
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: /* glsl */ `
      uniform float uCrack, uGlow, uSeed; varying vec2 vUv;
      vec2 hash2(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
      // расстояние до границы ячейки Вороного (трещины)
      float vEdge(vec2 x){
        vec2 n = floor(x), f = fract(x), mg, mr; float md = 8.0;
        for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
          vec2 g = vec2(float(i),float(j)); vec2 o = hash2(n+g+uSeed); vec2 r = g+o-f; float d = dot(r,r);
          if(d<md){ md=d; mr=r; mg=g; }
        }
        md = 8.0;
        for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){
          vec2 g = mg+vec2(float(i),float(j)); vec2 o = hash2(n+g+uSeed); vec2 r = g+o-f;
          if(dot(mr-r,mr-r)>0.00001) md = min(md, dot(0.5*(mr+r), normalize(r-mr)));
        }
        return md;
      }
      void main(){
        float e1 = vEdge(vUv*4.0);
        float e2 = vEdge(vUv*9.0 + 2.7);
        float w1 = uCrack * 0.09;
        float w2 = smoothstep(0.35, 1.0, uCrack) * 0.06;
        float c = max(1.0 - smoothstep(0.0, w1, e1), (1.0 - smoothstep(0.0, w2, e2)) * step(0.001, w2));
        // трещины расползаются от центра
        float reach = smoothstep(uCrack*0.95 + 0.05, uCrack*0.95 - 0.15, length(vUv-0.5)*1.5);
        vec2 q = abs(vUv-0.5);
        float edgeMask = 1.0 - smoothstep(0.44, 0.5, max(q.x,q.y));
        float a = c * reach * edgeMask * step(0.001, uCrack);
        vec3 col = mix(vec3(0.03), vec3(1.0,0.28,0.08)*2.2, uGlow * (1.0 - smoothstep(0.0, max(w1,0.001)*0.5, e1)));
        gl_FragColor = vec4(col, a);
      }
    `,
  });

// шум для «каменной» фактуры старой пасты
const makeNoiseTex = () => {
  const n = 128;
  const r = rand(42);
  const data = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) {
    const v = Math.floor(120 + r() * 135);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, n, n);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
};

// ---------------------------------------------------------------- пропсы
export type PasteState = {
  /** 0 — свежая глянцевая, 1 — серый камень */
  stone: number;
  /** 0..1 рост трещин */
  crack: number;
  /** 0..1 стирание старой пасты */
  wipe: number;
  /** 0..1 капля свежей пасты (падение+растекание) */
  drop: number;
};

export type LaptopProps = {
  time: number;
  lid?: number; // радианы: -0.28 — открыт, PI/2 — закрыт
  heat?: number; // красное свечение корпуса
  chipHeat?: number; // нагрев чипов
  xray?: number;
  caseVisible?: number;
  fanAngle?: number;
  coolerLift?: number; // 0 — радиатор стоит, 1 — снят
  screen?: {hot?: number; cool?: number; on?: number};
  paste?: PasteState;
  pads?: {crumble?: number; showOld?: boolean; fresh?: number[]};
  dust?: {grow?: number; blow?: number};
  children?: React.ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

// ---------------------------------------------------------------- компонент
export const Laptop3D: React.FC<LaptopProps> = ({
  time,
  lid = -0.28,
  heat = 0,
  chipHeat = 0,
  xray = 0,
  caseVisible = 1,
  fanAngle = 0,
  coolerLift = 0,
  screen = {},
  paste = {stone: 0, crack: 0, wipe: 0, drop: 0},
  pads = {},
  dust = {},
  children,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) => {
  const m = useMemo(() => {
    const caseMat = new THREE.MeshStandardMaterial({color: '#3a3f48', metalness: 0.6, roughness: 0.32});
    const lidMat = caseMat.clone();
    const keyMat = new THREE.MeshStandardMaterial({color: '#121419', metalness: 0.2, roughness: 0.6});
    const padMat = new THREE.MeshStandardMaterial({color: '#23262c', metalness: 0.4, roughness: 0.25});
    const bezelMat = new THREE.MeshStandardMaterial({color: '#050506', metalness: 0.1, roughness: 0.2});
    const ventMat = new THREE.MeshStandardMaterial({color: '#0b0c0f', metalness: 0.3, roughness: 0.7});
    const ventGlow = new THREE.MeshBasicMaterial({color: COLORS.heat, toneMapped: false});
    const boardMat = new THREE.MeshStandardMaterial({color: '#0d3a2c', metalness: 0.2, roughness: 0.55});
    const substrateMat = new THREE.MeshStandardMaterial({color: '#1d5a3c', metalness: 0.2, roughness: 0.45});
    const dieMat = new THREE.MeshStandardMaterial({color: '#dfe4ea', metalness: 0.85, roughness: 0.25, envMapIntensity: 2.5});
    const vramMat = new THREE.MeshStandardMaterial({color: '#141418', metalness: 0.3, roughness: 0.5});
    const compMat = new THREE.MeshStandardMaterial({color: '#2a2a2e', metalness: 0.5, roughness: 0.4});
    const copperMat = new THREE.MeshStandardMaterial({color: '#c27a4a', metalness: 1, roughness: 0.28});
    const finMat = new THREE.MeshStandardMaterial({color: '#aeb4bb', metalness: 1, roughness: 0.3});
    const fanMat = new THREE.MeshStandardMaterial({color: '#16171b', metalness: 0.2, roughness: 0.5, side: THREE.DoubleSide});
    const batteryMat = new THREE.MeshStandardMaterial({color: '#1c1e23', metalness: 0.3, roughness: 0.6});
    const pasteMat = new THREE.MeshPhysicalMaterial({color: '#d8dde3', metalness: 0.15, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05});
    const noise = makeNoiseTex();
    pasteMat.bumpMap = noise;
    pasteMat.roughnessMap = noise;
    const freshPasteMat = new THREE.MeshPhysicalMaterial({color: '#e4e8ee', metalness: 0.2, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02});
    const oldPadMat = new THREE.MeshStandardMaterial({color: '#8d9a8f', metalness: 0, roughness: 0.95});
    const newPadMat = new THREE.MeshStandardMaterial({color: '#5fc6e8', metalness: 0, roughness: 0.55, emissive: '#0a3a4a'});
    return {
      caseMat, lidMat, keyMat, padMat, bezelMat, ventMat, ventGlow, boardMat, substrateMat, dieMat, vramMat, compMat,
      copperMat, finMat, fanMat, batteryMat, pasteMat, freshPasteMat, oldPadMat, newPadMat,
      fresnelBase: makeFresnel(),
      fresnelLid: makeFresnel(),
      screenMat: makeScreen(),
      cracks: [makeCracks(), makeCracks()],
    };
  }, []);

  const g = useMemo(() => {
    const base = roundedSlab(L.W, L.D, L.H, 0.12);
    const lidG = roundedSlab(L.W, L.D - 0.06, L.T, 0.12, 0.012);
    lidG.rotateX(Math.PI / 2);
    lidG.translate(0, (L.D - 0.06) / 2, -L.T);
    // клавиши
    const keys: [number, number, number, number][] = [];
    const cols = 14;
    const kw = 0.155;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -1.2 + c * (2.4 / (cols - 1));
        const z = -0.8 + r * 0.175;
        keys.push([x, z, kw, kw]);
      }
    }
    keys.push([0, -0.8 + 5 * 0.175, 0.95, kw]); // пробел
    // мелкие компоненты платы
    const r = rand(9);
    const comps: [number, number, number, number, number][] = [];
    for (let i = 0; i < 70; i++) {
      const x = -1.25 + r() * 2.0;
      const z = -0.85 + r() * 0.55;
      if (Math.abs(x - P.cpu[0]) < 0.25 && Math.abs(z - P.cpu[1]) < 0.25) continue;
      if (Math.abs(x - P.gpu[0]) < 0.5 && Math.abs(z - P.gpu[1]) < 0.3) continue;
      comps.push([x, z, 0.02 + r() * 0.06, 0.01 + r() * 0.025, 0.02 + r() * 0.05]);
    }
    // тепловые трубки
    const mkPipe = (dz: number) =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(P.cpu[0], 0.088, P.cpu[1] + dz),
          new THREE.Vector3(P.gpu[0], 0.088, P.gpu[1] + dz),
          new THREE.Vector3(0.45, 0.092, -0.82 + dz * 0.4),
          new THREE.Vector3(1.05, 0.092, -0.84 + dz * 0.4),
          new THREE.Vector3(1.36, 0.09, -0.62 + dz * 0.4),
        ]),
        80,
        0.022,
        10,
      );
    return {base, lidG, keys, comps, pipes: [mkPipe(-0.04), mkPipe(0.05)], paste: roundedSlab(0.19, 0.19, 0.01, 0.05, 0.004), pasteG: roundedSlab(0.25, 0.25, 0.01, 0.06, 0.004)};
  }, []);

  // ---- обновление материалов по кадру
  const op = clamp(1 - xray * 0.97) * caseVisible;
  const transparent = op < 0.999;
  for (const mat of [m.caseMat, m.lidMat, m.keyMat, m.padMat, m.bezelMat, m.ventMat]) {
    mat.transparent = transparent;
    mat.opacity = op;
    mat.depthWrite = !transparent;
  }
  const heatCol = new THREE.Color(COLORS.heat).lerp(new THREE.Color('#ff7a1a'), 0.35);
  m.caseMat.emissive.copy(heatCol);
  m.caseMat.emissiveIntensity = heat * 0.16;
  m.lidMat.emissive.copy(heatCol);
  m.lidMat.emissiveIntensity = heat * 0.08;
  m.keyMat.emissive.copy(heatCol);
  m.keyMat.emissiveIntensity = heat * 0.45;
  m.ventGlow.color.copy(new THREE.Color('#1a0503').lerp(new THREE.Color('#ff5a20'), clamp(heat)));
  m.ventGlow.color.multiplyScalar(1 + heat * 3);
  m.fresnelBase.uniforms.uAmt.value = xray * caseVisible;
  m.fresnelLid.uniforms.uAmt.value = xray * caseVisible;
  m.screenMat.uniforms.uTime.value = time;
  m.screenMat.uniforms.uHot.value = screen.hot ?? 0;
  m.screenMat.uniforms.uCool.value = screen.cool ?? 0;
  m.screenMat.uniforms.uOn.value = (screen.on ?? 1) * (1 - xray * 0.85) * caseVisible;
  m.screenMat.transparent = false;

  const ch = clamp(chipHeat);
  m.substrateMat.emissive.set(COLORS.heat);
  m.substrateMat.emissiveIntensity = ch * 0.22;
  m.vramMat.emissive.set(COLORS.heat);
  m.vramMat.emissiveIntensity = ch * 0.3;
  m.dieMat.roughness = lerp(0.25, 0.05, clamp(paste.wipe));
  m.dieMat.emissive.set(paste.wipe > 0.5 ? '#8fefff' : COLORS.heat);
  m.dieMat.emissiveIntensity = paste.wipe > 0.5 ? 0.12 * clamp(paste.wipe) : ch * 0.4 * (1 - clamp(paste.wipe));
  m.dieMat.metalness = lerp(0.85, 1, clamp(paste.wipe));
  // паста: глянец -> камень
  const st = clamp(paste.stone);
  m.pasteMat.color.set('#d8dde3').lerp(new THREE.Color('#47464a'), st);
  m.pasteMat.roughness = lerp(0.12, 0.97, st);
  m.pasteMat.clearcoat = lerp(1, 0, st);
  m.pasteMat.bumpScale = lerp(0.2, 6, st);
  m.pasteMat.metalness = lerp(0.15, 0.0, st);
  for (const c of m.cracks) {
    c.uniforms.uCrack.value = clamp(paste.crack);
    c.uniforms.uGlow.value = ch;
  }
  m.cracks[1].uniforms.uSeed.value = 3.7;

  const lift = clamp(coolerLift);
  const coolerY = lift * 0.9;
  for (const mat of [m.copperMat, m.finMat]) {
    mat.transparent = lift > 0.001;
    mat.opacity = 1 - lift;
    mat.depthWrite = lift < 0.5;
  }

  const wipe = clamp(paste.wipe);
  const drop = clamp(paste.drop);

  const pasteBlock = (cx: number, cz: number, size: number, geo: THREE.BufferGeometry, crackMat: THREE.ShaderMaterial) => {
    // старая паста стирается сдвигом/сжатием по X
    const sx = 1 - wipe;
    const show = sx > 0.01;
    // капля свежей пасты
    const fall = clamp(drop / 0.45);
    const spread = clamp((drop - 0.45) / 0.55);
    const sXZ = lerp(0.035, size * 0.5, 1 - Math.pow(1 - spread, 3));
    const sY = lerp(0.05, 0.007, 1 - Math.pow(1 - spread, 2));
    const dropY = lerp(0.55, Y.dieTop + 0.05, fall * fall);
    return (
      <group position={[cx, 0, cz]}>
        {show && (
          <group position={[(-size / 2) * (1 - sx), Y.dieTop, 0]} scale={[sx, 1, 1]}>
            <mesh geometry={geo} material={m.pasteMat} />
            <mesh position={[0, 0.0105, 0]} rotation={[-Math.PI / 2, 0, 0]} material={crackMat}>
              <planeGeometry args={[size, size]} />
            </mesh>
          </group>
        )}
        {drop > 0.001 && (
          <mesh position={[0, spread > 0 ? Y.dieTop + sY * 0.55 : dropY, 0]} scale={spread > 0 ? [sXZ, sY, sXZ] : [0.035, 0.05, 0.035]} material={m.freshPasteMat}>
            <sphereGeometry args={[1, 32, 16]} />
          </mesh>
        )}
      </group>
    );
  };

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ---------- корпус (основание) ---------- */}
      <mesh geometry={g.base} material={m.caseMat} renderOrder={5} />
      <mesh geometry={g.base} material={m.fresnelBase} renderOrder={6} />
      {/* клавиатура */}
      {g.keys.map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, L.H + 0.008, z]} material={m.keyMat} renderOrder={5}>
          <boxGeometry args={[w * 0.92, 0.02, d * 0.92]} />
        </mesh>
      ))}
      {/* тачпад */}
      <mesh position={[0, L.H + 0.001, 0.55]} material={m.padMat} renderOrder={5}>
        <boxGeometry args={[1.1, 0.004, 0.62]} />
      </mesh>
      {/* решётка вентиляции на правом торце */}
      <group position={[L.W / 2 + 0.003, L.H * 0.5, -0.4]}>
        <mesh position={[-0.012, 0, 0]} material={m.ventGlow}>
          <boxGeometry args={[0.01, 0.07, 0.66]} />
        </mesh>
        {Array.from({length: 16}).map((_, i) => (
          <mesh key={i} position={[0, 0, -0.31 + i * (0.62 / 15)]} material={m.ventMat} renderOrder={5}>
            <boxGeometry args={[0.012, 0.09, 0.016]} />
          </mesh>
        ))}
      </group>

      {/* красный отсвет жара у решётки */}
      <pointLight position={[L.W / 2 + 0.25, 0.15, -0.4]} color={COLORS.heat} intensity={heat * 6} distance={4} decay={2} />
      <pointLight position={[0.3, L.H + 0.3, -0.3]} color="#ff5a20" intensity={heat * 2.5} distance={3} decay={2} />
      {/* ---------- крышка ---------- */}
      <group position={[0, L.H, -L.D / 2 + 0.035]} rotation={[lid, 0, 0]}>
        <mesh geometry={g.lidG} material={m.lidMat} renderOrder={5} />
        <mesh geometry={g.lidG} material={m.fresnelLid} renderOrder={6} />
        <mesh position={[0, (L.D - 0.06) / 2, 0.0015]} material={m.bezelMat} renderOrder={5}>
          <planeGeometry args={[L.W - 0.08, L.D - 0.12]} />
        </mesh>
        <mesh position={[0, (L.D - 0.06) / 2 + 0.03, 0.003]} material={m.screenMat}>
          <planeGeometry args={[L.W - 0.2, L.D - 0.3]} />
        </mesh>
      </group>

      {/* ---------- начинка ---------- */}
      <group visible={xray > 0.02 || caseVisible < 0.99}>
        <mesh position={[0, Y.boardTop - 0.0075, -0.45]} material={m.boardMat}>
          <boxGeometry args={[2.7, 0.015, 0.95]} />
        </mesh>
        <mesh position={[0, 0.045, 0.38]} material={m.batteryMat}>
          <boxGeometry args={[2.3, 0.05, 0.62]} />
        </mesh>
        {g.comps.map(([x, z, w, h, d], i) => (
          <mesh key={i} position={[x, Y.boardTop + h / 2, z]} material={m.compMat}>
            <boxGeometry args={[w, h, d]} />
          </mesh>
        ))}
        {/* CPU */}
        <mesh position={[P.cpu[0], Y.boardTop + 0.01, P.cpu[1]]} material={m.substrateMat}>
          <boxGeometry args={[0.34, 0.02, 0.34]} />
        </mesh>
        <mesh position={[P.cpu[0], Y.chipTop + 0.006, P.cpu[1]]} material={m.dieMat}>
          <boxGeometry args={[0.2, 0.012, 0.2]} />
        </mesh>
        {pasteBlock(P.cpu[0], P.cpu[1], 0.19, g.paste, m.cracks[0])}
        {/* GPU */}
        <mesh position={[P.gpu[0], Y.boardTop + 0.01, P.gpu[1]]} material={m.substrateMat}>
          <boxGeometry args={[0.44, 0.02, 0.44]} />
        </mesh>
        <mesh position={[P.gpu[0], Y.chipTop + 0.006, P.gpu[1]]} material={m.dieMat}>
          <boxGeometry args={[0.26, 0.012, 0.26]} />
        </mesh>
        {pasteBlock(P.gpu[0], P.gpu[1], 0.25, g.pasteG, m.cracks[1])}
        {/* VRAM + термопрокладки */}
        {P.vram.map(([x, z], i) => (
          <mesh key={i} position={[x, Y.boardTop + 0.006, z]} material={m.vramMat}>
            <boxGeometry args={[0.13, 0.012, 0.17]} />
          </mesh>
        ))}
        <ThermalPads crumble={pads.crumble ?? 0} showOld={pads.showOld ?? true} fresh={pads.fresh ?? [0, 0, 0, 0]} oldMat={m.oldPadMat} newMat={m.newPadMat} />

        {/* система охлаждения (может сниматься) */}
        <group position={[0, coolerY, 0]} visible={lift < 0.99}>
          {g.pipes.map((pg, i) => (
            <mesh key={i} geometry={pg} material={m.copperMat} />
          ))}
          <mesh position={[P.cpu[0], 0.082, P.cpu[1]]} material={m.copperMat}>
            <boxGeometry args={[0.24, 0.012, 0.24]} />
          </mesh>
          <mesh position={[P.gpu[0], 0.082, P.gpu[1]]} material={m.copperMat}>
            <boxGeometry args={[0.3, 0.012, 0.3]} />
          </mesh>
        </group>
        {/* радиатор */}
        {Array.from({length: 24}).map((_, i) => (
          <mesh key={i} position={[P.rad.x, 0.078, P.rad.z0 + i * ((P.rad.z1 - P.rad.z0) / 23)]} material={m.finMat}>
            <boxGeometry args={[0.17, 0.075, 0.007]} />
          </mesh>
        ))}
        {/* вентилятор */}
        <group position={[P.fan[0], 0.04, P.fan[1]]}>
          <mesh position={[0, 0.04, 0]} material={m.fanMat}>
            <cylinderGeometry args={[P.fanR + 0.02, P.fanR + 0.02, 0.08, 48, 1, true, 0.4, Math.PI * 2 - 0.8]} />
          </mesh>
          <mesh position={[0, 0.002, 0]} material={m.fanMat}>
            <cylinderGeometry args={[P.fanR + 0.02, P.fanR + 0.02, 0.004, 48]} />
          </mesh>
          <group position={[0, 0.04, 0]} rotation={[0, fanAngle, 0]}>
            <mesh material={m.fanMat}>
              <cylinderGeometry args={[0.085, 0.085, 0.06, 32]} />
            </mesh>
            {Array.from({length: 13}).map((_, i) => {
              const a = (i / 13) * Math.PI * 2;
              return (
                <group key={i} rotation={[0, a, 0]}>
                  <mesh position={[0.18, 0, 0]} rotation={[0.55, 0, 0]} material={m.fanMat}>
                    <boxGeometry args={[0.2, 0.055, 0.01]} />
                  </mesh>
                </group>
              );
            })}
            <DustBlades grow={dust.grow ?? 0} blow={dust.blow ?? 0} />
          </group>
        </group>
        <DustFins grow={dust.grow ?? 0} blow={dust.blow ?? 0} />
        {children}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- термопрокладки
const PAD = {w: 0.12, d: 0.16, h: 0.012};
const ThermalPads: React.FC<{
  crumble: number;
  showOld: boolean;
  fresh: number[];
  oldMat: THREE.Material;
  newMat: THREE.Material;
}> = ({crumble, showOld, fresh, oldMat, newMat}) => {
  const pieces = useMemo(() => {
    const r = rand(77);
    const list: {pad: number; ox: number; oz: number; delay: number; vx: number; vz: number; vy: number; rx: number; rz: number}[] = [];
    for (let p = 0; p < 4; p++) {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 4; j++) {
          list.push({
            pad: p,
            ox: (i - 1) * (PAD.w / 3),
            oz: (j - 1.5) * (PAD.d / 4),
            delay: r() * 0.55,
            vx: (r() - 0.5) * 0.5 + (p < 2 ? -0.15 : 0.15),
            vz: (r() - 0.5) * 0.5,
            vy: 0.15 + r() * 0.25,
            rx: (r() - 0.5) * 8,
            rz: (r() - 0.5) * 8,
          });
        }
      }
    }
    return list;
  }, []);
  return (
    <group>
      {showOld &&
        pieces.map((pc, i) => {
          const [x, z] = P.vram[pc.pad];
          const tRaw = Math.max(0, crumble - pc.delay) * 1.6; // «секунды» падения
          const y0c = Y.vramTop + PAD.h / 2;
          const tLand = (pc.vy + Math.sqrt(pc.vy * pc.vy + 4 * 2.2 * (y0c - Y.boardTop - 0.006))) / (2 * 2.2);
          const t = Math.min(tRaw, tLand);
          const y0 = Y.vramTop + PAD.h / 2;
          const px = x + pc.ox + pc.vx * t;
          const pz = z + pc.oz + pc.vz * t;
          const py = Math.max(Y.boardTop + 0.006, y0 + pc.vy * t - 2.2 * t * t);
          const s = t > 0 ? 0.85 : 1;
          return (
            <mesh key={i} position={[px, py, pz]} rotation={[pc.rx * Math.min(t, 0.4), 0, pc.rz * Math.min(t, 0.4)]} scale={s} material={oldMat}>
              <boxGeometry args={[PAD.w / 3 - 0.002, PAD.h, PAD.d / 4 - 0.002]} />
            </mesh>
          );
        })}
      {fresh.map((f, i) => {
        if (f <= 0.001) return null;
        const [x, z] = P.vram[i];
        const y = Y.vramTop + PAD.h / 2 + (1 - f) * 0.45;
        return (
          <mesh key={`n${i}`} position={[x, y, z]} material={newMat}>
            <boxGeometry args={[PAD.w, PAD.h, PAD.d]} />
          </mesh>
        );
      })}
    </group>
  );
};
