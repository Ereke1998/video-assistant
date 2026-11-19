// Звуковая партитура: фоновый трек, озвучка, SFX-слоты.
// Каждый SFX-слот — placeholder: положи свой файл по пути `file` (wav/mp3) с тем же именем,
// и он автоматически попадёт в микс. Если файла нет — `npm run sfx:placeholders`
// синтезирует временную заглушку, чтобы пайплайн собирался целиком.
// gainDb — громкость относительно 0 dBFS исходника.

import { SCENES } from './timeline.config.js';
const EXP = SCENES.find((s) => s.id === 'experiment');
const ATTEMPTS = EXP.attempts;

export const MUSIC = {
  file: 'assets/music/bg-track.mp3',   // ← положи свой трек (lo-fi / trap-lite, 100–120 BPM)
  placeholder: 'assets/music/bg-track.placeholder.wav',
  volume: 0.12,          // 12% громкости (ТЗ: 10–15%)
  duckUnderVo: true,     // сайдчейн-дакинг под голос
  fadeIn: 0.3,
  fadeOut: 1.2,
  // Стоп-музыки (music stop) — драматическая тишина на «МИМО» третьей попытки
  stops: [{ at: 24.1, dur: 0.6 }],
};

export const VOICEOVER = {
  provider: 'elevenlabs',
  voiceId: '3EuKHIEZbSzrHGNmdYsx',     // мужской русский голос (в тексте «я взял»)
  model: 'eleven_multilingual_v2',
  settings: { stability: 0.42, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 1.12 },
  maxTempo: 1.3,          // если фраза не влезает в окно сцены — ускоряем не больше чем в 1.3×
  leadIn: 0.08,           // старт голоса после начала сцены, с
  tailGap: 0.12,          // запас до конца сцены, с
  volume: 1.0,
};

// type — ключ генератора заглушек (scripts/make-placeholder-audio.mjs)
export const SFX = [
  // 1. Хук
  { at: 0.00,  id: 'impact-in',      type: 'impact',  file: 'assets/sfx/impact-in.wav',      gainDb: -6,  note: 'резкий вход, удар' },
  { at: 0.10,  id: 'scanner-hum',    type: 'scanner', file: 'assets/sfx/scanner-hum.wav',    gainDb: -16, note: 'гул сканера ладони' },
  { at: 0.15,  id: 'counter-roll-1', type: 'counter', file: 'assets/sfx/counter-roll.wav',   gainDb: -18, dur: 2.2, note: 'тиканье счётчика до 10 000 000' },
  { at: 2.40,  id: 'hit-10m',        type: 'impact',  file: 'assets/sfx/impact-in.wav',      gainDb: -8,  note: 'удар на 10 000 000' },
  { at: 3.80,  id: 'whoosh-1',       type: 'whoosh',  file: 'assets/sfx/whoosh.wav',         gainDb: -14, note: 'переход в сцену 2' },

  // 2. Суть акции — pop на каждую карточку
  { at: 4.15,  id: 'pop-chip',       type: 'pop',     file: 'assets/sfx/pop.wav',            gainDb: -16 },
  { at: 5.20,  id: 'pop-card-1',     type: 'pop',     file: 'assets/sfx/pop.wav',            gainDb: -17 },
  { at: 5.62,  id: 'pop-card-2',     type: 'pop',     file: 'assets/sfx/pop.wav',            gainDb: -17 },
  { at: 6.04,  id: 'pop-card-3',     type: 'pop',     file: 'assets/sfx/pop.wav',            gainDb: -17 },
  { at: 6.46,  id: 'pop-card-4',     type: 'pop',     file: 'assets/sfx/pop.wav',            gainDb: -17 },
  { at: 6.88,  id: 'ding-jackpot',   type: 'ding',    file: 'assets/sfx/ding.wav',           gainDb: -12, note: 'золотая карточка 10 000 000' },
  { at: 11.75, id: 'whoosh-2',       type: 'whoosh',  file: 'assets/sfx/whoosh.wav',         gainDb: -14 },

  // 3. Эксперимент — на каждую попытку: скан → уведомление об оплате → прокрутка → «мимо»
  ...ATTEMPTS.flatMap(({ start: t0 }, i) => [
    { at: t0 + 0.45, id: `scan-${i + 1}`,   type: 'scanner', file: 'assets/sfx/scanner-beep.wav', gainDb: -12, note: 'писк сканера ладони' },
    { at: t0 + 1.50, id: `notify-${i + 1}`, type: 'notify',  file: 'assets/sfx/notify.wav',       gainDb: -12, note: 'уведомление «Оплачено»' },
    { at: t0 + 1.55, id: `roll-${i + 1}`,   type: 'counter', file: 'assets/sfx/counter-roll.wav', gainDb: -19, dur: 1.2 },
    { at: t0 + EXP.anim.stampAt[i], id: `miss-${i + 1}`,   type: 'miss',    file: 'assets/sfx/miss-buzz.wav',    gainDb: -11, note: 'штамп «МИМО»' },
  ]),
  { at: 25.75, id: 'whoosh-3',       type: 'whoosh',  file: 'assets/sfx/whoosh.wav',         gainDb: -14 },

  // 4. Механика
  { at: 26.40, id: 'counter-roll-2', type: 'counter', file: 'assets/sfx/counter-roll.wav',   gainDb: -18, dur: 2.2 },
  { at: 28.60, id: 'cash-hit',       type: 'cash',    file: 'assets/sfx/cash.wav',           gainDb: -10, note: 'круглый номер, +1 000 Б' },
  { at: 29.40, id: 'pop-chip-1',     type: 'pop',     file: 'assets/sfx/pop.wav',            gainDb: -18 },
  { at: 29.68, id: 'pop-chip-2',     type: 'pop',     file: 'assets/sfx/pop.wav',            gainDb: -18 },
  { at: 29.96, id: 'pop-chip-3',     type: 'pop',     file: 'assets/sfx/pop.wav',            gainDb: -18 },
  { at: 30.24, id: 'pop-chip-4',     type: 'pop',     file: 'assets/sfx/pop.wav',            gainDb: -18 },
  { at: 32.40, id: 'riser',          type: 'riser',   file: 'assets/sfx/riser.wav',          gainDb: -16, dur: 1.6, note: 'заканчивается ровно в 34.00' },

  // 5. Финал
  { at: 34.00, id: 'impact-final',   type: 'impact',  file: 'assets/sfx/impact-in.wav',      gainDb: -9 },
  { at: 36.60, id: 'pop-headline',   type: 'pop',     file: 'assets/sfx/pop.wav',            gainDb: -15 },
  { at: 37.40, id: 'notify-cta',     type: 'notify',  file: 'assets/sfx/notify.wav',         gainDb: -13, note: 'плашка «Пиши в комментариях»' },
];
