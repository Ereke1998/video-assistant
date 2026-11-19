// Рендер контрольных стиллов: node scripts/stills.mjs [кадры через запятую]
// По умолчанию: 0,180,600,1100,1500,1800,1919 -> out/stills/fNNNN.png
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frames = (process.argv[2] ?? '0,180,600,1100,1500,1800,1919').split(',').map(Number);
const PW = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browserExecutable = fs.existsSync(PW) ? PW : null;

const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const composition = await selectComposition({serveUrl, id: 'ReelsVideo', browserExecutable, chromiumOptions: {gl: 'angle'}});
fs.mkdirSync(path.join(root, 'out/stills'), {recursive: true});
for (const frame of frames) {
  const output = path.join(root, `out/stills/f${String(frame).padStart(4, '0')}.png`);
  await renderStill({serveUrl, composition, frame, output, browserExecutable, chromiumOptions: {gl: 'angle'}, overwrite: true});
  console.log('still', output);
}
