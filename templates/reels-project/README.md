# Reels/TikTok проект (без лица и голоса автора в кадре)

## Структура
```
project.config.json   ← единый источник правды (формат, нарезка, Whisper, субтитры, таймлайн, звук)
edits.md              ← журнал текстовых правок + словарь «фраза → параметр»
references/           ← analysis.md, metrics.json, downloads/ (yt-dlp, не в git)
sources/              ← сюда кидаешь запись экрана / видео (не в git)
build/                ← cuts/, audio/, renders/ — генерируется (не в git)
subtitles/            ← subtitles.srt, subtitles.json
graphics/remotion/    ← Hook, Infographic, CTA, Subtitles, Main (сборка по timeline)
graphics/hyperframes/ ← HTML-композиции интерфейсов
pipeline/             ← скрипты шагов
```

## Конвейер
| Шаг | Команда | Результат |
|---|---|---|
| 1. Референсы | `pipeline/fetch_refs.sh URL...` | `references/downloads/`, `metrics.json` → заполнить `analysis.md` |
| 2. Транскрипт исходника | `python3 pipeline/transcribe.py` | `build/audio/transcript.json` |
| 3. Автонарезка | `python3 pipeline/autocut.py` | `build/cuts/main_cut.mp4`, `cut_map.json` |
| 4. Транскрипт нарезки | `python3 pipeline/transcribe.py build/cuts/main_cut.mp4` | обновлённые тайминги |
| 5. Субтитры | `python3 pipeline/subtitles.py` | `subtitles/*.srt/json` |
| 6. Графика | `cd graphics/remotion && npm i && npm run studio` | превью |
| 7. Рендер | `pipeline/run_all.sh` (всё сразу) | `build/renders/final.mp4` |

## Зависимости
`ffmpeg`, `python3`, `pip install faster-whisper yt-dlp`, `node ≥ 18`.
