// Звуковая партитура: фоновый трек, озвучка, SFX-слоты.
// Каждый SFX-слот — placeholder: положи свой файл по пути `file` (wav/mp3) с тем же именем,
// и он автоматически попадёт в микс. Если файла нет — `npm run sfx:placeholders`
// синтезирует временную заглушку, чтобы пайплайн собирался целиком.
// gainDb — громкость относительно 0 dBFS исходника.

import { SCENES } from './timeline.config.js';
const S = Object.fromEntries(SCENES.map((s) => [s.id, s]));
const at = (id, t) => +(S[id].start + t).toFixed(2);

export const MUSIC = {
  file: 'assets/music/bg-track.mp3',   // ← положи свой трек (tech / lo-fi house, 105–120 BPM)
  placeholder: 'assets/music/bg-track.placeholder.wav',
  volume: 0.12,          // 12% громкости (10–15%)
  duckUnderVo: true,     // сайдчейн-дакинг под голос
  fadeIn: 0.3,
  fadeOut: 1.2,
  // Стоп-музыки — пауза перед «ВИДЕОМОНТАЖОМ!», чтобы слэм ударил в тишину
  stops: [{ at: at('twist', 2.9), dur: 0.4 }],
};

export const VOICEOVER = {
  provider: 'elevenlabs',
  voiceId: '3EuKHIEZbSzrHGNmdYsx',     // тот же мужской русский голос, что и в прошлом ролике
  model: 'eleven_multilingual_v2',
  settings: { stability: 0.42, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 1.12 },
  maxTempo: 1.3,
  leadIn: 0.08,
  tailGap: 0.12,
  volume: 1.0,
};

const sfx = (t, id, type, file, gainDb, extra = {}) => ({ at: t, id, type, file: `assets/sfx/${file}`, gainDb, ...extra });

// type — ключ генератора заглушек (scripts/make-placeholder-audio.mjs)
export const SFX = [
  // 1. Хук — удар на каждое «Клод», прокрутка ленты
  sfx(0.00, 'impact-in', 'impact', 'impact-in.wav', -6, { note: 'резкий вход' }),
  ...S.hook.anim.slams.map((t, i) => sfx(+(t + 0.0).toFixed(2), `slam-${i + 1}`, 'glitch', 'glitch.wav', -12 + i, { note: `«CLAUDE» №${i + 1}` })),
  sfx(2.40, 'scroll', 'whoosh', 'whoosh.wav', -20, { note: 'лента уезжает' }),
  sfx(at('hook', S.hook.anim.line1At), 'pop-line1', 'pop', 'pop.wav', -15),
  sfx(at('hook', S.hook.anim.line2At), 'hit-line2', 'impact', 'impact-in.wav', -10, { note: 'плашка «ПРО CLAUDE?»' }),
  sfx(4.80, 'whoosh-1', 'whoosh', 'whoosh.wav', -14),

  // 2. Что это / почему
  sfx(at('intro', 0.35), 'ding-title', 'ding', 'ding.wav', -15, { note: 'появление CLAUDE' }),
  sfx(at('intro', S.intro.anim.q1At), 'pop-q1', 'pop', 'pop.wav', -14),
  sfx(at('intro', S.intro.anim.q2At), 'pop-q2', 'pop', 'pop.wav', -14),
  sfx(at('intro', 4.2), 'whoosh-2', 'whoosh', 'whoosh.wav', -14),

  // 3. Что умеет — pop на каждую карточку
  sfx(at('what', S.what.anim.plateAt), 'hit-ai', 'impact', 'impact-in.wav', -12, { note: 'плашка «ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ»' }),
  ...S.what.skills.map((k, i) => sfx(at('what', k.at), `pop-skill-${i + 1}`, 'pop', 'pop.wav', -15)),
  sfx(at('what', 5.0), 'typing-code', 'typing', 'typing.wav', -22, { dur: 0.8, note: 'клавиатура на «писать код»' }),
  sfx(at('what', 7.4), 'whoosh-3', 'whoosh', 'whoosh.wav', -14),

  // 4. Поворот — riser в тишину и удар на «видеомонтажом»
  sfx(at('twist', S.twist.anim.headAt), 'pop-head', 'pop', 'pop.wav', -15),
  sfx(at('twist', S.twist.anim.slamAt - 1.6), 'riser', 'riser', 'riser.wav', -15, { dur: 1.6, note: 'заканчивается ровно на слэме' }),
  sfx(at('twist', S.twist.anim.slamAt), 'impact-slam', 'impact', 'impact-in.wav', -7, { note: '«ВИДЕОМОНТАЖ!» — самый громкий удар' }),
  sfx(at('twist', 4.2), 'whoosh-4', 'whoosh', 'whoosh.wav', -14),

  // 5. Пример — видео заходит, выходы появляются по словам
  sfx(at('example', S.example.anim.videoIn), 'pop-video', 'pop', 'pop.wav', -14),
  sfx(at('example', S.example.anim.chipIn), 'notify-ai', 'notify', 'notify.wav', -15, { note: 'Claude принял файл' }),
  ...S.example.outputs.map((o, i) => sfx(at('example', o.at), `ding-out-${i + 1}`, 'pop', 'pop.wav', -14 - (i % 2))),
  sfx(at('example', 7.4), 'whoosh-5', 'whoosh', 'whoosh.wav', -14),

  // 6. Claude Code — печать в терминале, галочки
  ...S.code.terminal.filter((l) => l.kind === 'cmd').map((l, i) => sfx(at('code', l.at), `typing-${i + 1}`, 'typing', 'typing.wav', -19,
    { dur: Math.min(1.1, l.text.length / S.code.anim.typeCps), note: 'печать команды' })),
  ...S.code.terminal.filter((l) => l.kind === 'ok').map((l, i) => sfx(at('code', l.at), `tick-${i + 1}`, 'pop', 'pop.wav', -18)),
  sfx(at('code', S.code.anim.plateAt), 'hit-auto', 'impact', 'impact-in.wav', -11, { note: 'плашка «АВТОМАТИЗАЦИЯ»' }),
  sfx(at('code', 4.6), 'whoosh-6', 'whoosh', 'whoosh.wav', -14),

  // 7. Финал
  sfx(at('finale', S.finale.anim.cardAt), 'ding-card', 'ding', 'ding.wav', -13, { note: 'карточка «РЕАЛЬНЫЙ ПРИМЕР»' }),
  sfx(at('finale', S.finale.anim.ctaIn), 'notify-cta', 'notify', 'notify.wav', -12, { note: 'плашка «Подпишись»' }),
];
