import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

for (const [fam, file, opt] of [['Montserrat', 'Montserrat-500.ttf', { weight: '500' }], ['Montserrat', 'Montserrat-300.ttf', { weight: '300' }], ['Cormorant Garamond', 'CormorantGaramond-600.ttf', { weight: '600', style: 'italic' }]]) {
  const f = new FontFace(fam, `url(fonts/${file})`, opt); await f.load(); document.fonts.add(f);
}
const W = 1080, H = 1920;
const TL = window.TL;

// ---------- utils ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const eOutC = k => 1 - Math.pow(1 - clamp(k), 3);
const eInOut = k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const eOutBack = k => { k = clamp(k); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// word-time lookup: global time of n-th occurrence of token in a scene
function wt(scene, tok, occ = 0, edge = 's') {
  const ws = TL.words.filter(w => w.scene === scene && w.t === tok);
  const w = ws[Math.min(occ, ws.length - 1)];
  return w ? w[edge] : 0;
}
const SEG = TL.segments;
const B = SEG.map((s, i) => i === 0 ? 0 : s.start - 0.25);
B.push(TL.total);

// ---------- renderer ----------
const glCanvas = document.createElement('canvas');
glCanvas.width = W; glCanvas.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const out = document.createElement('canvas');
out.width = W; out.height = H;
document.body.appendChild(out);
out.style.width = '270px';
const ctx = out.getContext('2d');

// ---------- materials ----------
const phys = (o) => new THREE.MeshPhysicalMaterial(Object.assign({ envMapIntensity: 0.55 }, o));
const MAT = {
  gold: phys({ color: 0xffb53c, metalness: 1, roughness: 0.24, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.9 }),
  goldDeep: phys({ color: 0xe8952a, metalness: 1, roughness: 0.3, clearcoat: 0.5, envMapIntensity: 0.9 }),
  navy: phys({ color: 0x1e3fa8, metalness: 0.05, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }),
  navyDark: phys({ color: 0x101c45, metalness: 0.05, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.15 }),
  cream: phys({ color: 0xffdcae, roughness: 0.36, clearcoat: 0.9, clearcoatRoughness: 0.2, sheen: 0.4, sheenColor: new THREE.Color(0xffc890) }),
  white: phys({ color: 0xf2ede4, roughness: 0.34, clearcoat: 0.9, clearcoatRoughness: 0.18 }),
  orange: phys({ color: 0xff6f1a, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }),
  dark: phys({ color: 0x0c0f18, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }),
  silver: phys({ color: 0xd8dce6, metalness: 1, roughness: 0.22, envMapIntensity: 0.9 }),
  red: phys({ color: 0xff3b30, roughness: 0.3, clearcoat: 1 }),
};

function canvasTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { c, g: c.getContext('2d'), tex };
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function goldGrad(g, y0, y1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, '#fff3cf'); gr.addColorStop(0.45, '#ffc964'); gr.addColorStop(1, '#d98a2b');
  return gr;
}
function glowSprite(color, size, opacity = 1) {
  const { c, g, tex } = canvasTex(256, 256);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); tex.needsUpdate = true;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity }));
  s.scale.set(size, size, 1); return s;
}

function baseScene() {
  const scene = new THREE.Scene();
  scene.environment = envTex;
  scene.add(new THREE.HemisphereLight(0x2a3f86, 0x120a06, 0.7));
  const key = new THREE.DirectionalLight(0xffa660, 3.4); key.position.set(-4, 5, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffd6ad, 0.55); fill.position.set(4, 0.5, 6); scene.add(fill);
  const rim1 = new THREE.DirectionalLight(0x4d7dff, 5.5); rim1.position.set(5, 3, -5); scene.add(rim1);
  const rim2 = new THREE.DirectionalLight(0x2f5cff, 3.5); rim2.position.set(-5, 2, -4); scene.add(rim2);
  const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
  camera.zoom = 0.69; camera.setViewOffset(W, H, 0, H * 0.075, W, H); camera.updateProjectionMatrix();
  return { scene, camera, key, rim1 };
}

// ---------- shared geometry ----------
const coinGeo = (() => {
  const p = [[0, -0.05], [0.4, -0.05], [0.45, -0.035], [0.46, 0], [0.45, 0.035], [0.4, 0.05], [0.37, 0.05], [0.35, 0.035], [0, 0.035]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(p, 36);
})();

function makeGamepad(mat = MAT.navy) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.75, 0.42, 6, 0.2), mat); g.add(body);
  for (const s of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.45, 12, 24), mat);
    grip.position.set(s * 0.62, -0.38, 0); grip.rotation.z = s * 0.45; g.add(grip);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.14, 32), MAT.dark);
    stick.rotation.x = Math.PI / 2; stick.position.set(s * 0.28, -0.12, 0.25); g.add(stick);
  }
  const dp = new THREE.Group();
  dp.add(new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.1, 0.08, 3, 0.03), MAT.dark));
  dp.add(new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.32, 0.08, 3, 0.03), MAT.dark));
  dp.position.set(-0.55, 0.1, 0.22); g.add(dp);
  const cols = [MAT.orange, MAT.cream, MAT.white, MAT.orange];
  [[0, 0.11], [0.11, 0], [0, -0.11], [-0.11, 0]].forEach(([x, y], i) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), cols[i]);
    b.position.set(0.57 + x, 0.1 + y, 0.22); g.add(b);
  });
  const bar = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.05, 0.04, 2, 0.02), new THREE.MeshBasicMaterial({ color: 0xff9a3c, toneMapped: false }));
  bar.position.set(0, 0.3, 0.21); g.add(bar);
  return g;
}

// ============ SCENE 1: coins + counter ============
function scene1() {
  const S = baseScene(); const { scene, camera } = S;
  const root = new THREE.Group(); scene.add(root);
  const r = rng(11);
  const N = 170;
  const heap = new THREE.InstancedMesh(coinGeo, MAT.gold, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const R = 1.45, HH = 1.0, baseY = -1.55;
  const heightAt = (x, z) => baseY + HH * Math.max(0, 1 - (x * x + z * z) / (R * R));
  for (let i = 0; i < N; i++) {
    const rad = R * Math.sqrt(0.25 + 0.75 * r()) * 1.02, th = r() * Math.PI * 2;
    const x = rad * Math.cos(th), z = rad * Math.sin(th) * 0.8;
    const y = heightAt(x, z) - r() * 0.25;
    e.set((r() - 0.5) * 1.1, r() * 6, (r() - 0.5) * 1.1);
    q.setFromEuler(e); m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
    heap.setMatrixAt(i, m);
  }
  root.add(heap);
  // stacks
  const stacks = [[-1.2, -0.3, 11], [1.25, -0.1, 8], [-0.65, 0.75, 6], [0.85, 0.7, 13]];
  for (const [x, z, n] of stacks) {
    for (let k = 0; k < n; k++) {
      const c = new THREE.Mesh(coinGeo, MAT.gold);
      c.position.set(x + (r() - 0.5) * 0.04, baseY + 0.05 + k * 0.1, z + (r() - 0.5) * 0.04);
      c.rotation.y = r() * 6; root.add(c);
    }
  }
  // falling coins
  const falling = [];
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Mesh(coinGeo, MAT.gold);
    const x = (r() - 0.5) * 1.6, z = (r() - 0.5) * 1.0;
    falling.push({ c, x, z, land: heightAt(x, z) + 0.05, t0: 0.1 + i * 0.42 + r() * 0.2, spin: 4 + r() * 6, tilt: (r() - 0.5) * 0.8 });
    root.add(c);
  }
  // counter panel
  const panel = new THREE.Group();
  panel.add(new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.95, 0.24, 6, 0.14), MAT.navyDark));
  const ct = canvasTex(1536, 432);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.844), new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true, toneMapped: false }));
  face.position.z = 0.125; panel.add(face);
  panel.position.set(0, 1.45, 0.3); scene.add(panel);
  const halo = glowSprite('rgba(255,150,60,0.55)', 6); halo.position.set(0, -0.6, -1.5); scene.add(halo);

  const tStart = 0.35, tEnd = wt(1, 'Финал', 0, 'e');
  let lastTxt = '';
  function drawCounter(v) {
    const txt = '$' + fmt(v);
    if (txt === lastTxt) return; lastTxt = txt;
    const g = ct.g; g.clearRect(0, 0, 1536, 432);
    g.font = '500 150px Montserrat'; g.textBaseline = 'middle';
    const chars = [...txt]; const adv = c => c === ' ' ? 40 : (c === '$' ? 100 : 96);
    let wsum = chars.reduce((a, c) => a + adv(c), 0); let x = 768 - wsum / 2;
    g.shadowColor = 'rgba(255,160,60,0.9)'; g.shadowBlur = 30;
    g.fillStyle = goldGrad(g, 140, 300);
    for (const c of chars) { g.textAlign = 'center'; g.fillText(c, x + adv(c) / 2, 222); x += adv(c); }
    ct.tex.needsUpdate = true;
  }
  return {
    ...S, update(t, lt) {
      const k = eOutC(clamp((t - tStart) / (tEnd - tStart)));
      drawCounter(3790000000 * (k > 0.9995 ? 1 : k));
      panel.position.y = 1.45 + Math.sin(lt * 1.3) * 0.04;
      panel.rotation.x = -0.06; panel.rotation.y = Math.sin(lt * 0.5) * 0.08;
      const pop = t >= tEnd ? 1 + 0.06 * Math.exp(-(t - tEnd) * 6) * Math.sin((t - tEnd) * 30) : 1;
      panel.scale.setScalar(eOutBack(clamp((lt + 0.2) / 0.6)) * pop);
      root.rotation.y = -0.4 + lt * 0.07;
      for (const f of falling) {
        const p = clamp((lt - f.t0) / 0.75);
        const y = lerp(0.95, f.land, p * p);
        f.c.position.set(f.x, p >= 1 ? f.land + Math.abs(Math.sin((lt - f.t0 - 0.75) * 14)) * 0.12 * Math.exp(-(lt - f.t0 - 0.75) * 7) : y, f.z);
        f.c.rotation.set(f.tilt + (1 - p) * f.spin, 0, (1 - p) * f.spin * 0.6);
        f.c.visible = lt > f.t0; f.c.scale.setScalar(smooth(0, 0.25, p));
      }
      const d = lerp(8.6, 7.3, eInOut(lt / 5.5));
      const a = 0.18 + Math.sin(lt * 0.4) * 0.05;
      camera.position.set(Math.sin(a) * d * 0.3, 1.2 - lt * 0.05, d);
      camera.lookAt(0, -0.2, 0);
    }
  };
}

// ============ SCENE 2: calendar + gamepad ============
function calFace(day, sub) {
  const ct = canvasTex(800, 680); const g = ct.g;
  g.fillStyle = '#f4efe6'; g.fillRect(0, 0, 800, 680);
  g.fillStyle = '#152a6e'; g.font = '500 400px Montserrat'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillText(day, 400, 450);
  g.fillStyle = '#e5641c'; g.font = '500 54px Montserrat'; g.letterSpacing = '14px';
  g.fillText(sub, 407, 590); ct.tex.needsUpdate = true; return ct.tex;
}
function scene2() {
  const S = baseScene(); const { scene, camera } = S;
  const cal = new THREE.Group(); scene.add(cal);
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.3, 2.55, 0.4, 6, 0.16), MAT.white); cal.add(body);
  const band = new THREE.Mesh(new RoundedBoxGeometry(2.36, 0.7, 0.46, 6, 0.16), MAT.orange); band.position.y = 1.0; cal.add(band);
  const bt = canvasTex(1024, 256); bt.g.fillStyle = '#fff6ea'; bt.g.font = '500 120px Montserrat'; bt.g.letterSpacing = '36px';
  bt.g.textAlign = 'center'; bt.g.textBaseline = 'middle'; bt.g.fillText('ҚАРАША', 530, 136); bt.tex.needsUpdate = true;
  const bandFace = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), new THREE.MeshBasicMaterial({ map: bt.tex, transparent: true, toneMapped: false }));
  bandFace.position.set(0, 1.0, 0.235); cal.add(bandFace);
  for (const s of [-0.6, 0.6]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 16, 48), MAT.silver);
    ring.position.set(s, 1.38, 0); ring.rotation.y = Math.PI / 2; cal.add(ring);
  }
  const f19 = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.785), new THREE.MeshStandardMaterial({ map: calFace('19', 'БЕЙСЕНБІ'), roughness: 0.6 }));
  f19.position.set(0, -0.3, 0.205); cal.add(f19);
  const pivot = new THREE.Group(); pivot.position.set(0, 0.6, 0.21); cal.add(pivot);
  const f18 = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.785), new THREE.MeshStandardMaterial({ map: calFace('18', 'СӘРСЕНБІ'), roughness: 0.6, side: THREE.DoubleSide, transparent: true }));
  f18.position.set(0, -0.9, 0.003); pivot.add(f18);
  const pad = makeGamepad(); pad.scale.setScalar(0.72); scene.add(pad);
  const coins = [];
  for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(coinGeo, MAT.gold); c.scale.setScalar(0.7); scene.add(c); coins.push(c); }
  const halo = glowSprite('rgba(255,140,50,0.5)', 6.5); halo.position.set(0, 0, -2); scene.add(halo);
  const t19 = wt(2, '19'), tAcc = wt(2, '3'), sceneStart = B[1];
  return {
    ...S, update(t, lt) {
      const fp = eInOut((t - t19 + 0.05) / 0.55);
      pivot.rotation.x = -fp * Math.PI * 0.95; f18.material.opacity = 1 - smooth(0.7, 1, fp);
      f18.visible = fp < 1;
      cal.position.set(-0.25, 0.25 + Math.sin(lt * 1.1) * 0.05, 0);
      cal.rotation.set(-0.05, 0.28 + Math.sin(lt * 0.45) * 0.1, 0.02);
      pad.position.set(0.95, -1.35 + Math.sin(lt * 1.4 + 1) * 0.07, 1.0);
      pad.rotation.set(0.55, -0.5 + Math.sin(lt * 0.6) * 0.1, 0.18);
      coins.forEach((c, i) => {
        const k = eOutBack((t - tAcc - i * 0.08) / 0.5); c.visible = k > 0.01;
        const a = lt * 0.9 + i * (Math.PI * 2 / 5);
        c.position.set(Math.cos(a) * 1.75 - 0.2, 0.3 + Math.sin(a * 1.3) * 0.6, Math.sin(a) * 1.1);
        c.rotation.set(1.2 + a, a * 0.7, 0); c.scale.setScalar(0.62 * Math.max(0, k));
      });
      const d = lerp(8.4, 7.2, eInOut(lt / 8.5));
      camera.position.set(0.5, 0.7, d); camera.lookAt(0, -0.1, 0);
    }
  };
}

// ============ SCENE 3: podium + trophy + icons ============
function scene3() {
  const S = baseScene(); const { scene, camera } = S;
  const root = new THREE.Group(); scene.add(root);
  const p1 = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, 0.5, 64), MAT.navy); p1.position.y = -1.75; root.add(p1);
  const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.45, 64), MAT.navy); p2.position.y = -1.28; root.add(p2);
  for (const [r, y] of [[1.27, -1.5], [0.97, -1.05]]) {
    const tr = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 12, 96), MAT.gold); tr.rotation.x = Math.PI / 2; tr.position.y = y; root.add(tr);
  }
  const trophy = new THREE.Group(); trophy.position.y = -1.05; root.add(trophy);
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.32, 0.85, 4, 0.08), MAT.navyDark); base.position.y = 0.16; trophy.add(base);
  const prof = [[0, 0.32], [0.32, 0.32], [0.3, 0.38], [0.12, 0.45], [0.09, 0.7], [0.1, 0.85], [0.2, 0.95], [0.55, 1.15], [0.68, 1.5], [0.72, 1.85], [0.76, 1.9], [0.7, 1.9], [0.64, 1.6], [0, 1.6]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  trophy.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 64), MAT.gold));
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.055, 16, 48, Math.PI * 1.15), MAT.gold);
    h.position.set(s * 0.72, 1.48, 0); h.rotation.z = s > 0 ? -Math.PI * 0.6 : Math.PI * 0.55 + Math.PI; trophy.add(h);
  }
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(0.2, 0.09), { depth: 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 }), MAT.orange);
  star.position.set(0, 1.42, 0.62); star.rotation.x = -0.2; trophy.add(star);
  // clapperboard
  const clap = new THREE.Group();
  const st = canvasTex(512, 64); for (let i = 0; i < 12; i++) { st.g.fillStyle = i % 2 ? '#f4efe6' : '#11141d'; st.g.beginPath(); st.g.moveTo(i * 48 - 20, 64); st.g.lineTo(i * 48 + 28, 0); st.g.lineTo(i * 48 + 76, 0); st.g.lineTo(i * 48 + 28, 64); st.g.fill(); } st.tex.needsUpdate = true;
  const stripeMat = new THREE.MeshPhysicalMaterial({ map: st.tex, roughness: 0.35, clearcoat: 1 });
  const cb = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.7, 0.14, 4, 0.05), MAT.dark); clap.add(cb);
  const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.15, 0.145), [MAT.dark, MAT.dark, MAT.dark, MAT.dark, stripeMat, MAT.dark]); band1.position.y = 0.3; clap.add(band1);
  const armP = new THREE.Group(); armP.position.set(-0.47, 0.42, 0); clap.add(armP);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.15, 0.13), [MAT.dark, MAT.dark, MAT.dark, MAT.dark, stripeMat, MAT.dark]); arm.position.x = 0.485; armP.add(arm);
  const lines = canvasTex(256, 160); lines.g.strokeStyle = 'rgba(240,230,215,0.8)'; lines.g.lineWidth = 6; for (const y of [40, 90, 140]) { lines.g.beginPath(); lines.g.moveTo(16, y); lines.g.lineTo(240, y); lines.g.stroke(); } lines.tex.needsUpdate = true;
  const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.42), new THREE.MeshBasicMaterial({ map: lines.tex, transparent: true })); lf.position.set(0, -0.08, 0.072); clap.add(lf);
  root.add(clap);
  // music note
  const note = new THREE.Group();
  for (const x of [0, 0.42]) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), MAT.orange); head.scale.set(1.25, 0.95, 0.8); head.rotation.z = 0.4; head.position.set(x, x * 0.25, 0); note.add(head);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 16), MAT.orange); stem.position.set(x + 0.17, x * 0.25 + 0.42, 0); note.add(stem);
  }
  const beam = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.11, 0.08, 2, 0.03), MAT.orange); beam.position.set(0.38, 0.92, 0); beam.rotation.z = 0.27; note.add(beam);
  root.add(note);
  const sparks = [];
  const r = rng(5);
  for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.07 + r() * 0.05), MAT.gold); s.userData = { a: r() * 6.28, y: r() * 2.2 - 0.6, rad: 1.3 + r() * 0.6, sp: 0.3 + r() * 0.4 }; root.add(s); sparks.push(s); }
  const halo = glowSprite('rgba(255,170,70,0.65)', 5); halo.position.set(0, 0.2, -1.2); scene.add(halo);
  const tAcc = wt(3, 'ең'), tKino = wt(3, 'кино'), tMuz = wt(3, 'музыка');
  return {
    ...S, update(t, lt) {
      trophy.rotation.y = Math.sin(lt * 0.5) * 0.35;
      const pulse = 1 + 0.08 * Math.exp(-Math.max(0, t - tAcc) * 3) * (t > tAcc ? 1 : 0);
      trophy.scale.setScalar(pulse);
      halo.material.opacity = 0.7 + (t > tAcc ? 0.6 * Math.exp(-(t - tAcc) * 1.5) : 0);
      halo.scale.setScalar(5 + (t > tAcc ? 1.5 * Math.exp(-(t - tAcc) * 1.5) : 0));
      const a = lt * 0.45;
      const kc = 1 + 0.25 * Math.exp(-Math.max(0, t - tKino) * 4) * (t > tKino ? 1 : 0);
      const kn = 1 + 0.25 * Math.exp(-Math.max(0, t - tMuz) * 4) * (t > tMuz ? 1 : 0);
      clap.position.set(-1.45 + Math.sin(a) * 0.12, 0.35 + Math.sin(lt * 1.2) * 0.08, 0.3 + Math.cos(a) * 0.4);
      clap.rotation.set(0.1, -0.4 + Math.sin(lt * 0.7) * 0.2, 0.12); clap.scale.setScalar(0.95 * kc);
      armP.rotation.z = 0.35 * Math.max(0, Math.sin(lt * 2.4));
      note.position.set(1.15 + Math.sin(a + 1) * 0.12, 0.75 + Math.sin(lt * 1.4 + 1) * 0.1, 0.2 + Math.cos(a + 1) * 0.4);
      note.rotation.set(0, Math.sin(lt * 0.8) * 0.4, -0.15); note.scale.setScalar(0.95 * kn);
      for (const s of sparks) { const u = s.userData; const aa = u.a + lt * u.sp; s.position.set(Math.cos(aa) * u.rad, u.y + Math.sin(lt + u.a) * 0.1, Math.sin(aa) * u.rad * 0.7); s.rotation.y = lt * 2 + u.a; }
      const d = lerp(8.8, 7.6, eInOut(lt / 7.5));
      camera.position.set(-0.4 + lt * 0.05, 0.9, d); camera.lookAt(0, -0.55, 0);
    }
  };
}
function starShape(R, r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r : R; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  s.closePath(); return s;
}

// ============ SCENE 4: globe + arcs + loading bar ============
function scene4(opts = {}) {
  const S = baseScene(); const { scene, camera } = S;
  const globe = new THREE.Group(); scene.add(globe);
  const RG = 1.25;
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(RG, 96, 64), phys({ color: 0x0e2b80, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.25, envMapIntensity: 0.18 })));
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x5f8dff, transparent: true, opacity: 0.35, toneMapped: false });
  for (let i = -2; i <= 2; i++) { const la = i * 0.5; const t = new THREE.Mesh(new THREE.TorusGeometry(RG * Math.cos(la) + 0.004, 0.005, 6, 128), lineMat); t.rotation.x = Math.PI / 2; t.position.y = RG * Math.sin(la); globe.add(t); }
  for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(RG + 0.004, 0.005, 6, 128), lineMat); t.rotation.y = i * Math.PI / 6; globe.add(t); }
  // land dots
  const r = rng(21);
  const blobs = []; for (let i = 0; i < 9; i++) { const v = new THREE.Vector3(r() - 0.5, (r() - 0.5) * 1.2, r() - 0.5).normalize(); blobs.push([v, 0.25 + r() * 0.35]); }
  const pts = []; const NP = 5200;
  for (let i = 0; i < NP; i++) {
    const y = 1 - (i / (NP - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963;
    const v = new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad);
    let f = 0; for (const [b, s] of blobs) f += Math.exp(-(1 - v.dot(b)) / (s * s) * 1.6);
    if (f > 0.42) pts.push(v.multiplyScalar(RG + 0.008));
  }
  const dotTex = canvasTex(64, 64); { const g = dotTex.g; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); dotTex.tex.needsUpdate = true; }
  const pg = new THREE.BufferGeometry().setFromPoints(pts);
  globe.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.05, map: dotTex.tex, color: 0xffd29a, transparent: true, depthWrite: false, toneMapped: false })));
  // arcs
  const arcs = [];
  const NA = 18;
  for (let i = 0; i < NA; i++) {
    const a = pts[Math.floor(r() * pts.length)].clone().normalize(), b = pts[Math.floor(r() * pts.length)].clone().normalize();
    if (a.distanceTo(b) < 0.6) { i--; continue; }
    const mid = a.clone().add(b).normalize().multiplyScalar(RG * (1.25 + a.distanceTo(b) * 0.28));
    const curve = new THREE.QuadraticBezierCurve3(a.multiplyScalar(RG), mid, b.multiplyScalar(RG));
    const geo = new THREE.TubeGeometry(curve, 80, 0.022, 6, false);
    const col = i % 3 === 0 ? 0x6fa0ff : 0xff9a40;
    const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat); globe.add(mesh);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff0d0, toneMapped: false })); globe.add(head);
    arcs.push({ mesh, geo, curve, head, j: i - 12, t0: i * 0.33, dur: 1.1 + r() * 0.5, total: geo.index.count, burst: i >= 12 });
  }
  const halo = glowSprite('rgba(70,120,255,0.9)', 4.6); halo.position.z = -0.5; globe.add(halo);
  const halo2 = glowSprite('rgba(255,140,50,0.45)', 6.5); halo2.position.set(0.4, -1.2, -2); scene.add(halo2);
  // loading bar
  const bar = new THREE.Group(); scene.add(bar);
  bar.add(new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.62, 0.18, 6, 0.09), MAT.navyDark));
  const lt_ = canvasTex(1248, 288);
  const bf = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.577), new THREE.MeshBasicMaterial({ map: lt_.tex, transparent: true, toneMapped: false })); bf.position.z = 0.095; bar.add(bf);
  let lastP = -1;
  function drawBar(p) {
    const pp = Math.round(p * 1000); if (pp === lastP) return; lastP = pp;
    const g = lt_.g; g.clearRect(0, 0, 1248, 288);
    g.font = '500 64px Montserrat'; g.letterSpacing = '6px'; g.textBaseline = 'middle';
    g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.fillText('200 GB', 60, 92);
    g.fillStyle = goldGrad(g, 60, 125); g.textAlign = 'right'; g.fillText(Math.floor(p * 100) + '%', 1188, 92);
    rrect(g, 60, 170, 1128, 46, 23); g.fillStyle = 'rgba(120,150,255,0.18)'; g.fill();
    if (p > 0.005) { const gr = g.createLinearGradient(60, 0, 1188, 0); gr.addColorStop(0, '#ff6a1a'); gr.addColorStop(1, '#ffd27a'); g.save(); g.shadowColor = 'rgba(255,150,60,0.9)'; g.shadowBlur = 24; rrect(g, 60, 170, Math.max(46, 1128 * p), 46, 23); g.fillStyle = gr; g.fill(); g.restore(); }
    lt_.tex.needsUpdate = true;
  }
  const tAcc = wt(4, 'әлемдік'), tEnd = SEG[3].end;
  return {
    ...S, update(t, lt) {
      globe.rotation.y = -0.6 + lt * 0.12; globe.rotation.x = 0.25;
      globe.position.y = 0.35 + Math.sin(lt * 0.9) * 0.04;
      const boost = opts.cover ? 1 : smooth(tAcc - 0.1, tAcc + 0.6, t);
      for (const a of arcs) {
        const start = a.burst ? (tAcc - B[3]) + a.j * 0.12 : a.t0;
        const x = opts.cover ? 0.85 : ((lt - start) / a.dur);
        const cyc = a.burst ? x : (x % 2.2);
        const grow = clamp(cyc), fade = a.burst ? 1 - smooth(2.5, 3.5, cyc) : 1 - smooth(1.4, 2.1, cyc);
        const vis = opts.cover ? true : lt >= start;
        a.mesh.visible = vis && grow > 0;
        a.geo.setDrawRange(0, Math.floor(a.total * grow / 6 / 6) * 36);
        a.mesh.material.opacity = 0.95 * fade * (a.burst ? 1 : 0.7 + 0.3 * boost);
        a.head.visible = a.mesh.visible && grow < 1;
        a.head.position.copy(a.curve.getPoint(grow));
      }
      halo.material.opacity = 0.75 + boost * 0.35;
      const p = opts.cover ? 0.97 : eInOut(clamp((t - B[3] - 0.3) / (tEnd - B[3] - 0.5)));
      drawBar(p);
      bar.position.set(0, -1.55 + Math.sin(lt * 1.1 + 2) * 0.03, 0.6);
      bar.rotation.set(-0.12, Math.sin(lt * 0.5) * 0.06, 0); bar.visible = !opts.cover;
      const d = opts.cover ? 7.6 : lerp(8.6, 7.4, eInOut(lt / 8.5));
      camera.position.set(0.2, 0.5, d); camera.lookAt(0, -0.05, 0);
    }
  };
}

// ============ SCENE 5: phone stream + bars ============
function scene5() {
  const S = baseScene(); const { scene, camera } = S;
  const phone = new THREE.Group(); scene.add(phone);
  phone.add(new THREE.Mesh(new RoundedBoxGeometry(1.55, 3.1, 0.16, 6, 0.2), MAT.dark));
  const scr = canvasTex(560, 1120);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.43, 2.86), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }));
  screen.position.z = 0.082; phone.add(screen);
  const scrGlow = glowSprite('rgba(255,120,60,0.35)', 4.5); scrGlow.position.z = -0.3; phone.add(scrGlow);
  const r = rng(77);
  const chat = Array.from({ length: 40 }, () => ({ w: 120 + r() * 260, c: r() < 0.3 ? '#ffb35c' : '#8fa6ff' }));
  function drawScreen(lt, viewers) {
    const g = scr.g; const w = 560, h = 1120;
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0b0f1c'); bg.addColorStop(1, '#05070d'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // video area
    g.save(); rrect(g, 18, 70, w - 36, 560, 26); g.clip();
    const sky = g.createLinearGradient(0, 70, 0, 630); sky.addColorStop(0, '#1a1f5c'); sky.addColorStop(0.55, '#c2446b'); sky.addColorStop(1, '#ff9a3c'); g.fillStyle = sky; g.fillRect(0, 70, w, 560);
    g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(280, 470 + Math.sin(lt) * 6, 110, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#140c2a';
    for (let i = 0; i < 14; i++) { const bw = 30 + ((i * 37) % 30), bh = 90 + ((i * 53) % 150); g.fillRect(i * 42 - 10 + ((lt * 12) % 42) - 42 + 42, 630 - bh, bw, bh); }
    g.restore();
    // LIVE pill
    rrect(g, 40, 92, 120, 46, 23); g.fillStyle = '#ff3b30'; g.fill();
    g.fillStyle = '#fff'; g.font = '500 26px Montserrat'; g.letterSpacing = '3px'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(lt * 3)); g.beginPath(); g.arc(64, 115, 8, 0, 7); g.fill(); g.globalAlpha = 1;
    g.fillText('LIVE', 80, 116);
    // viewers pill
    const vt = fmt(viewers);
    g.font = '500 30px Montserrat'; g.letterSpacing = '1px'; const vw = g.measureText(vt).width + 86;
    rrect(g, w - 40 - vw, 88, vw, 54, 27); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3.5; const ex = w - 40 - vw + 36, ey = 115;
    g.beginPath(); g.ellipse(ex, ey, 16, 10, 0, 0, 7); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, 5, 0, 7); g.fill();
    g.fillText(vt, ex + 26, 116);
    // big counter
    g.textAlign = 'center'; g.font = '500 30px Montserrat'; g.letterSpacing = '8px'; g.fillStyle = 'rgba(200,210,255,0.7)'; g.fillText('КӨРЕРМЕН', 280, 680);
    g.font = '500 76px Montserrat'; g.letterSpacing = '2px'; g.fillStyle = goldGrad(g, 700, 790); g.save(); g.shadowColor = 'rgba(255,150,60,0.8)'; g.shadowBlur = 20; g.fillText(vt, 280, 748); g.restore();
    // chat
    g.save(); g.beginPath(); g.rect(0, 800, w, 300); g.clip();
    const lp = Math.max(0, lt + 2); const off = (lp * 60) % 52; const base = Math.floor(lp * 60 / 52);
    for (let i = 0; i < 7; i++) { const c = chat[(base + i) % chat.length]; const y = 1070 - i * 52 + off - 52; g.fillStyle = c.c; g.beginPath(); g.arc(52, y, 14, 0, 7); g.fill(); rrect(g, 80, y - 12, c.w, 24, 12); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill(); }
    g.restore();
    scr.tex.needsUpdate = true;
  }
  // bars
  const bars = new THREE.Group(); scene.add(bars);
  const barA = new THREE.Mesh(new RoundedBoxGeometry(0.6, 1, 0.6, 4, 0.08), MAT.navy);
  const barB = new THREE.Mesh(new RoundedBoxGeometry(0.75, 1, 0.75, 4, 0.1), MAT.gold);
  bars.add(barA, barB);
  function label(text, gold, sz = 0.9) {
    const ct = canvasTex(512, 160); const g = ct.g; g.font = '500 92px Montserrat'; g.letterSpacing = '4px'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = gold ? 'rgba(255,150,60,0.8)' : 'rgba(80,120,255,0.7)'; g.shadowBlur = 18; g.fillStyle = gold ? goldGrad(g, 40, 120) : '#eef2ff'; g.fillText(text, 256, 84); ct.tex.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz * 0.3125), new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true, toneMapped: false, depthWrite: false })); return m;
  }
  const lA = label('1,7 МЛН', false, 0.95), lB = label('8 МЛН', true, 1.1), lX = label('×4,5', true, 1.1);
  bars.add(lA, lB, lX);
  const t8 = wt(5, 'миллионға', 0, 'e'), tPrev = wt(5, 'Бұрынғы'), tGta = wt(5, 'GTA'), tAcc = wt(5, 'төрт');
  return {
    ...S, update(t, lt) {
      const v = 8000000 * eOutC(clamp((t - B[4] - 0.2) / (t8 - B[4] - 0.2)));
      drawScreen(lt, v > 7999990 ? 8000000 : v);
      const mv = eInOut((t - tPrev + 0.2) / 1.2);
      phone.position.set(lerp(0, -0.75, mv), 0.25 + Math.sin(lt * 1.1) * 0.04, lerp(0, -0.6, mv));
      phone.rotation.set(-0.05, lerp(-0.15, 0.32, mv) + Math.sin(lt * 0.5) * 0.05, lerp(0.03, 0.06, mv));
      const ka = eOutC((t - tPrev - 0.1) / 0.8), kb = eOutC((t - tGta) / 1.3);
      const hA = 0.5 * Math.max(0.001, ka), hB = 2.35 * Math.max(0.001, kb);
      const by = -1.7;
      bars.position.set(0.3, 0, 0.9); bars.rotation.y = -0.25;
      barA.position.set(-0.05, by + hA / 2, 0.2); barA.scale.set(1, hA, 1); barA.visible = ka > 0.01;
      barB.position.set(0.85, by + hB / 2, -0.1); barB.scale.set(1, hB, 1); barB.visible = kb > 0.01;
      lA.position.set(-0.05, by + hA + 0.25, 0.55); lA.material.opacity = clamp(ka * 2 - 0.6); lA.visible = ka > 0.3;
      lB.position.set(0.85, by + hB + 0.25, 0.3); lB.material.opacity = clamp(kb * 2 - 0.6); lB.visible = kb > 0.3;
      const kx = eOutBack((t - tAcc) / 0.5); lX.visible = kx > 0.01; lX.scale.setScalar(Math.max(0.001, kx)); lX.position.set(-0.05, by + hA + 0.72, 0.6);
      const d = lerp(7.0, 8.4, mv) - lt * 0.03;
      camera.position.set(lerp(0.2, 0.6, mv), 0.6, d); camera.lookAt(lerp(0, 0.2, mv), -0.35, 0);
    }
  };
}

// ============ SCENE 6: night room + bubble ============
function bubbleShape() {
  const s = new THREE.Shape(); const w = 1.6, h = 1.0, r = 0.42;
  s.moveTo(-w / 2 + r, -h / 2); s.lineTo(-0.15, -h / 2); s.lineTo(-0.5, -h / 2 - 0.42); s.lineTo(-0.48, -h / 2);
  s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}
function scene6() {
  const S = baseScene(); const { scene, camera, key } = S;
  key.intensity = 1.6; S.rim1.intensity = 3;
  const room = new THREE.Group(); scene.add(room);
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.06, 96), MAT.navyDark); rug.position.y = -1.6; room.add(rug);
  // person
  const person = new THREE.Group(); person.position.set(-0.15, -1.57, 0.85); room.add(person);
  const pouf = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.42, 48), MAT.orange); pouf.position.y = 0.21; person.add(pouf);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.5, 16, 32), MAT.cream); torso.position.y = 0.88; torso.rotation.x = -0.12; person.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 48, 32), MAT.cream); head.position.set(0, 1.5, -0.05); person.add(head);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.42, 8, 16), MAT.cream); arm.position.set(s * 0.25, 0.95, -0.25); arm.rotation.set(-1.15, 0, s * -0.25); person.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 8, 16), MAT.cream); leg.position.set(s * 0.15, 0.48, -0.32); leg.rotation.x = Math.PI / 2; person.add(leg);
  }
  const pad = makeGamepad(MAT.dark); pad.scale.setScalar(0.24); pad.position.set(0, 0.92, -0.52); pad.rotation.x = -0.9; person.add(pad);
  // TV
  const tv = new THREE.Group(); tv.position.set(0, -0.4, -1.3); room.add(tv);
  tv.add(new THREE.Mesh(new RoundedBoxGeometry(2.2, 1.35, 0.12, 4, 0.06), MAT.dark));
  const tvt = canvasTex(640, 384);
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.06, 1.22), new THREE.MeshBasicMaterial({ map: tvt.tex, toneMapped: false })); tvScreen.position.z = 0.065; tv.add(tvScreen);
  const stand = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.5, 0.6, 4, 0.08), MAT.navy); stand.position.set(0, -1.0, 0); tv.add(stand);
  const clk = canvasTex(256, 96); clk.g.font = '500 64px Montserrat'; clk.g.fillStyle = '#ff9a3c'; clk.g.textAlign = 'center'; clk.g.textBaseline = 'middle'; clk.g.shadowColor = '#ff7a1a'; clk.g.shadowBlur = 16; clk.g.fillText('03:47', 128, 52); clk.tex.needsUpdate = true;
  const clock = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.19), new THREE.MeshBasicMaterial({ map: clk.tex, transparent: true, toneMapped: false })); clock.position.set(0.7, -0.95, 0.305); tv.add(clock);
  const tvLight = new THREE.PointLight(0x8fb0ff, 6, 8, 1.2); tvLight.position.set(0, -0.3, -0.6); room.add(tvLight);
  const tvGlow = glowSprite('rgba(110,150,255,0.6)', 4); tvGlow.position.set(0, -0.4, -1.4); room.add(tvGlow);
  // window + moon
  const win = new THREE.Group(); win.position.set(0.25, 1.35, -2.6); room.add(win);
  const sky = canvasTex(512, 512); { const g = sky.g; const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#0a1440'); gr.addColorStop(1, '#1c2f7a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); const rr = rng(3); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rr() * 0.6})`; g.beginPath(); g.arc(rr() * 512, rr() * 512, rr() * 2.2 + 0.6, 0, 7); g.fill(); } sky.tex.needsUpdate = true; }
  win.add(new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5), new THREE.MeshBasicMaterial({ map: sky.tex, toneMapped: false })));
  const fr = MAT.navy;
  for (const [w, h, x, y] of [[2.1, 0.12, 0, 0.78], [2.1, 0.12, 0, -0.78], [0.12, 1.68, -1.0, 0], [0.12, 1.68, 1.0, 0], [0.06, 1.5, 0, 0], [1.9, 0.06, 0, 0]]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.14, 2, 0.03), fr); b.position.set(x, y, 0.05); win.add(b);
  }
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.26, 48, 32), new THREE.MeshBasicMaterial({ color: 0xfff0c8, toneMapped: false })); moon.position.set(0.48, 0.35, 0.02); win.add(moon);
  const moonGlow = glowSprite('rgba(255,230,170,0.7)', 1.6); moonGlow.position.set(0.48, 0.35, 0.03); win.add(moonGlow);
  // bubble
  const bubble = new THREE.Group(); scene.add(bubble);
  bubble.add(new THREE.Mesh(new THREE.ExtrudeGeometry(bubbleShape(), { depth: 0.28, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 8, curveSegments: 24 }), MAT.cream));
  const dots = [-0.42, 0, 0.42].map(x => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 24), MAT.navyDark); d.position.set(x, 0, 0.42); bubble.add(d); return d; });
  const tAcc = wt(6, 'Пікірге');
  return {
    ...S, update(t, lt) {
      // tv screen
      const g = tvt.g; const gr = g.createLinearGradient(0, 0, 640, 384);
      const h1 = (lt * 20) % 360; gr.addColorStop(0, `hsl(${220 + Math.sin(lt * 0.8) * 20},80%,${45 + Math.sin(lt * 7) * 4}%)`); gr.addColorStop(1, `hsl(${25 + Math.sin(lt * 0.6) * 10},90%,55%)`);
      g.fillStyle = gr; g.fillRect(0, 0, 640, 384);
      g.fillStyle = 'rgba(255,255,255,0.2)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(320 + Math.sin(lt * (0.7 + i * 0.3) + i) * 200, 192 + Math.cos(lt * (0.5 + i * 0.2) + i) * 100, 40 + i * 18, 0, 7); g.fill(); }
      tvt.tex.needsUpdate = true;
      tvLight.intensity = 6 + Math.sin(lt * 9) * 0.8 + Math.sin(lt * 23) * 0.5;
      person.rotation.y = Math.sin(lt * 0.4) * 0.05;
      head.position.y = 1.5 + Math.sin(lt * 1.6) * 0.012;
      const kb = eOutBack((t - tAcc + 0.05) / 0.55);
      bubble.visible = kb > 0.01; bubble.scale.setScalar(0.62 * Math.max(0.001, kb));
      bubble.position.set(0.75, 1.05 + Math.sin(lt * 1.3) * 0.04, 1.6); bubble.rotation.set(0.05, -0.35, 0.04);
      dots.forEach((d, i) => { d.position.y = Math.max(0, Math.sin((t - tAcc) * 6 - i * 0.9)) * 0.12; });
      room.rotation.y = 1.0 - lt * 0.045;
      const d = lerp(8.8, 7.6, eInOut(lt / 9));
      camera.position.set(-0.4, 1.4, d); camera.lookAt(0, -0.5, 0);
    }
  };
}

// ---------- 2D background: bokeh rings ----------
const ringSprites = [];
const rr = rng(99);
for (let i = 0; i < 30; i++) {
  const R = 28 + rr() * 120, lw = 6 + rr() * 12, blur = 3 + rr() * 9, pad = blur * 3 + lw;
  const blue = rr() < 0.5; const a = 0.12 + rr() * 0.26;
  const c = document.createElement('canvas'); c.width = c.height = Math.ceil((R + pad) * 2);
  const g = c.getContext('2d'); g.filter = `blur(${blur}px)`;
  g.strokeStyle = blue ? `rgba(70,120,255,${a})` : `rgba(255,140,55,${a})`; g.lineWidth = lw;
  g.beginPath(); g.arc(c.width / 2, c.height / 2, R, 0, Math.PI * 2); g.stroke();
  g.fillStyle = blue ? `rgba(70,120,255,${a * 0.12})` : `rgba(255,140,55,${a * 0.12})`; g.fill();
  ringSprites.push({ c, x: rr() * W, y: rr() * H, vx: (rr() - 0.5) * 8, vy: -4 - rr() * 8, depth: 0.3 + rr() * 0.7, ph: rr() * 6 });
}
const vign = document.createElement('canvas'); vign.width = W; vign.height = H;
{ const g = vign.getContext('2d'); const gr = g.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.45, H * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.75)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
const grains = [0, 1, 2, 3].map(s => { const c = document.createElement('canvas'); c.width = 540; c.height = 960; const g = c.getContext('2d'); const id = g.createImageData(540, 960); const r = rng(500 + s); for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - 0.5) * 120; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); return c; });

function drawBackground(t, warm = 1) {
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#04060c'); bg.addColorStop(0.5, '#070b18'); bg.addColorStop(1, '#03040a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const gl = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, H * 0.42);
  gl.addColorStop(0, `rgba(255,125,40,${0.2 * warm})`); gl.addColorStop(0.5, `rgba(120,60,30,${0.08 * warm})`); gl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  const gb = ctx.createRadialGradient(W * 0.2, H * 0.85, 0, W * 0.2, H * 0.85, H * 0.5);
  gb.addColorStop(0, 'rgba(40,70,200,0.12)'); gb.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gb; ctx.fillRect(0, 0, W, H);
  for (const s of ringSprites) {
    let x = (s.x + s.vx * t + Math.sin(t * 0.3 + s.ph) * 20) % (W + 300); if (x < -150) x += W + 300;
    let y = (s.y + s.vy * t * s.depth) % (H + 300); if (y < -150) y += H + 300;
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 0.8 + s.ph);
    ctx.drawImage(s.c, x - s.c.width / 2, y - s.c.height / 2);
  }
  ctx.globalAlpha = 1;
}

// ---------- subtitles ----------
const SUB_Y = H * 0.725;
const FN = '500 40px Montserrat', FA = 'italic 600 84px "Cormorant Garamond"';
function drawSubs(t) {
  for (const c of TL.chunks) {
    if (t < c.s - 0.05 || t > c.e + 0.25) continue;
    const outA = 1 - smooth(c.e - 0.05, c.e + 0.2, t);
    // layout
    const items = c.words.map(w => {
      ctx.font = w.a ? FA : FN; ctx.letterSpacing = w.a ? '0px' : '7px';
      const txt = w.a ? w.t : w.t.toUpperCase();
      return { ...w, txt, wd: ctx.measureText(txt).width, sp: w.a ? 22 : 22 };
    });
    const maxW = 940; const lines = [[]]; let lw = 0;
    for (const it of items) { const add = it.wd + (lines.at(-1).length ? it.sp : 0); if (lw + add > maxW && lines.at(-1).length) { lines.push([it]); lw = it.wd; } else { lines.at(-1).push(it); lw += add; } }
    const hasAcc = items.some(i => i.a); const lh = hasAcc ? 92 : 62;
    let y = SUB_Y - (lines.length - 1) * lh / 2;
    for (const line of lines) {
      const tw = line.reduce((a, it, i) => a + it.wd + (i ? it.sp : 0), 0);
      let x = W / 2 - tw / 2;
      for (const it of line) {
        const k = smooth(it.s - 0.06, it.s + 0.16, t);
        const a = k * outA;
        if (a > 0.003) {
          ctx.save(); ctx.globalAlpha = a; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
          ctx.font = it.a ? FA : FN; ctx.letterSpacing = it.a ? '0px' : '7px';
          const dy = (1 - k) * 14; const bl = (1 - k) * 8;
          if (bl > 0.3) ctx.filter = `blur(${bl.toFixed(1)}px)`;
          if (it.a) {
            ctx.shadowColor = 'rgba(255,150,50,0.55)'; ctx.shadowBlur = 26;
            ctx.fillStyle = goldGrad(ctx, y + dy - 62, y + dy + 12);
          } else { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14; ctx.fillStyle = '#ffffff'; }
          ctx.fillText(it.txt, x, y + dy);
          ctx.restore();
        }
        x += it.wd + it.sp;
      }
      y += lh;
    }
  }
}

// ---------- compose ----------
const SCENES = [scene1(), scene2(), scene3(), scene4(), scene5(), scene6()];
const WARM = [1.1, 1, 1.2, 0.7, 0.9, 0.6];
const TR = 0.35;
function drawScene(i, t, alpha, scale, blur) {
  const S = SCENES[i]; S.update(t, t - B[i]);
  renderer.render(S.scene, S.camera);
  ctx.save(); ctx.globalAlpha = alpha;
  if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  ctx.translate(W / 2, H * 0.42); ctx.scale(scale, scale); ctx.translate(-W / 2, -H * 0.42);
  ctx.drawImage(glCanvas, 0, 0); ctx.restore();
}
function grain(t) {
  ctx.save(); ctx.globalAlpha = 0.05; ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(grains[Math.floor(t * 30) % 4], 0, 0, W, H); ctx.restore();
}
window.renderFrame = (t) => {
  let i = 0; while (i < 5 && t >= B[i + 1]) i++;
  const warm = WARM[i];
  drawBackground(t, warm);
  const nb = B[i + 1], pb = B[i];
  if (i < 5 && t > nb - TR) {
    const k = eInOut((t - (nb - TR)) / (2 * TR));
    drawScene(i, t, 1 - k, 1 + 0.14 * k, k * 10);
    drawScene(i + 1, t, k, 0.92 + 0.08 * k, (1 - k) * 10);
  } else if (i > 0 && t < pb + TR) {
    const k = eInOut((t - (pb - TR)) / (2 * TR));
    drawScene(i - 1, t, 1 - k, 1 + 0.14 * k, k * 10);
    drawScene(i, t, k, 0.92 + 0.08 * k, (1 - k) * 10);
  } else drawScene(i, t, 1, 1, 0);
  // global fade in/out
  drawSubs(t);
  ctx.drawImage(vign, 0, 0);
  grain(t);
  const fo = Math.max(1 - smooth(0, 0.35, t), smooth(TL.total - 0.5, TL.total, t));
  if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H); }
  return out.toDataURL('image/jpeg', 0.93);
};
window.renderCover = () => {
  const S = scene4({ cover: true });
  drawBackground(3, 0.9);
  S.update(30, 6); renderer.render(S.scene, S.camera);
  ctx.save(); ctx.translate(W / 2, H * 0.42); ctx.scale(0.95, 0.95); ctx.translate(-W / 2, -H * 0.42 + 40); ctx.drawImage(glCanvas, 0, 0); ctx.restore();
  const yb = H * 0.7;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = 'italic 600 230px "Cormorant Garamond"'; ctx.shadowColor = 'rgba(255,150,50,0.6)'; ctx.shadowBlur = 40;
  ctx.fillStyle = goldGrad(ctx, yb - 170, yb + 20); ctx.fillText('GTA 6', W / 2, yb);
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff';
  ctx.font = '500 74px Montserrat'; ctx.letterSpacing = '16px';
  ctx.fillText('ИНТЕРНЕТТІ', W / 2 + 8, yb + 130); ctx.fillText('СЫНДЫРДЫ', W / 2 + 8, yb + 230);
  ctx.restore();
  ctx.drawImage(vign, 0, 0); grain(1);
  return out.toDataURL('image/jpeg', 0.95);
};
window.READY = true;
