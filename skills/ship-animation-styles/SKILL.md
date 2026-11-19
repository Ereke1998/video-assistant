---
name: ship-animation-styles
description: Use when asked to animate a ship or boat in one of 10 visual styles (pixel art, chalk board, glowing sketch, PS2 graphics, comic, flat vector, line art on black, movie CGI, LEGO, toy 3D).
---

# Ship animation in 10 styles

The same ship is animated in ten different visual styles. Use this skill when the user asks for one of these styles, asks for a list of them, or asks for a version of the ship animation for Claude Code.

## Workflow

1. Identify the requested style by number or name (see the table). If the user names none, ask which one, or offer the list.
2. Start from the matching template in `styles/` (for example `styles/ship-05-comic.html`). It is one self-contained HTML file: inline SVG or CSS, keyframe animation, no external assets. Portrait 9:16 (360x640).
3. Keep the ship identical across styles (red hull, white superstructure, two funnels). Only the rendering style changes.
4. Animation beats for every style: ship sails in, a short pause, a bounce or lift-off, then a loop. Use CSS `@keyframes` with transform and opacity only.
5. Respect `prefers-reduced-motion` by disabling the loop.

## The 10 styles

| # | Name (RU) | Template | Look |
|---|-----------|----------|------|
| 1 | Пиксель-арт | `styles/ship-01-pixel-art.html` | 8-bit sprite on a sunset city skyline |
| 2 | Мел на доске | `styles/ship-02-chalk-board.html` | Green chalkboard, chalk outlines, handwritten labels |
| 3 | Светящийся скетч | `styles/ship-03-glow-sketch.html` | Black background, glowing gold lines, light beams |
| 4 | Графика PS2 | `styles/ship-04-ps2-graphics.html` | Low-poly 3D look, fog, early-2000s feel |
| 5 | Комикс | `styles/ship-05-comic.html` | Halftone dots, bold outlines, onomatopoeia burst |
| 6 | Плоский вектор | `styles/ship-06-flat-vector.html` | Flat solid shapes, no outlines |
| 7 | Линии на чёрном | `styles/ship-07-line-art-black.html` | White thin line art on black, dotted water |
| 8 | Кино-CGI | `styles/ship-08-movie-cgi.html` | Realistic-looking render, rim light, cinematic title card |
| 9 | Конструктор | `styles/ship-09-lego-constructor.html` | LEGO-style bricks on a blue baseplate |
| 10 | Игрушечное 3D | `styles/ship-10-toy-3d.html` | Soft toy render, pastel sky and sea |

## Output

- Deliver a single `.html` file per requested style. Name it `ship-<number>-<slug>.html`.
- If several styles are requested, list them in a table with the file names.
- Do not copy frames or text from the source reel. Use this skill's descriptions as the spec.
