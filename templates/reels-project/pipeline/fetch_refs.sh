#!/usr/bin/env bash
# Шаг 1. Скачивание референсов (3–5 ссылок) через yt-dlp.
# Использование: pipeline/fetch_refs.sh URL1 URL2 ...   (или без аргументов — из project.config.json)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=references/downloads
mkdir -p "$OUT"
if [ $# -eq 0 ]; then
  mapfile -t URLS < <(python3 -c 'import json;[print(u) for u in json.load(open("project.config.json"))["references"]["urls"]]')
else
  URLS=("$@")
fi
[ ${#URLS[@]} -eq 0 ] && { echo "Нет ссылок: добавь references.urls в project.config.json"; exit 1; }
i=1
for u in "${URLS[@]}"; do
  yt-dlp -f "bv*[height<=1920]+ba/b" --merge-output-format mp4 \
    --write-info-json --write-auto-subs --sub-langs "ru,kk,en" \
    -o "$OUT/ref$(printf %02d $i).%(ext)s" "$u"
  i=$((i+1))
done
python3 pipeline/analyze_refs.py
