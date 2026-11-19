// Montserrat ExtraBold (800). По умолчанию грузится из public/fonts (те же файлы
// Google Fonts, сохранённые локально — рендер не зависит от сети).
// Чтобы брать шрифт напрямую через @remotion/google-fonts:
//   REMOTION_FONT_SOURCE=google npx remotion render ...
import {loadFont} from '@remotion/google-fonts/Montserrat';
import {continueRender, delayRender, staticFile} from 'remotion';

const FAMILY = 'Montserrat';
const RANGES = {
  cyrillic: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
  latin:
    'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
};

const loadLocal = () => {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return;
  const handle = delayRender('Loading local Montserrat 800');
  const faces = (Object.keys(RANGES) as (keyof typeof RANGES)[]).map(
    (k) =>
      new FontFace(FAMILY, `url(${staticFile(`fonts/montserrat-800-${k}.woff2`)}) format('woff2')`, {
        weight: '800',
        style: 'normal',
        unicodeRange: RANGES[k],
      }),
  );
  Promise.all(faces.map((f) => f.load()))
    .then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    })
    .catch((e) => {
      console.error('Montserrat local load failed, fallback to Impact', e);
      continueRender(handle);
    });
};

if (process.env.REMOTION_FONT_SOURCE === 'google') {
  loadFont('normal', {weights: ['800'], subsets: ['cyrillic', 'latin']});
} else {
  loadLocal();
}

export const FONT_NAME = FAMILY;
export const FONT_FAMILY = `${FAMILY}, Impact, 'Arial Black', sans-serif`;
