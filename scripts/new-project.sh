#!/usr/bin/env bash
# Создаёт projects/<YYYY-MM-DD>-<name>/ из шаблона. Использование: scripts/new-project.sh my-project [ru|kk]
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${1:?укажи название латиницей через дефис}"; LANG_="${2:-ru}"
DIR="projects/$(date +%F)-$NAME"
[ -e "$DIR" ] && { echo "Уже существует: $DIR"; exit 1; }
cp -r templates/reels-project "$DIR"
python3 - "$DIR" "$NAME" "$LANG_" <<'PY'
import json, sys, datetime
d, name, lang = sys.argv[1:]
f = f"{d}/project.config.json"; c = json.load(open(f, encoding="utf-8"))
c["project"].update(name=name, date=str(datetime.date.today()), language=lang)
c["whisper"]["language"] = "kk" if lang == "kk" else "ru"
json.dump(c, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
PY
echo "$DIR"
