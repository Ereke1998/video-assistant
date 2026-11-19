# Промпт для ИИ-клипа готового интерьера (на весь кадр) (video-to-video / image-to-video)

**Вход:** `scene4_src_576x1024.mp4` (5.5 с, тот же план, что в ролике с 12.5 с) или `scene4_first_frame.png`.
**Выход:** 9:16, ≥ 5.5 с, 30 fps, **та же камера и движение героини**, без текста и водяных знаков.

**Prompt (EN):**
Same camera angle and same woman walking, the raw concrete apartment is transformed into a finished
modern interior: light herringbone oak parquet floor, smooth warm-white plastered walls, suspended ceiling
with hidden warm LED cove lighting, sheer linen curtains on the windows, a cream bouclé sofa, a round mirror,
a tall green plant, soft warm daylight, photorealistic, architectural interior photography, stable geometry.

**Negative:** concrete, construction, pipes, distorted body, extra people, text, watermark, flicker, warped walls.

Клип накладывается на весь кадр поверх чернового плана (шторкой), поэтому камера и движение героини
должны совпадать с исходником как можно точнее (лучше video-to-video, а не image-to-video).
Готовый клип: `compose_reveal.sh /путь/ai_clip.mp4`, затем `build_sound.sh`.
