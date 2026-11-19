# Kaspi Alaqan — 10 000 000 бонусов за ладонь (40 с, 9:16)

Репортаж-эксперимент без лица в кадре: счётчики, карточки, плашки, субтитры, звуковые метки.
1080×1920 · 30 или 60 fps · ровно 40,0 с · H.264 + AAC · громкость −14 LUFS, true peak −1 dBTP.

## Готовые файлы

| Файл | Что это |
|---|---|
| `render/out/kaspi-alaqan-10m-40s-1080x1920-30fps.mp4` | готовый ролик (голос ElevenLabs, SFX- и музыкальные **заглушки**) |
| `render/out/…-60fps.mp4` | то же в 60 fps (не в git, собирается `npm run build:60`) |
| `script.md` | сценарий по сценам |
| `voiceover.md` | текст диктора, хронометраж, что сокращено и почему |
| `subtitles.md` / `subtitles.srt` | субтитры 3–5 слов, тайминги по реальной озвучке |
| `sound-design.md` | звуковая партитура, SFX-слоты, музыка, сведение |
| `edit-plan.md` | монтажный план: раскладка кадра, безопасные зоны, анимации |

## Структура рендер-проекта

```
render/
├─ config/                    ← всё редактируемое без кода
│  ├─ video.config.js         формат, fps, безопасные зоны, сетка Y, палитра, шрифт
│  ├─ timeline.config.js      сцены: тайминги, экранный текст, фразы озвучки, субтитры, параметры анимации
│  └─ audio.config.js         голос (ElevenLabs), фоновый трек 12%, 38 SFX-слотов с таймкодами и dB
├─ src/
│  ├─ composition.js          renderFrame(ctx, t): фон → сцена (камера/тряска) → HUD → субтитры
│  ├─ scenes/                 hook · promo · experiment · mechanics · finale
│  ├─ layers/                 background · hud (таймер эксперимента) · subtitles
│  ├─ lib/                    easing/время, примитивы и векторные иконки, тайминг субтитров + .srt
│  └─ main.js                 превью-плеер и API для покадрового рендера
├─ scripts/
│  ├─ tts.mjs                 озвучка по фразам + выравнивание слов, подгонка под окна сцен
│  ├─ make-placeholder-audio.mjs  синтез заглушек SFX/музыки (не трогает твои файлы)
│  ├─ export-subtitles.mjs    .srt/.json для монтажки
│  ├─ render.mjs              Canvas → Playwright (Chromium) → ffmpeg, параллельно, детерминированно
│  ├─ mix-audio.mjs           голос + SFX + музыка (дакинг, music stop) → 2-проходный loudnorm → мукс
│  └─ server.mjs              статика для превью
├─ assets/vo/                 сгенерированная озвучка (кэш: повторный build не тратит кредиты)
├─ assets/sfx/, assets/music/ слоты под звук — замени файлы своими с теми же именами
└─ index.html                 превью с таймлайном и показом безопасных зон
```

## Запуск

Нужно: Node ≥ 20, ffmpeg, шрифт **Inter** (бесплатный, Google Fonts), Playwright + Chromium.

```bash
cd render
npm i && npx playwright install chromium   # один раз
npm run preview        # http://localhost:5173 (?safe — безопасные зоны), ▶ играет со звуком
npm run build          # TTS (из кэша) → заглушки → субтитры → рендер 30 fps → микс → out/*.mp4
npm run build:60       # то же, 60 fps
npm run stills         # контрольные кадры с наложенными безопасными зонами → build/stills/
```

Озвучка пересинтезируется только для изменённых фраз (`ELEVENLABS_API_KEY` в окружении).

## Как заменить звук

1. Свой фоновый трек положи в `render/assets/music/bg-track.mp3`: он сам подхватится вместо заглушки, громкость 12%, дакинг под голос.
2. SFX: замени файлы в `render/assets/sfx/` (`impact-in.wav`, `scanner-hum.wav`, `scanner-beep.wav`, `counter-roll.wav`, `whoosh.wav`, `pop.wav`, `ding.wav`, `notify.wav`, `miss-buzz.wav`, `cash.wav`, `riser.wav`). Таймкоды и громкость задаются в `config/audio.config.js`.
3. `npm run mix` пересоберёт звук без перерендера видео.

## Важно перед публикацией

- Номера платежей, суммы чеков и «+1 000 Б» в сцене 4 иллюстративные. Если ролик подаётся как реальный эксперимент, подставь свои фактические чеки в `timeline.config.js → attempts`.
- Логотип Kaspi не используется: только название в тексте и фирменный красный. Перед коммерческим использованием сверь условия акции с официальным источником.
- Заглушки звука синтетические. Для публикации замени их лицензионными SFX и треком.
