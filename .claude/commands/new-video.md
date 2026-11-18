---
description: Новый Reels/TikTok проект по полному конвейеру (референсы → нарезка → графика → субтитры → рендер)
argument-hint: <название-проекта> [ru|kk] [ссылки на референсы]
---

# Новый ролик

Входные данные: $ARGUMENTS

1. `scripts/new-project.sh <название> <язык>` → папка проекта.
2. Ссылки (3–5) → `references.urls` в конфиге → `pipeline/fetch_refs.sh`. По `metrics.json` + просмотру заполни `references/analysis.md`: хук, склеек/мин, длина плана, слов в субтитре. **Вдохновляйся, но не копируй** — ни текстов, ни кадров, ни графики референсов.
3. Под выводы анализа заполни `timeline` (блоки, тексты хука/CTA, тип графики), `subtitles.style`, `autocut` (агрессивность нарезки под темп референсов).
4. Если в `sources/` есть файл — `transcribe.py` → `autocut.py` → `transcribe.py build/cuts/main_cut.mp4` → `subtitles.py`. Нет — попроси загрузить и остановись.
5. Пропиши props графики (Remotion) и при необходимости HTML-интерфейс (HyperFrames) под каждый блок.
6. `pipeline/run_all.sh` → `build/renders/final.mp4`.
7. Отчёт: таблица блоков с таймкодами, что вырезано (сек/фрагменты), список файлов.
