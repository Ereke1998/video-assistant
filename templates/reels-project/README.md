# Reels/TikTok проект — полностью кодовая генерация

Ни записей экрана, ни голоса и лица автора. Сценарий → TTS-озвучка → тайминги слов → субтитры → видеоряд из анимации, инфографики и плашек (Remotion / HyperFrames).

## Структура
```
project.config.json   ← единый источник правды: бриф, сцены, голос, субтитры, тема, звук
edits.md              ← журнал текстовых правок + словарь «фраза → параметр»
script.md             ← сценарий (генерируется)
voiceover.md          ← текст под озвучку (генерируется)
references/           ← analysis.md, metrics.json, downloads/ (yt-dlp, не в git)
build/                ← script.json, timeline.json, audio/, renders/ — генерируется (не в git)
subtitles/            ← subtitles.srt, subtitles.json
graphics/remotion/    ← Main (сборка), Background, Hook, Plate, List, Infographic, Counter, Code, CTA, Subtitles
graphics/hyperframes/ ← HTML-композиции интерфейсов (мокапы, клики, UI)
pipeline/             ← скрипты шагов
```

## Конвейер
| Шаг | Команда | Результат |
|---|---|---|
| 0. Референсы | `pipeline/fetch_refs.sh URL...` | `references/metrics.json` → `analysis.md` |
| 1. Сценарий | `python3 pipeline/generate_script.py` | хук по формуле, проверка хронометража → `build/script.json`, `script.md`, `voiceover.md` |
| 2. Озвучка | `python3 pipeline/voiceover.py` | TTS по сценам → `build/audio/voiceover.mp3`, `build/timeline.json` (длительность сцен = длина фраз) |
| 3. Тайминги слов | `python3 pipeline/align.py` | Whisper + привязка к тексту сценария → `build/audio/words.json` |
| 4. Субтитры | `python3 pipeline/subtitles.py` | блоки 2–4 слова с акцентами → `subtitles/*.srt/json` |
| 5. Превью | `python3 pipeline/sync_remotion.py && cd graphics/remotion && npm i && npm run studio` | Studio: `Main` и каждая сцена отдельно |
| 6. Рендер | `pipeline/run_all.sh` (шаги 1–5 + HyperFrames + рендер) | `build/renders/final.mp4` |

Офлайн-превью без сети и Whisper: `voiceover.engine = "preview"` (тишина расчётной длины + оценочные тайминги слов).

## Зависимости
`ffmpeg`, `python3`, `node ≥ 18`, `pip install edge-tts faster-whisper yt-dlp`.
