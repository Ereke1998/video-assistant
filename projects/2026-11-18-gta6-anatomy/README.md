# GTA 6 — «Анатомия главного релиза десятилетия»

Вертикальный ролик 9:16 (1080×1920, 30 fps), ~1:21. Автосборка: **Remotion + ElevenLabs (eleven_v3, русский голос Mark Rubins, SFX) + FFmpeg**.

## Файлы проекта

| Файл | Что внутри |
|---|---|
| `script.md` | Сценарий по актам: визуал, текст на экране, озвучка |
| `voiceover.md` | Текст под озвучку, хронометраж, настройки голоса |
| `subtitles.srt` | Субтитры (генерируются из таймлайна) |
| `edit-plan.md` | Монтажный план: сцены, таймкоды, SFX (генерируется) |
| `sound-design.md` | Звуковая партитура и сведение |
| `app/` | Remotion-проект: компоненты, таймлайн, скрипты сборки |

## Сборка

```bash
cd app
npm install
pip install piper-tts   # только для запасного бесплатного движка provider: 'piper'

npm run voice     # озвучка 4 актов (ElevenLabs eleven_v3 + теги эмоций, with-timestamps) → public/audio/actN.mp3
npm run sfx       # 17 SFX + музыкальный луп (ElevenLabs Sound Effects) → public/sfx, public/audio/music.mp3
npm run render    # → out/gta6_documentary.mp4 (H.264 CRF 16, AAC 320k, −14 LUFS)

npm run studio    # интерактивный превью-редактор Remotion
npm run render -- --draft                    # быстрый черновик 540×960
npm run render -- --stills=30,600,1200       # контрольные кадры → out/stills/
node scripts/export-docs.mjs                 # пересобрать subtitles.srt и edit-plan.md
```

Ключ ElevenLabs: `ELEVENLABS_API_KEY` (в облачной среде Claude подставляется прокси). Озвучка и SFX кэшируются — повторный запуск не тратит кредиты, пока не изменился текст.

## Как устроена синхронизация

```
src/data/script.ts ──► generate-voiceover.mjs ──► actN.mp3 + таймстемпы символов
        │                                                 │
        └──────────────► build-timeline.mjs ◄─────────────┘
                                │
                   timeline.generated.json  (слова, сцены, marks, SFX, субтитры)
                                │
                          Remotion (Documentary.tsx) ──► render.mjs ──► loudnorm ──► mp4
```

- **Единственный источник правды** — `app/src/data/script.ts`: текст актов, сцены, `cue`-фразы, `marks`, SFX.
- Разметка `[212 ГБ|двести двенадцать гигабайт]`: слева — как в субтитрах, справа — как произносит диктор.
- `cue: 'игра весит'` — сцена стартует на первом слове этой фразы (за 0,08 с до него).
- `marks: {land: '212 ГБ'}` — точка внутри сцены: счётчик «приземляется» ровно на слово.
- SFX с `cue` ставятся на слово, `offset` сдвигает (riser стартует за 1,6 с до титула акта).

Поменяли текст → `npm run voice && npm run render`: сцены, анимации, SFX и субтитры пересчитаются сами.

## Подгонка хронометража

- `VOICE.piper.lengthScale` (0.8 быстрее … 1.0 медленнее) и паузы в `script.ts`; `VOICE.tempo` — atempo без смены тона.
- `VOICE_TEMPO=1.1 npm run voice` — без повторного синтеза (используется кэш `actN.raw.*`).
- Движок: `VOICE.provider` = `piper` (бесплатно, нативный русский) или `elevenlabs` (русские голоса — с тарифа Starter).
- Ударения: «+» перед ударной гласной в тексте озвучки — `ст+оит`, `[Xbox Series|иксбокс с+ириес]`.
- `ALIGN_TO_PLAN=1` — акты не начинаются раньше плановых точек ТЗ (0:18 / 0:38 / 0:55).

## B-roll

Моушн-графика работает без футажа. Чтобы подставить видео, положите в `app/public/footage/`:
`crowd.mp4`, `office.mp4`, `gta5.mp4`, `gta6.mp4` — они автоматически займут слоты сцен.
Используйте только материалы, на которые у вас есть права. Референсы из чата (чужие TikTok-ролики с водяными знаками) использованы только как образец стиля.
