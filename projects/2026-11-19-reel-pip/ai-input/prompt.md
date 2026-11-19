# ИИ-клипы «ПОСЛЕ» — 6 планов

Каждый план ролика: 1.0 с «ДО» (черновая) → шторка 0.7 с → 1.3 с «ПОСЛЕ».
«ПОСЛЕ» накладывается **на весь кадр поверх исходника**, поэтому камера, ракурс и движение героини должны совпадать.
Лучше всего video-to-video (Runway Gen-4 / Aleph, Kling, Luma Modify) с `shotN_src.mp4` на входе
и 1–2 кадрами из `style/` как стилевым референсом. Запасной вариант — отредактировать `shotN_first_frame.png`
(image edit) → получится статичное «после», его тоже можно подставить.

**Готовые файлы:** `/tmp/work/ai_output/shot1.mp4 … shot6.mp4` (или `.png/.jpg`), 9:16, ≥ 3 с, без текста и водяных знаков.
Затем: `bash compose_reveal.sh && bash build_sound.sh`.

## Стиль (по видео-референсу интерьера)
Тёплый минимализм, вся палитра в оттенках «грейж» и тёплого белого, чёрные тонкие акценты.
- Стены: гладкая штукатурка тёплого белого цвета; ТВ-зона и изголовье — декоративные панели с тонкими вертикальными швами.
- Потолок: белый, ровный; встроенные чёрные магнитные треки-линии и точечные светильники; скрытая тёплая LED-подсветка по контуру.
- Пол: светлый инженерный паркет (дуб), в комнатах — светлый ковёр с коротким ворсом.
- Окна: плотные шторы цвета тауп от пола до потолка + белый тюль.
- Хранение: встроенные шкафы во всю высоту, фасады грейж, чёрные вертикальные ручки-профили.
- Мебель: модульный диван грейж, кресла и пуф из букле, белая консоль/туалетный столик, кровать с мягким изголовьем.
- Свет: мягкий дневной + тёплая подсветка 3000 K, без пересвета.

**Базовый промпт (EN), дописать по плану ниже:**
> Same camera angle, same camera motion and same woman, the raw concrete apartment is fully renovated in a warm
> minimalist style: smooth warm-white plaster walls, light oak engineered parquet, flat white ceiling with slim black
> magnetic track lights and hidden warm LED cove lighting, floor-to-ceiling taupe curtains with white sheer tulle,
> greige built-in wardrobes with black vertical handles, bouclé furniture, soft natural daylight, photorealistic
> architectural interior video, stable geometry, consistent across frames.

**Negative:** concrete, unfinished walls, pipes, radiators exposed, construction debris, distorted body, extra people, text, watermark, logo, flicker, warping.

## Планы
| # | Ролик | Исходник | Что в кадре | Дописать к промпту |
|---|---|---|---|---|
| 1 | 0–3 с | 2:27.5 | Вид из окна на город, камера отъезжает к раме | new white window sill, taupe curtains and sheer tulle framing the window, warm interior edge in foreground; city view unchanged |
| 2 | 3–6 с | 1:12.5 | Вход в большую комнату, героиня идёт вглубь | living room: greige modular sofa facing a wall-mounted TV on a fluted panel, light rug, curtains on both windows |
| 3 | 6–9 с | 2:08 | Коридор, героиня в проёме | hallway: full-height greige built-in wardrobes with black vertical handles, flush hidden doors, LED cove light, bouclé pouf |
| 4 | 9–12 с | 0:18 | Общий план большой комнаты, два окна | living room wide shot: sofa, low TV console, round mirror, tall plant, black track lights across the ceiling |
| 5 | 12–15 с | 2:23 | Эркер с большим окном, героиня у окна | bedroom bay window: bed with upholstered headboard, white vanity desk with bouclé chair by the window, taupe curtains |
| 6 | 15–18 с | 3:04 | Общий план, героиня в комнате у эркера | open living-dining: round white dining table with black X-base, bouclé chairs, sofa, warm cove lighting |

`style/style_1..8.png` — кадры из видео-референса (прихожая, гостиная, спальня, санузел, кухня).
