import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
// Software WebGL in headless Chromium (no GPU in CI/containers)
Config.setChromiumOpenGlRenderer('angle');
Config.setOverwriteOutput(true);
// Готовый headless-Chromium из контейнера (если есть) — без скачивания браузера.
import fs from 'node:fs';
const PW_SHELL = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
if (fs.existsSync(PW_SHELL)) {
  Config.setBrowserExecutable(PW_SHELL);
}
