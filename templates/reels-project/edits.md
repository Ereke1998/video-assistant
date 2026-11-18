# Журнал правок

Каждая правка пользователя («сделай хук крупнее», «ускорь динамику на 5 секунде») фиксируется здесь
и вносится точечно в `project.config.json` (или в код композиции, если параметра нет в конфиге).

| # | Дата | Запрос (как сказал пользователь) | Что изменено | Файл / ключ | Было → Стало |
|---|---|---|---|---|---|
| 1 | | | | | |

## Словарь правок → параметры

| Формулировка | Куда | Действие | Перегенерировать |
|---|---|---|---|
| «хук крупнее / мельче» | `scenes[hook].visual.props.scale` | ×1.2 / ×0.85 | рендер |
| «другой хук / хук острее» | `script.hook.formula` или `scenes[hook].voice` | сменить формулу / переписать текст | всё с шага 1 |
| «ускорь / замедли на N сек» | `voiceover.rate`, `voiceover.pad_after_sec`; для сцены — сократить `voice` | +5–10% / −0.05 с | с шага 2 |
| «больше динамики» | `pad_after_sec` ↓, `transition` → `slide`, `List.stagger` ↓ | 0.15 → 0.08, 12 → 8 | с шага 2 |
| «другой голос / женский голос» | `voiceover.voices.<lang>` | напр. `ru-RU-SvetlanaNeural`, `kk-KZ-AigulNeural` | с шага 2 |
| «замени визуал на N сек» | `scenes[блок].visual.component` + `props` | Plate / List / Counter / Infographic / Code | рендер |
| «покажи интерфейс» | сцена с `visual.engine = hyperframes`, `enabled: true` | HTML в `graphics/hyperframes/` | HyperFrames + рендер |
| «субтитры крупнее / ниже» | `subtitles.style.size_px` / `position_y_pct` | ±10% / ±4 п.п. (в safe zone) | рендер |
| «покажи субтитры на хуке» | `subtitles.hide_on_scenes` | убрать `hook` | рендер |
| «меньше слов на экране» | `subtitles.words_per_block.max` | 4 → 3 | с шага 4 |
| «выдели слово X» | `subtitles.keywords` | добавить X | с шага 4 |
| «другие цвета / темнее фон» | `theme.background.colors`, `theme.accent_color` | новая палитра | рендер |
| «музыка тише» | `audio.music.volume_db` | −3 dB | рендер |
| «добавь звук на сцене» | `scenes[блок].sfx` | whoosh / pop / riser / impact | рендер |
