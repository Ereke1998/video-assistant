# video-assistant

Шаблон ассистента по видеопродакшну (см. `CLAUDE.md`) + проект на Remotion:
вертикальный ролик «Подумай сам», 40 c, 1080×1920, 30 fps. Аудио сгенерировано через ElevenLabs.

## Быстрый старт

```bash
npm install
npx remotion studio                      # предпросмотр
npx remotion render Main out/video.mp4   # рендер
```

## Аудио (ElevenLabs)

```bash
cp .env.example .env    # впишите ELEVENLABS_API_KEY; ELEVENLABS_VOICE_ID уже указан (Gleb)
npx tsx scripts/generate_voice.ts   # озвучка → public/audio/voice-1..6.mp3 (+ пословные тайминги)
npx tsx scripts/generate_sfx.ts     # 8 эффектов → public/audio/sfx-*.mp3 (до 3 попыток на эффект)
npx tsx scripts/generate_music.ts   # музыка → public/audio/music.mp3 (или тихая заглушка)
npx tsx scripts/normalize_audio.ts  # если заменили аудио вручную
npx tsx scripts/export_srt.ts       # субтитры → projects/.../subtitles.srt
```

Без `ELEVENLABS_VOICE_ID` скрипт озвучки выведет список голосов и попросит выбрать.
Длительности и тайминги слов пишутся в `src/audio-manifest.json`, и ролик синхронизируется по нему.

## Структура

- `src/Root.tsx` — композиция `Main`; `src/Main.tsx` — сцены, музыка, субтитры, плёночный слой.
- `src/scenes/Scene1Hook.tsx … Scene6Final.tsx` — по компоненту на сцену.
- `src/content.ts` — тексты, тайминги сцен, SFX (единый источник для кода и скриптов).
- `src/timeline.ts` — субтитры по таймингам слов, громкость музыки и дакинг.
- `projects/2026-11-23-podumay-sam/` — сценарий, звук, SRT.
