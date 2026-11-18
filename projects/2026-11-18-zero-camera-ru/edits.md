# Журнал правок

Каждая правка пользователя («сделай хук крупнее», «ускорь динамику на 5 секунде») фиксируется здесь
и вносится точечно в `project.config.json` (или в код композиции, если параметра нет в конфиге).

| # | Дата | Запрос (как сказал пользователь) | Что изменено | Файл / ключ | Было → Стало |
|---|---|---|---|---|---|
| 1 | 2026-11-18 | «Давай на русском, дикторский голос, правдоподобный» | русская версия, голос Dmitry + обработка announcer | `project.language`, `voiceover.fx` | kk → ru, none → announcer |
| 2 | 2026-11-18 | (QA) тишина TTS ~0,9 с после каждой фразы | подрезка хвостов и пауз | `voiceover.trim` | 34,4 с → 26,9 с |
| 3 | 2026-11-18 | (QA) хук не влезал по ширине | автоподгонка кегля + неразрывные крупные строки | `Headline.tsx` | — |
| 4 | 2026-11-18 | «Произношение, ударения, нет эмоций» → «Первый голос» | ElevenLabs, голос Liam, multilingual v2 | `voiceover.engine`, `voiceover.elevenlabs.voice_id`, `voiceover.fx` | edge-tts/Dmitry → elevenlabs/Liam, announcer → none |
| 5 | 2026-11-18 | «Поработай по саунд-дизайну, фоновый звук или мелодию» | 30 SFX по анимациям, синт-музыка 120 BPM, дакинг, мастер −14 LUFS | `audio`, `pipeline/sound.py` | только голос → микс |

## Словарь правок → параметры

| Формулировка | Куда | Действие | Перегенерировать |
|---|---|---|---|
| «текст крупнее / мельче» | `headline.size_px` | 74 → 84 / 64 | рендер |
| «другой стиль / светлый фон» | `theme.preset` | night / blueprint / paper | рендер |
| «выдели слово X» (в заголовке) | `scenes[].voice` | обернуть: `*X*`, крупно `^X^`, зачеркнуть `~X~` | с шага 1 |
| «слова появляются сразу / караоке» | `headline.reveal` | pop / karaoke | рендер |
| «вспышка на панчлайне» | `scenes[].flash` | true | рендер |
| «робот показывает / машет / думает» | `scenes[].mascot` | point / wave / think / present / shrug / null | рендер |
| «робот правее / убрать робота» | `scenes[].mascot_x` / `mascot.enabled` | right / false | рендер |
| «поменяй ник / бегущую строку» | `hud.handle` / `hud.ticker` | — | рендер |
| «другой хук / хук острее» | `script.hook.formula` или `scenes[hook].voice` | сменить формулу / переписать текст | всё с шага 1 |
| «ускорь / замедли на N сек» | `voiceover.rate`, `voiceover.pad_after_sec`; для сцены — сократить `voice` | +5–10% / −0.05 с | с шага 2 |
| «больше динамики» | `pad_after_sec` ↓, `transition` → `slide`, `List.stagger` ↓ | 0.15 → 0.08, 12 → 8 | с шага 2 |
| «другой голос / женский голос» | `voiceover.voices.<lang>` | напр. `ru-RU-SvetlanaNeural`, `kk-KZ-AigulNeural` | с шага 2 |
| «замени визуал на N сек» | `scenes[блок].visual.component` + `props` | Chips / Chat / Phone / ToolList / Folder / Steps / Bars / Counter / Cards / Code / CTA | рендер |
| «покажи интерфейс» | сцена с `visual.engine = hyperframes`, `enabled: true` | HTML в `graphics/hyperframes/` | HyperFrames + рендер |
| «субтитры снизу» | `subtitles.mode` | headline → bottom | рендер |
| «покажи субтитры на хуке» | `subtitles.hide_on_scenes` | убрать `hook` | рендер |
| «меньше слов на экране» | `subtitles.words_per_block.max` | 4 → 3 | с шага 4 |
| «выдели слово X» | `subtitles.keywords` | добавить X | с шага 4 |
| «другие цвета» | `theme.overrides` | напр. `{"accent": "#22C55E"}` | рендер |
| «музыка тише» | `audio.music.volume_db` | −3 dB | рендер |
| «добавь звук на сцене» | `scenes[блок].sfx` | whoosh / pop / riser / impact | рендер |
