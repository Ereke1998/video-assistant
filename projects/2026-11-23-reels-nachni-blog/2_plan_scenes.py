"""ШАГ 3. Подгоняет длину сцен под озвучку (бесплатно).

Каждая сцена начинается чуть раньше своей фразы (склейка в паузе)
и длится до начала следующей сцены. Результат: scene_plan.json и edit-plan.md.

Запуск:  python 2_plan_scenes.py
"""
import math

from common import PLAN_FILE, ROOT, TIMINGS_FILE, fail, fmt, load_json, load_project, save_json


def main():
    if not TIMINGS_FILE.exists():
        fail("Сначала сделайте озвучку: python 1_voiceover.py")
    project, timings = load_project(), load_json(TIMINGS_FILE)
    fps = project["video"]["fps"]
    cut = project["timing"]["cut_before_phrase_sec"]
    starts = {p["id"]: p["start"] for p in timings["phrases"]}
    total = timings["total"]

    scenes = project["scenes"]
    bounds = [0.0] + [max(0.0, starts[s["phrases"][0]] - cut) for s in scenes[1:]] + [total]
    plan = []
    for i, s in enumerate(scenes):
        # границы считаем в кадрах, чтобы видео и звук не расходились
        f0, f1 = round(bounds[i] * fps), round(bounds[i + 1] * fps)
        start, end = f0 / fps, f1 / fps
        plan.append({"id": s["id"], "phrases": s["phrases"], "start": start, "end": end,
                     "duration": round(end - start, 3), "frames": f1 - f0,
                     "min_clip_sec": math.ceil((end - start) / project["video"]["max_slowdown"] * 10) / 10})
    save_json(PLAN_FILE, {"total": total, "fps": fps, "scenes": plan})

    print("Сцена | Начало   | Конец    | Длит.  | Фразы")
    md = ["# Монтажный план\n", "| Сцена | Начало | Конец | Длительность | Фраза | Промпт |",
          "|---|---|---|---|---|---|"]
    text = {p["id"]: p["text"] for p in project["phrases"]}
    for p, s in zip(plan, scenes):
        print(f"  {p['id']}   | {fmt(p['start'])} | {fmt(p['end'])} | {p['duration']:5.2f}с | {p['phrases']}")
        md.append(f"| {p['id']} | {fmt(p['start'])} | {fmt(p['end'])} | {p['duration']:.2f} с | "
                  f"{' '.join(text[i] for i in p['phrases'])} | {s['prompt']} |")
    md.append(f"\n**Общая длина:** {total:.2f} сек · 1080×1920 · {fps} fps")
    (ROOT / "edit-plan.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(f"\nОбщая длина ролика: {total:.2f} сек. План сохранён в scene_plan.json и edit-plan.md")


if __name__ == "__main__":
    main()
