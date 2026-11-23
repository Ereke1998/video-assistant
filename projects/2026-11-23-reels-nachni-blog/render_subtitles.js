// Рендер анимированных субтитров «кинотитры» в прозрачное видео build/subs_overlay.mov.
// Запускается автоматически из 4_build.py (стиль "kino"), вручную запускать не нужно.
//   node render_subtitles.js                 → build/subs_overlay.mov
//   node render_subtitles.js --stills 2,5.5  → прозрачные кадры build/subs_still_<t>.png (для проверки)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const FPS = 30;
const OUT = path.join(ROOT, 'build', 'subs_overlay.mov');
const FONT_FILES = ['Manrope_600SemiBold.ttf', 'CormorantGaramond_600SemiBold_Italic.ttf', 'CormorantGaramond_700Bold_Italic.ttf'];

(async () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'subtitle_events.json'), 'utf8'));
  const fonts = Object.fromEntries(FONT_FILES.map(f => [f, fs.readFileSync(path.join(ROOT, 'fonts', f)).toString('base64')]));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.addInitScript(([ev, f]) => { window.SUB_EVENTS = ev; window.FONT_DATA = f; }, [data.events, fonts]);
  let failed;
  const pageError = new Promise((_, rej) => { failed = rej; });
  page.on('pageerror', e => failed(new Error('ошибка в subtitles.html: ' + e.message)));
  await page.goto(pathToFileURL(path.join(ROOT, 'subtitles.html')).href + '?record=1');
  await Promise.race([page.waitForFunction(() => window.READY === true, null, { timeout: 60000 }), pageError]);

  const frame = t => page.evaluate(t => (window.renderAt(t) ? document.getElementById('c').toDataURL('image/png') : null), t);
  const stillsAt = process.argv.indexOf('--stills');
  if (stillsAt > -1) {
    for (const t of process.argv[stillsAt + 1].split(',').map(Number)) {
      const url = await frame(t);
      const file = path.join(ROOT, 'build', `subs_still_${t}.png`);
      if (url) fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      console.log('кадр', t, url ? '→ ' + file : '(пусто)');
    }
    await browser.close();
    return;
  }

  const blank = Buffer.from((await page.evaluate(() => { window.renderAt(-100); return document.getElementById('c').toDataURL('image/png'); })).split(',')[1], 'base64');
  const total = Math.round(data.total * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png',
    '-i', '-', '-c:v', 'qtrle', '-pix_fmt', 'argb', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < total; i++) {
    const url = await frame(i / FPS);
    const buf = url ? Buffer.from(url.split(',')[1], 'base64') : blank;
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0 || i === total - 1) process.stdout.write(`\r  субтитры: кадр ${i + 1}/${total}`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg: код ' + c)))));
  await browser.close();
  console.log(`\n  → ${OUT}`);
})().catch(e => { console.error('\n❌', e.message); process.exit(1); });
