import {ThreeCanvas} from '@remotion/three';
import {useFrame, useThree} from '@react-three/fiber';
import React, {useEffect, useMemo, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {shakeNoise} from '../lib/anim';
import {COLORS} from '../lib/colors';

export type CameraState = {
  pos: [number, number, number];
  target: [number, number, number];
  fov?: number;
  /** амплитуда тряски в мировых единицах (0.02–0.05) */
  shake?: number;
  roll?: number;
};

export type FxState = {
  bloom?: number;
  rgb?: number; // RGB-сдвиг (глитч)
  scan?: number; // scanlines
  slice?: number; // горизонтальные срезы (глитч)
  haze?: number; // тепловое марево
  flash?: number; // вспышка перехода
  flashColor?: string;
  vignette?: number;
};

export type LightState = {
  key?: number;
  rim?: number;
  rimColor?: string;
  ambient?: number;
  env?: number;
};

const FxShader = {
  uniforms: {
    tDiffuse: {value: null},
    uTime: {value: 0},
    uRgb: {value: 0},
    uScan: {value: 0},
    uSlice: {value: 0},
    uHaze: {value: 0},
    uFlash: {value: 0},
    uFlashColor: {value: new THREE.Color('#ffffff')},
    uVig: {value: 0.6},
    uTransp: {value: 0},
    uRes: {value: new THREE.Vector2(1080, 1920)},
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uRgb, uScan, uSlice, uHaze, uFlash, uVig, uTransp;
    uniform vec3 uFlashColor;
    uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
    }
    void main(){
      vec2 uv = vUv;
      // тепловое марево
      float hz = noise(vec2(uv.x*7.0, uv.y*14.0 - uTime*4.0)) + 0.5*noise(vec2(uv.x*17.0, uv.y*31.0 - uTime*7.0));
      uv += uHaze * (hz - 0.75) * vec2(0.010, 0.005);
      // глитч: горизонтальные срезы
      float tick = floor(uTime*24.0);
      float band = floor(uv.y*36.0 + hash(vec2(tick,1.0))*10.0);
      float r = hash(vec2(band, tick));
      uv.x += uSlice * step(0.72, r) * (r - 0.86) * 0.35;
      // RGB-сдвиг
      vec2 off = vec2(uRgb*0.014, uRgb*0.003);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;
      float alpha = texture2D(tDiffuse, uv).a;
      // scanlines
      float sl = 0.5 + 0.5*sin(vUv.y*uRes.y*1.15);
      col *= 1.0 - uScan*0.45*sl;
      col += uScan * 0.04 * step(0.985, hash(vec2(floor(vUv.y*uRes.y*0.5), tick)));
      // виньетка
      vec2 d = (vUv - 0.5) * vec2(1.0, 0.8);
      col *= mix(1.0, smoothstep(0.95, 0.25, length(d)*1.25), uVig);
      // зерно
      col += (1.0 - uTransp) * (hash(vUv*vec2(1013.0, 1931.0) + fract(uTime)*17.0) - 0.5) * 0.025;
      col = mix(col, uFlashColor, clamp(uFlash,0.0,1.0));
      // прозрачный режим: премультиплицированный вывод, свечение ложится поверх HTML-фона
      float lum = max(col.r, max(col.g, col.b));
      float outA = mix(1.0, clamp(max(lum * 1.15, uFlash), 0.0, 1.0), uTransp);
      gl_FragColor = vec4(col, outA);
    }
  `,
};

const Backdrop: React.FC<{tint: string; grid: number}> = ({tint, grid}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {uTint: {value: new THREE.Color(tint)}, uGrid: {value: grid}},
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uTint; uniform float uGrid; varying vec3 vDir;
          void main(){
            vec3 base = vec3(0.0058,0.0062,0.0075);
            float h = vDir.y;
            vec3 col = base + uTint * 0.012 * smoothstep(-0.6, 0.4, h) * (1.0 - smoothstep(0.2, 0.9, h));
            // тонкая техно-сетка
            vec2 g = abs(fract(vec2(atan(vDir.z, vDir.x)*12.0, h*14.0)) - 0.5);
            float line = 1.0 - smoothstep(0.0, 0.02, min(g.x, g.y));
            col += uTint * line * 0.05 * uGrid * smoothstep(0.7, -0.2, abs(h));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  );
  mat.uniforms.uTint.value.set(tint);
  mat.uniforms.uGrid.value = grid;
  return (
    <mesh material={mat} renderOrder={-10}>
      <sphereGeometry args={[60, 48, 24]} />
    </mesh>
  );
};

/** Перспективная сетка-пол (голографическая сцена). */
const Floor: React.FC<{tint: string; amount: number}> = ({tint, amount}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {uTint: {value: new THREE.Color()}, uAmt: {value: 1}},
        vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTint; uniform float uAmt; varying vec3 vW;
          void main(){
            vec2 g = abs(fract(vW.xz * 2.0) - 0.5);
            vec2 w = fwidth(vW.xz * 2.0);
            float line = 1.0 - min(min(g.x / w.x, g.y / w.y) * 0.8, 1.0);
            vec2 g2 = abs(fract(vW.xz * 0.5) - 0.5);
            vec2 w2 = fwidth(vW.xz * 0.5);
            float major = 1.0 - min(min(g2.x / w2.x, g2.y / w2.y) * 0.6, 1.0);
            float fade = 1.0 - smoothstep(1.5, 9.0, length(vW.xz));
            float a = (line * 0.18 + major * 0.35) * fade * uAmt;
            gl_FragColor = vec4(uTint * 1.4, a);
          }
        `,
      }),
    [],
  );
  mat.uniforms.uTint.value.set(tint);
  mat.uniforms.uAmt.value = amount;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]} material={mat} renderOrder={-5}>
      <planeGeometry args={[30, 30]} />
    </mesh>
  );
};

const Rig: React.FC<{camera: CameraState; fx: FxState; light: LightState; transparent: boolean}> = ({camera, fx, light, transparent}) => {
  const {gl, scene, size, camera: cam} = useThree();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const state = useRef({camera, fx, t});
  state.current = {camera, fx, t};

  // окружение для отражений металла
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.background = transparent ? null : new THREE.Color(COLORS.bg);
    if (transparent) gl.setClearColor(0x000000, 0);
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, transparent]);
  scene.environmentIntensity = light.env ?? 0.35;

  const {composer, bloom, fxPass} = useMemo(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    const rt = new THREE.WebGLRenderTarget(size.width, size.height, {type: THREE.HalfFloatType, samples: 4});
    const c = new EffectComposer(gl, rt);
    c.setPixelRatio(1);
    c.setSize(size.width, size.height);
    c.addPass(new RenderPass(scene, cam));
    const b = new UnrealBloomPass(new THREE.Vector2(size.width / 2, size.height / 2), 0.7, 0.55, 0.82);
    c.addPass(b);
    c.addPass(new OutputPass());
    const f = new ShaderPass(FxShader);
    c.addPass(f);
    return {composer: c, bloom: b, fxPass: f};
  }, [gl, scene, cam, size.width, size.height]);

  useFrame(() => {
    const {camera: c, t: time} = state.current;
    const p = cam as THREE.PerspectiveCamera;
    const s = c.shake ?? 0;
    const sx = shakeNoise(time, 1) * s;
    const sy = shakeNoise(time, 2) * s;
    const sz = shakeNoise(time, 3) * s;
    p.position.set(c.pos[0] + sx, c.pos[1] + sy, c.pos[2] + sz);
    p.up.set(Math.sin(c.roll ?? 0), Math.cos(c.roll ?? 0), 0);
    p.lookAt(c.target[0] + sx * 0.5, c.target[1] + sy * 0.5, c.target[2]);
    p.fov = c.fov ?? 40;
    p.near = 0.01;
    p.far = 200;
    p.updateProjectionMatrix();
  }, 0);

  useFrame(() => {
    const {fx: f, t: time} = state.current;
    bloom.strength = f.bloom ?? 0.7;
    const u = fxPass.uniforms;
    u.uTime.value = time;
    u.uRgb.value = f.rgb ?? 0;
    u.uScan.value = f.scan ?? 0;
    u.uSlice.value = f.slice ?? 0;
    u.uHaze.value = f.haze ?? 0;
    u.uFlash.value = f.flash ?? 0;
    u.uFlashColor.value.set(f.flashColor ?? '#ffffff');
    u.uVig.value = transparent ? 0 : f.vignette ?? 0.6;
    u.uTransp.value = transparent ? 1 : 0;
    composer.render();
  }, 1);

  return (
    <>
      <ambientLight intensity={light.ambient ?? 0.25} />
      <directionalLight position={[-6, 5, 4]} intensity={light.key ?? 2.6} color="#e8f1ff" />
      <directionalLight position={[6, 2.5, -3]} intensity={light.rim ?? 3.5} color={light.rimColor ?? '#ffffff'} />
      <directionalLight position={[0, 6, 6]} intensity={0.6} color="#ffffff" />
    </>
  );
};

export const Stage: React.FC<{
  /** яркость сетки-пола 0..1 */
  camera: CameraState;
  fx?: FxState;
  light?: LightState;
  tint?: string;
  grid?: number;
  /** прозрачный холст поверх HTML-фона */
  transparent?: boolean;
  children: React.ReactNode;
}> = ({camera, fx = {}, light = {}, tint = '#2F6BFF', grid = 1, transparent = false, children}) => {
  const {width, height} = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={1}
      gl={{antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'}}
      camera={{fov: camera.fov ?? 40, position: camera.pos, near: 0.01, far: 200}}
      style={{position: 'absolute', inset: 0}}
    >
      <Rig camera={camera} fx={fx} light={light} transparent={transparent} />
      {!transparent && <Backdrop tint={tint} grid={0} />}
      {!transparent && <Floor tint={tint} amount={grid} />}
      {children}
    </ThreeCanvas>
  );
};
