# PRIME IT — 3D Reels (Remotion + React Three Fiber)

**Версия 3:** неоновая motion-инфографика (микс референсов) + 3D-голограмма ноутбука как акцент
(хук, чистка, финал). Шрифт Oswald Bold, тёмный фон с лучами, цвета сцен: оранжевый/красный → синий/голубой.
Субтитры по 2–3 слова ЗАГЛАВНЫМИ на ~70 % высоты (фразы — `CHUNKS` в `src/data/script.ts`).
Раскадровка — `storyboard.md`. Готовый ролик — `out/prime_it_reels.mp4`.

Вертикальный рекламный ролик сервиса ремонта ноутбуков PRIME IT.
**1080×1920 (9:16), 60 fps, 32 с (1920 кадров), H.264 MP4.**

## Команды

```bash
npm install                      # зависимости (Node 18+; проверено на Node 22)
npx remotion studio              # превью в браузере
npx remotion render ReelsVideo out/prime_it_reels.mp4 --codec=h264   # = npm run render
npm run stills                   # контрольные кадры 0,180,600,1100,1500,1800,1919 -> out/stills/
npm run srt                      # out/subtitles.srt из src/data/script.ts
npm run timings                  # пересчитать предварительные тайминги слов
npm run audio                    # пересоздать процедурные аудио-заглушки (python3 + numpy + ffmpeg)
```

Нужен `ffmpeg` (Remotion использует свой встроенный, системный — для `npm run audio`).
3D рендерится программным WebGL (`--gl=angle`, задано в `remotion.config.ts`), видеокарта не требуется.
Если на машине есть `/opt/pw-browsers/.../chrome-headless-shell`, он используется вместо скачивания Chromium.

## Структура

```
src/
  Root.tsx                 композиция ReelsVideo (1080x1920, 60 fps, 1920 кадров)
  ReelsVideo.tsx           сборка сцен + субтитры + звук
  scenes/                  Hook, DustProblem, ThermalProblem, Solution, Brand
  components/
    Laptop3D.tsx           процедурный ноутбук-голограмма: светящиеся рёбра + полупрозрачные грани,
                           скан-полосы, «прорисовка», перекраска синий↔оранжевый; плата, CPU/GPU, VRAM,
                           термопаста (камень + трещины Вороного), прокладки, трубки, радиатор, вентилятор
    Dust.tsx               комья пыли (instanced, рост/выдувание)
    Effects3D.tsx          волны жара/потока (шейдер), стрелки горячего воздуха, частицы-линии
    Stage.tsx              ThreeCanvas, свет, окружение, сетка-пол, bloom, глитч (RGB-сдвиг, scanlines), марево
    neon/                  фон с лучами, шапка, плашки, карточки, неоновые иконки, глитч
    Subtitles.tsx          субтитры по фразам (2–3 слова)
    SoundTrack.tsx         озвучка / музыка / SFX и уровни микса
    font.ts                Oswald Bold
  data/script.ts           сценарий, окна сцен, пословные тайминги WORDS
public/audio/              voiceover.mp3, music.mp3, sfx/*.wav
public/fonts/              Oswald (woff2 из Google Fonts)
scripts/                   gen_audio.py, build-timings.mjs, export-srt.mjs, stills.mjs
```

## Аудио — куда класть

| Файл | Что сейчас | Где используется |
|---|---|---|
| `public/audio/voiceover.mp3` | **заглушка: 32 с тишины** | весь ролик, −6 dB |
| `public/audio/music.mp3` | процедурный phonk/tech-бит 140 BPM (сгенерирован `gen_audio.py`, без чужих сэмплов) | −18 dB, подъём до −12 dB к 26 с |
| `public/audio/sfx/fan_takeoff.wav` | процедурный | 0.0 с |
| `public/audio/sfx/alarm.wav` | процедурный | 0.2 с |
| `public/audio/sfx/whoosh.wav` | процедурный | пик на 3.0 и 18.0 с (+ тихие на 10 и 26 с) |
| `public/audio/sfx/crack_stone.wav` | процедурный | 11.0 с |
| `public/audio/sfx/system_freeze.wav` | процедурный | 14.0 с |
| `public/audio/sfx/fresh_air.wav` | процедурный | 19.0 с |
| `public/audio/sfx/tech_click.wav` / `ding.wav` | процедурные | 24.0 / 25.0 с |
| `public/audio/sfx/click.wav` | процедурный | 27.73 с (появление логотипа) |

Замените файлы своими с **теми же именами** и перерендерьте. Время и уровни — в `src/components/SoundTrack.tsx`.

## Субтитры и тайминги

> ⚠️ **Тайминги слов предварительные.** Озвучки нет, поэтому слова распределены равномерно
> (с весом по длине слова) внутри окна каждой сцены — `npm run timings`.

Когда появится `public/audio/voiceover.mp3`:

```bash
pip install -U openai-whisper
whisper public/audio/voiceover.mp3 --language ru --word_timestamps True --output_format json --output_dir out/
```

Перенесите пословные `start`/`end` (секунды × 60 = кадры) в массив `WORDS` в `src/data/script.ts`,
поставьте `TIMINGS_ARE_PRELIMINARY = false`, затем `npm run srt` и `npm run render`.

Стиль: Oswald Bold ~170 px (длинные слова автоматически ужимаются до ширины 960 px),
белый, чёрная обводка 12 px (`paint-order: stroke fill`), мягкая тень, центр на 58 % высоты,
pop-in 0.6 → 1.15 → 1.0 за 8 кадров (spring), слова ЗАГЛАВНЫМИ — `#FFB800`.

## Шрифт

Oswald Bold 700 (кириллица + латиница) подключается из `public/fonts/` — это те же woff2-файлы
Google Fonts. Так сделано потому, что headless-Chromium в среде рендера не смог скачать их с
fonts.gstatic.com (ошибка сертификата прокси). Загрузка напрямую через `@remotion/google-fonts`:

```bash
REMOTION_FONT_SOURCE=google npx remotion render ReelsVideo out/prime_it_reels.mp4
```

Запасной шрифт — Impact.

## Тайминг сцен

| Сцена | Время | Кадры |
|---|---|---|
| Хук | 00:00–00:03 | 0–179 |
| Пыль | 00:03–00:10 | 180–599 |
| Термопаста/прокладки (глитч 14.0–14.5 с) | 00:10–00:18 | 600–1079 |
| Решение | 00:18–00:26 | 1080–1559 |
| Бренд (статичный кадр 30.5–32 с) | 00:26–00:32 | 1560–1919 |
