"""Шаг 1b. Метрики референсов: длительность, число склеек (scene detect), склеек/мин, средняя длина плана.
Результат: references/metrics.json — для заполнения references/analysis.md."""
import json, re
from common import ROOT, run

out = {}
for f in sorted((ROOT / "references/downloads").glob("ref*.mp4")):
    dur = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                     "-of", "csv=p=0", f]).stdout.strip())
    log = run(["ffmpeg", "-hide_banner", "-i", f, "-vf",
               "select='gt(scene,0.3)',showinfo", "-an", "-f", "null", "-"]).stderr
    cuts = [float(x) for x in re.findall(r"pts_time:([\d.]+)", log)]
    out[f.name] = {
        "duration_sec": round(dur, 2),
        "cuts": len(cuts),
        "cuts_per_min": round(len(cuts) / dur * 60, 1) if dur else 0,
        "avg_shot_sec": round(dur / (len(cuts) + 1), 2),
        "cut_times": [round(c, 2) for c in cuts],
        "first_cut_sec": round(cuts[0], 2) if cuts else None,
    }
(ROOT / "references/metrics.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({k: {kk: v[kk] for kk in ("duration_sec", "cuts_per_min", "avg_shot_sec")} for k, v in out.items()},
                 ensure_ascii=False, indent=2))
