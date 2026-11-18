#!/usr/bin/env node
/**
 * Экспорт документов проекта из актуального таймлайна:
 *   ../subtitles.srt  — субтитры (3–5 слов на экран)
 *   ../edit-plan.md   — монтажный план: сцены, таймкоды, SFX
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildTimeline} from './build-timeline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_DIR = path.resolve(ROOT, '..');
const tl = buildTimeline({quiet: true});

const srtTime = (t) => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`;
};
const tc = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(2).padStart(5, '0')}`;

const srt = tl.chunks
  .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.words.map((w) => tl.words[w].text).join(' ').toUpperCase()}\n`)
  .join('\n');
fs.writeFileSync(path.join(PROJECT_DIR, 'subtitles.srt'), srt);

const DESCR = {
  Countdown: 'Красный обратный отсчёт 3-2-1, кольцо-таймер',
  Hook: 'Слэм «GTA 6 / ВЫШЛА» + плашка «13 ЛЕТ ОЖИДАНИЯ»',
  YearsJump: '2013 → 2026, счётчик 0→13 с попаданием в слово',
  Generations: 'Плашки поколений консолей, PS3 зачёркивается',
  Crowd: 'Ликующая толпа + чат стримера (слот футажа `crowd`)',
  OfficeClosed: 'Пустой офис LOGITECH, штамп «ЗАКРЫТО» (слот `office`)',
  Question: 'Календарь 19.11 + глитч-вопрос',
  ActTitle: 'Титул акта: римская цифра, вайп-полосы',
  BigNumber: 'Счётчик крупной цифры с «приземлением» на слово',
  BudgetBars: 'Столбики бюджетов: фильмы vs GTA VI',
  PriceTags: 'Ценники STANDARD / ULTIMATE',
  RecordBadge: 'Кубок + «МИРОВОЙ РЕКОРД ПРЕДЗАКАЗОВ»',
  Platforms: 'PS5 ✓ / XBOX ✓ / ПК ✗',
  Engine: 'RAGE 9: код-дождь, шестерня, REBUILD 100%',
  CopsAI: 'Звёзды розыска, камеры, свидетели, мигалки',
  SplitScreen: 'Сплит-экран GTA V vs GTA VI (слоты `gta5`/`gta6`)',
  MapPin: 'Неоновая карта Леониды, пин Vice City',
  ChaosTags: 'Стикеры: магазины / болота / аллигаторы',
  Demand: 'Кошелёк → монеты → консоль, штамп SOLD OUT',
  StockChart: 'Свечной график TAKE-TWO (иллюстрация)',
  Views: 'Счётчик просмотров 1 000 000+, лайки',
  FinalPoll: 'Раскол → вопрос → варианты A/B → CTA в комментарии',
};

const lines = [
  '# Монтажный план: Анатомия главного релиза десятилетия — GTA 6',
  '',
  `Формат: 9:16, ${tl.width}×${tl.height}, ${tl.fps} fps | Длительность: **${tc(tl.duration)}** | Сгенерировано из таймлайна: ${tl.generatedAt.slice(0, 16).replace('T', ' ')} UTC`,
  '',
  '> Файл генерируется автоматически: `cd app && node scripts/export-docs.mjs`. Правки вносите в `app/src/data/script.ts`.',
  '',
  '## Акты: план vs факт',
  '',
  '| Акт | План ТЗ | Факт (по озвучке) |',
  '|---|---|---|',
  ...tl.acts.map((a) => `| ${a.roman} · ${a.title} | ${tc(a.plannedStart)}–${tc(a.plannedEnd)} | ${tc(a.start)}–${tc(a.end)} |`),
  '',
  '## Сцены',
  '',
  '| # | Таймкод | Длит. | Акт | Сцена | Визуал | Точки синхронизации | SFX |',
  '|---|---|---|---|---|---|---|---|',
  ...tl.scenes.map((s, i) => {
    const fx = tl.sfx.filter((x) => x.time >= s.start - 2 && x.time < s.end && (x.time >= s.start || x.name === 'riser'));
    const marks = Object.entries(s.marks).map(([k, v]) => `${k} +${v.toFixed(2)}с`).join(', ');
    return `| ${i + 1} | ${tc(s.start)} | ${(s.end - s.start).toFixed(1)} с | ${s.act} | \`${s.id}\` | ${DESCR[s.type] ?? s.type} | ${marks || '—'} | ${fx.map((x) => `${x.name}@${tc(x.time)}`).join(', ') || '—'} |`;
  }),
  '',
  '## Переходы и ритм',
  '',
  '- Каждая сцена: вход zoom 112%→100% + blur 14px→0 (7 кадров), выход 100%→94% + fade (5 кадров).',
  '- Смена сцены стартует за 0,08 с до ключевого слова — визуал воспринимается синхронным с голосом.',
  '- На каждом `impact`: белая вспышка (до 22%) и тряска камеры до 18 px, затухание 14 кадров.',
  '- Цвет фона перетекает между актами за 0,6 с: I — красный, II — зелёный (деньги), III — циан (технологии), IV — маджента.',
  '- Постоянные слои: HUD (акт + LIVE · 19.11 + прогресс-бар), субтитры в безопасной зоне (y = 1300–1530).',
  '',
  '## B-roll (опционально)',
  '',
  'Положите файлы в `app/public/footage/` — они автоматически заменят моушн-заглушки:',
  '',
  '| Файл | Сцена |',
  '|---|---|',
  '| `crowd.mp4` | ликующие толпы / стримеры (акт I) |',
  '| `office.mp4` | пустой офис (акт I) |',
  '| `gta5.mp4` / `gta6.mp4` | сплит-экран физики (акт III) |',
  '',
  'Используйте только футаж, на который у вас есть права (официальные трейлеры — с учётом правил платформы).',
  '',
];
fs.writeFileSync(path.join(PROJECT_DIR, 'edit-plan.md'), lines.join('\n'));
console.log('→ subtitles.srt, edit-plan.md');
