// Покадровая запись animation.html в видео (бесплатно, всё делается на вашем компьютере).
//
// Запуск:
//   node render_animation.js                      → scenes/scene_02.mp4
//   node render_animation.js --stills 0.5,3.1,4.6 → несколько кадров в build/ для проверки
//
// Нужны Node.js, ffmpeg и Playwright (npm install playwright && npx playwright install chromium).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const HTML = path.join(ROOT, 'animation.html');
const OUT = path.join(ROOT, 'scenes', 'scene_02.mp4');
const FPS = 30;

// «Киношная» доводка: свечение ярких мест, лёгкий контраст, виньетка, плёночное зерно
const POST = 'format=gbrp,split[a][b];' +
  '[b]colorlevels=rimin=0.45:gimin=0.45:bimin=0.45,gblur=sigma=28[g];' +
  '[a][g]blend=all_mode=screen:all_opacity=0.4,eq=contrast=1.04:saturation=1.06,' +
  'vignette=angle=PI/4.5,noise=alls=5:allf=t+u,format=yuv420p';

(async () => {
  const stillsArg = process.argv.indexOf('--stills');
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.log('[ошибка страницы]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('[браузер]', m.text()); });
  await page.goto(pathToFileURL(HTML).href + '?record=1');
  await page.waitForFunction(() => window.READY === true, null, { timeout: 180000 });

  const grab = (t, type) => page.evaluate(([t, type]) => {
    window.renderAt(t);
    return document.querySelector('canvas').toDataURL(type, 0.95);
  }, [t, type]);

  if (stillsArg > -1) {
    const times = process.argv[stillsArg + 1].split(',').map(Number);
    fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
    for (const t of times) {
      const file = path.join(ROOT, 'build', `still_${t}.png`);
      fs.writeFileSync(file, Buffer.from((await grab(t, 'image/png')).split(',')[1], 'base64'));
      console.log('кадр', t, '→', file);
    }
    await browser.close();
    return;
  }

  const duration = await page.evaluate(() => window.CFG.duration);
  const total = Math.round(duration * FPS);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS),
    '-i', '-', '-vf', POST, '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-r', String(FPS), OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const started = Date.now();
  for (let i = 0; i < total; i++) {
    const buf = Buffer.from((await grab(i / FPS, 'image/jpeg')).split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 10 === 0 || i === total - 1) {
      process.stdout.write(`\r  кадр ${i + 1}/${total}  (${((Date.now() - started) / 1000).toFixed(0)} с)`);
    }
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg: код ' + c)))));
  await browser.close();
  console.log(`\n✅ Готово: ${OUT}`);
})().catch(e => { console.error('\n❌', e.message); process.exit(1); });
