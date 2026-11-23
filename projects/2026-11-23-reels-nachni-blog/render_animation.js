// Покадровая запись сцен из animation.html в видео (бесплатно, всё делается на вашем компьютере).
//
// Запуск:
//   node render_animation.js --scene 3                    → scenes/scene_03.mp4
//   node render_animation.js --all                        → все сцены 1–6
//   node render_animation.js --scene 3 --stills 0.5,2.3   → проверочные кадры в build/
//
// Время слов берётся из audio/timings.json, длина сцен — из scene_plan.json.
// Поэтому после переозвучки достаточно заново записать сцены.
// Нужны Node.js, ffmpeg и Playwright (npm install playwright && npx playwright install chromium).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const HTML = path.join(ROOT, 'animation.html');
const FPS = 30;

// «Киношная» доводка: свечение ярких мест, лёгкий контраст, виньетка, плёночное зерно
const POST = 'format=gbrp,split[a][b];' +
  '[b]colorlevels=rimin=0.45:gimin=0.45:bimin=0.45,gblur=sigma=28[g];' +
  '[a][g]blend=all_mode=screen:all_opacity=0.4,eq=contrast=1.04:saturation=1.06,' +
  'vignette=angle=PI/4.5,noise=alls=5:allf=t+u,format=yuv420p';

function sceneTiming(id) {
  const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'scene_plan.json'), 'utf8'));
  const timings = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio', 'timings.json'), 'utf8'));
  const sc = plan.scenes.find(s => s.id === id);
  if (!sc) throw new Error(`Сцены ${id} нет в scene_plan.json`);
  const words = timings.phrases.filter(p => sc.phrases.includes(p.id)).flatMap(p => p.words.map(w => ({
    text: w.text, start: +(w.start - sc.start).toFixed(3), end: +(w.end - sc.start).toFixed(3) })));
  return { words, duration: sc.frames / FPS };
}

async function openScene(browser, id) {
  const { words, duration } = sceneTiming(id);
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.addInitScript(([w, d]) => { window.SCENE_WORDS = w; window.SCENE_DURATION = d; }, [words, duration]);
  let failed;
  const pageError = new Promise((_, rej) => { failed = rej; });
  page.on('pageerror', e => failed(new Error('ошибка в animation.html: ' + e.message)));
  page.on('console', m => { if (m.type() === 'error') console.log('[браузер]', m.text()); });
  await page.goto(pathToFileURL(HTML).href + `?record=1&scene=${id}`);
  await Promise.race([page.waitForFunction(() => window.READY === true, null, { timeout: 180000 }), pageError]);
  return page;
}

const grab = (page, t, type) => page.evaluate(([t, type]) => {
  window.renderAt(t);
  return document.querySelector('canvas').toDataURL(type, 0.95);
}, [t, type]);

async function renderStills(browser, id, times) {
  const page = await openScene(browser, id);
  fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
  for (const t of times) {
    const file = path.join(ROOT, 'build', `still_s${id}_${t}.png`);
    fs.writeFileSync(file, Buffer.from((await grab(page, t, 'image/png')).split(',')[1], 'base64'));
    console.log('кадр', t, '→', file);
  }
  await page.close();
}

async function renderVideo(browser, id) {
  const page = await openScene(browser, id);
  const out = path.join(ROOT, 'scenes', `scene_${String(id).padStart(2, '0')}.mp4`);
  const duration = await page.evaluate(() => window.CFG.duration);
  const total = Math.round(duration * FPS);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS),
    '-i', '-', '-vf', POST, '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const started = Date.now();
  console.log(`Сцена ${id}: ${total} кадров`);
  for (let i = 0; i < total; i++) {
    const buf = Buffer.from((await grab(page, i / FPS, 'image/jpeg')).split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 15 === 0 || i === total - 1) {
      process.stdout.write(`\r  кадр ${i + 1}/${total}  (${((Date.now() - started) / 1000).toFixed(0)} с)`);
    }
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg: код ' + c)))));
  await page.close();
  console.log(`\n✅ ${out}`);
}

(async () => {
  const arg = name => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };
  const ids = process.argv.includes('--all') ? [1, 2, 3, 4, 5, 6] : [parseInt(arg('--scene') || '2', 10)];
  const stills = arg('--stills');
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  try {
    for (const id of ids) {
      if (stills) await renderStills(browser, id, stills.split(',').map(Number));
      else await renderVideo(browser, id);
    }
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('\n❌', e.message); process.exit(1); });
