"""Копирует артефакты конвейера в graphics/remotion/public/ (откуда их читает Remotion)."""
import shutil
from common import load_config, p, active_scenes

cfg = load_config(); pub = p("graphics/remotion/public"); pub.mkdir(parents=True, exist_ok=True)
shutil.copy(p(cfg["script"]["output_json"]), pub / "script.json")
shutil.copy(p(cfg["voiceover"]["timeline_json"]), pub / "timeline.json")
shutil.copy(p(cfg["subtitles"]["output_json"]), pub / "subtitles.json")
shutil.copy(p(cfg["alignment"]["output_json"]), pub / "words.json")
mix = p(cfg.get("audio", {}).get("mix_output", "build/audio/mix.mp3"))
src = mix if mix.exists() and mix.stat().st_mtime >= p(cfg["voiceover"]["output"]).stat().st_mtime else p(cfg["voiceover"]["output"])
shutil.copy(src, pub / "audio.mp3")  # микс (голос+музыка+SFX), если он свежее озвучки
for s in active_scenes(cfg):
    if s["visual"]["engine"] == "hyperframes" and p(s["visual"]["render"]).exists():
        shutil.copy(p(s["visual"]["render"]), pub / f"hf_{s['id']}.mp4")
print("synced -> graphics/remotion/public/")
