import {continueRender, delayRender, staticFile} from 'remotion';

// Manrope (OFL) из @fontsource, локальные файлы в public/fonts — рендер не зависит от сети.
const CYRILLIC = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

let loaded = false;

export const ensureFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Загрузка шрифта Manrope');
  const faces: FontFace[] = [];
  for (const weight of [300, 600, 800]) {
    for (const [subset, range] of [
      ['cyrillic', CYRILLIC],
      ['latin', LATIN],
    ] as const) {
      faces.push(
        new FontFace('Manrope', `url(${staticFile(`fonts/manrope-${subset}-${weight}-normal.woff2`)}) format('woff2')`, {
          weight: String(weight),
          unicodeRange: range,
        }),
      );
    }
  }
  Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff))))
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error('Не удалось загрузить шрифт', err);
      continueRender(handle);
    });
};
