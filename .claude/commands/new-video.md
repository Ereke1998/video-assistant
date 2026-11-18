---
description: Новый Reels/TikTok ролик полностью из кода (сценарий → TTS-озвучка → субтитры → анимация Remotion/HyperFrames → рендер)
argument-hint: <название-проекта> [ru|kk] <тема> [ссылки на референсы]
---

# Новый ролик (кодовая генерация)

Входные данные: $ARGUMENTS

Ролик собирается только из кода: без записи экрана, без лица и голоса автора.

1. `scripts/new-project.sh <название> <язык>` → папка проекта.
2. Если есть ссылки (3–5) → `references.urls` → `pipeline/fetch_refs.sh`. По `metrics.json` заполни `references/analysis.md`. **Вдохновляйся, но не копируй** — ни текстов, ни кадров, ни графики.
3. Заполни бриф `script` (topic, audience, tone, hook.formula) и сцены `scenes`:
   - `voice` — короткие фразы под TTS, ≤ `max_words_per_scene` слов, хук ≤ 3 с. Это же — заголовок на экране: размечай `*акцент*`, `~зачёркнуто~`, `^КРУПНО^`, `_подводка_`, ` | ` перенос, `0{нөл}` — цифра на экране, слово в озвучке; 1–2 акцента на сцену;
   - `visual` — компонент из `scene_components` и его props (карточки дополняют текст, а не повторяют);
   - `mascot` (поза), `mascot_x`, `flash` для панчлайна, `transition`, `sfx`. Интерфейсы — сцена `engine: hyperframes`;
   - `theme.preset` (night / blueprint / paper), `hud.handle`, `hud.ticker`.
4. `python3 pipeline/generate_script.py` → исправь все ⚠ (хронометраж, длина хука) и повтори.
5. `pipeline/run_all.sh` → `build/renders/final.mp4`. Нет сети/TTS — `voiceover.engine = "preview"` для превью.
6. Отчёт: таблица сцен с таймкодами из `build/timeline.json`, итоговая длительность, список файлов.
