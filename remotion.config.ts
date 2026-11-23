// Конфиг для CLI (npx remotion studio / npx remotion render).
// https://www.remotion.dev/docs/config
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);
// Мягкие blur-фильтры тяжёлые для CPU — ограничиваем параллелизм, чтобы рендер не упирался в память.
Config.setConcurrency(4);
