"""Копирует артефакты конвейера в graphics/remotion/public/ (откуда их читает Remotion)."""
import shutil
from common import load_config, p, active_scenes

cfg = load_config(); pub = p("graphics/remotion/public"); pub.mkdir(parents=True, exist_ok=True)
shutil.copy(p(cfg["script"]["output_json"]), pub / "script.json")
shutil.copy(p(cfg["voiceover"]["timeline_json"]), pub / "timeline.json")
shutil.copy(p(cfg["subtitles"]["output_json"]), pub / "subtitles.json")
shutil.copy(p(cfg["voiceover"]["output"]), pub / "voiceover.mp3")
for s in active_scenes(cfg):
    if s["visual"]["engine"] == "hyperframes" and p(s["visual"]["render"]).exists():
        shutil.copy(p(s["visual"]["render"]), pub / f"hf_{s['id']}.mp4")
print("synced -> graphics/remotion/public/")
