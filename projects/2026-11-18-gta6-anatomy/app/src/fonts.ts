import {continueRender, delayRender, staticFile} from 'remotion';

const CYR = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
const LAT =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

const faces: [string, string, string, string][] = [
  ['Unbounded', '900', 'unbounded-cyrillic-900-normal', CYR],
  ['Unbounded', '900', 'unbounded-latin-900-normal', LAT],
  ['Unbounded', '600', 'unbounded-cyrillic-600-normal', CYR],
  ['Unbounded', '600', 'unbounded-latin-600-normal', LAT],
  ['Montserrat', '900', 'montserrat-cyrillic-900-normal', CYR],
  ['Montserrat', '900', 'montserrat-latin-900-normal', LAT],
  ['Montserrat', '700', 'montserrat-cyrillic-700-normal', CYR],
  ['Montserrat', '700', 'montserrat-latin-700-normal', LAT],
];

let started = false;
export const loadFonts = () => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('Загрузка шрифтов');
  Promise.all(
    faces.map(([family, weight, file, range]) => {
      const f = new FontFace(family, `url(${staticFile(`fonts/${file}.woff2`)}) format('woff2')`, {
        weight,
        unicodeRange: range,
      });
      return f.load().then((loaded) => document.fonts.add(loaded));
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};
