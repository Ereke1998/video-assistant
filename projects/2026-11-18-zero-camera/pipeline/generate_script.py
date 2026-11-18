"""Шаг 1. Сборка сценария: хук по формуле + сцены из конфига → build/script.json, script.md, voiceover.md.
Проверяет хронометраж каждой сцены и всего ролика по темпу речи (pace_wps)."""
import json, sys
from common import load_config, p, active_scenes, words_of, tokenize

HOOKS = {
    "ru": {
        "question":     "{topic}: вы точно делаете это правильно?",
        "number":       "{topic}: {n} приёма, которые всё меняют",
        "mistake":      "{topic}: ошибка, которую делают почти все",
        "secret":       "{topic}: то, о чём обычно молчат",
        "before_after": "{topic}: было — так, стало — вот так",
    },
    "kk": {
        "question":     "{topic}: мұны дұрыс істеп жүрсіз бе?",
        "number":       "{topic}: бәрін өзгертетін {n} тәсіл",
        "mistake":      "{topic}: көпшілік жіберетін қате",
        "secret":       "{topic}: көбі айтпайтын құпия",
        "before_after": "{topic}: бұрын — былай, қазір — былай",
    },
}

cfg = load_config(); sc = cfg["script"]; lang = cfg["project"]["language"]
wps = sc["pace_wps"].get(lang, 2.2)
scenes = active_scenes(cfg)
warnings = []
offset = 0  # сквозной индекс слов озвучки (для караоке-заголовков)

for s in scenes:
    if s["role"] == "hook" and not s["voice"].strip():
        if not sc["topic"]:
            sys.exit("script.topic пуст — нечем заполнить хук")
        s["voice"] = HOOKS[lang][sc["hook"]["formula"]].format(topic=sc["topic"], n=sc["hook"]["number"])
    s["tokens"], s["voice_plain"] = tokenize(s["voice"], offset)
    offset += len(words_of(s["voice_plain"]))
    props = s.get("visual", {}).get("props", {})
    if s["role"] == "cta" and "text" in props and not props["text"]:
        props["text"] = cfg["project"]["cta"] or s["voice_plain"]
    if not s["voice"].strip():
        warnings.append(f"[{s['id']}] пустой voice")
    n = len(words_of(s["voice_plain"]))
    s["est_sec"] = round(n / wps, 2)
    if n > sc["max_words_per_scene"]:
        warnings.append(f"[{s['id']}] {n} слов > {sc['max_words_per_scene']} — разбей сцену")
    if s["role"] == "hook" and s["est_sec"] > sc["hook"]["max_sec"]:
        warnings.append(f"[hook] ~{s['est_sec']} с > {sc['hook']['max_sec']} с — сократи хук")

total = round(sum(s["est_sec"] for s in scenes), 1)
target = cfg["project"]["target_duration_sec"]
if abs(total - target) > target * 0.2:
    warnings.append(f"хронометраж ~{total} с vs цель {target} с")

out = {"language": lang, "pace_wps": wps, "est_total_sec": total, "scenes": scenes, "warnings": warnings}
f = p(sc["output_json"]); f.parent.mkdir(parents=True, exist_ok=True)
f.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

t, rows = 0.0, []
for s in scenes:
    rows.append(f"| {int(t//60):02}:{t%60:04.1f} | {s['id']} | {s['role']} | {s['voice'].replace('|', '/')} | "
                f"{s['visual'].get('component', s['visual']['engine'])} · {s.get('mascot', 'idle')} | {', '.join(s.get('sfx', []))} |")
    t += s["est_sec"]
p(sc["output_md"]).write_text(
    f"# Сценарий: {cfg['project']['name']}\n\nТема: {sc['topic']}  \nЦА: {sc['audience']}  \nТон: {sc['tone']}  \n"
    f"Хронометраж (оценка): ~{total} с / цель {target} с\n\n"
    "| Таймкод | Сцена | Роль | Текст (озвучка, разметка акцентов) | Визуал · поза | SFX |\n|---|---|---|---|---|---|\n" + "\n".join(rows) +
    ("\n\n## Предупреждения\n" + "\n".join(f"- {w}" for w in warnings) if warnings else "") + "\n",
    encoding="utf-8")
p(sc["voiceover_md"]).write_text(
    "# Текст под озвучку (TTS)\n\n" + "\n\n".join(f"**{s['id']}** (~{s['est_sec']} с)  \n{s['voice_plain']}" for s in scenes) + "\n",
    encoding="utf-8")
print(f"{len(scenes)} сцен, ~{total} с -> {sc['output_json']}")
for w in warnings: print("⚠", w)
