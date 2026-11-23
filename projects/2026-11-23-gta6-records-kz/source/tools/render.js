// usage: node render.js frames <outdir> t1 t2 ... | node render.js video <out.mp4> fromFrame toFrame | node render.js cover <out.jpg>
const { chromium } = require('playwright');
const fs = require('fs'); const { spawn } = require('child_process');
(async () => {
  const [mode, out, ...rest] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('PAGE', m.text()); });
  page.on('pageerror', e => console.error('PAGEERR', e.message));
  await page.goto('http://127.0.0.1:8123/index.html');
  await page.waitForFunction('window.READY === true', null, { timeout: 120000 });
  const dec = s => Buffer.from(s.split(',')[1], 'base64');
  if (mode === 'frames') {
    fs.mkdirSync(out, { recursive: true });
    for (const t of rest) { const t0 = Date.now(); const d = await page.evaluate(t => window.renderFrame(t), +t); fs.writeFileSync(`${out}/t${(+t).toFixed(2)}.jpg`, dec(d)); console.log('t', t, Date.now() - t0, 'ms'); }
  } else if (mode === 'cover') {
    fs.writeFileSync(out, dec(await page.evaluate(() => window.renderCover())));
  } else if (mode === 'video') {
    const [f0, f1] = rest.map(Number);
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const T = Date.now();
    for (let f = f0; f < f1; f++) {
      const d = await page.evaluate(t => window.renderFrame(t), f / 30);
      if (!ff.stdin.write(dec(d))) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 30 === 0) console.log(out, f, ((Date.now() - T) / (f - f0 + 1)).toFixed(0), 'ms/f');
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
