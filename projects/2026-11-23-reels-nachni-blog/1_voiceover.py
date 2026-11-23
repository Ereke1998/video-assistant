"""ШАГ 2. Озвучка через ElevenLabs (ПЛАТНО: 1 символ текста = 1 кредит).

Что делает:
  1. Озвучивает каждую фразу из project.json отдельно.
  2. Склеивает фразы с паузами в audio/voiceover.wav (+ voiceover.mp3 для прослушивания).
  3. Сохраняет время каждого слова в audio/timings.json (нужно для субтитров и сцен).

Повторно уже озвученные фразы НЕ оплачиваются: если текст и настройки фразы
не менялись, берётся готовый файл из audio/phrases/.

Запуск:
  python 1_voiceover.py            — озвучить то, чего ещё нет (спросит подтверждение)
  python 1_voiceover.py --redo 4   — переозвучить только фразу 4
  python 1_voiceover.py --yes      — не спрашивать подтверждение
"""
import argparse
import base64
import re

import requests

from common import (AUDIO, PHRASES_DIR, TIMINGS_FILE, ask_yes, check_tools, fail, fmt,
                    get_key, load_json, load_project, media_duration, run, save_json)

TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps"
SUB_URL = "https://api.elevenlabs.io/v1/user/subscription"


def phrase_files(pid):
    return PHRASES_DIR / f"phrase_{pid:02d}.mp3", PHRASES_DIR / f"phrase_{pid:02d}.json"


def is_up_to_date(phrase, voice):
    mp3, meta = phrase_files(phrase["id"])
    if not (mp3.exists() and meta.exists()):
        return False
    m = load_json(meta)
    return (m.get("text") == phrase["text"] and m.get("voice_id") == voice["voice_id"]
            and m.get("model_id") == voice["model_id"] and m.get("settings") == voice["settings"])


def credits_left(key):
    try:
        r = requests.get(SUB_URL, headers={"xi-api-key": key}, timeout=30)
        d = r.json()
        return d["character_limit"] - d["character_count"]
    except Exception:
        return None


def generate(phrase, voice, key):
    r = requests.post(
        TTS_URL.format(voice_id=voice["voice_id"]),
        params={"output_format": voice["output_format"]},
        headers={"xi-api-key": key},
        json={"text": phrase["text"], "model_id": voice["model_id"],
              "voice_settings": voice["settings"]},
        timeout=180,
    )
    if r.status_code != 200:
        fail(f"ElevenLabs ответил ошибкой {r.status_code}: {r.text[:500]}")
    data = r.json()
    mp3, meta = phrase_files(phrase["id"])
    mp3.parent.mkdir(parents=True, exist_ok=True)
    mp3.write_bytes(base64.b64decode(data["audio_base64"]))
    save_json(meta, {
        "text": phrase["text"], "voice_id": voice["voice_id"], "model_id": voice["model_id"],
        "settings": voice["settings"],
        "alignment": data.get("alignment") or data.get("normalized_alignment"),
    })


def words_with_times(text, alignment):
    """Время начала и конца каждого слова по посимвольной разметке ElevenLabs."""
    chars = alignment["characters"]
    starts = alignment["character_start_times_seconds"]
    ends = alignment["character_end_times_seconds"]
    same = "".join(chars) == text

    def idx(i):  # позиция символа текста → позиция в разметке
        return i if same else min(len(chars) - 1, round(i * len(chars) / len(text)))

    words = []
    for m in re.finditer(r"\S+", text):
        letters = [i for i in range(m.start(), m.end()) if text[i].isalnum()]
        if not letters:  # тире и т.п. — приклеиваем к предыдущему слову
            continue
        words.append({"text": m.group(), "start": starts[idx(letters[0])],
                      "end": ends[idx(letters[-1])]})
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--redo", type=int, nargs="*", default=[], help="номера фраз для переозвучки")
    ap.add_argument("--yes", action="store_true", help="не спрашивать подтверждение")
    args = ap.parse_args()

    check_tools()
    project = load_project()
    voice, timing, phrases = project["voice"], project["timing"], project["phrases"]
    key = get_key("ELEVENLABS_API_KEY")

    todo = [p for p in phrases if p["id"] in args.redo or not is_up_to_date(p, voice)]
    if todo:
        cost = sum(len(p["text"]) for p in todo)
        left = credits_left(key)
        print(f"Нужно озвучить фраз: {len(todo)} (№ {', '.join(str(p['id']) for p in todo)})")
        print(f"Стоимость: ~{cost} кредитов ElevenLabs" + (f", на балансе: {left}" if left else ""))
        if not ask_yes("Продолжить?", args.yes):
            fail("Остановлено, ничего не потрачено.")
        for p in todo:
            print(f"  🎙  фраза {p['id']}: {p['text']}")
            generate(p, voice, key)
        left_after = credits_left(key)
        if left_after is not None:
            print(f"Готово. Осталось кредитов: {left_after}")
    else:
        print("Все фразы уже озвучены, ничего не тратим. Пересобираю общий файл…")

    # --- Склейка фраз с паузами ---
    lead, tail = timing["lead_in_sec"], timing["tail_sec"]
    cmd, filters, result = ["ffmpeg", "-y"], [], []
    t = lead
    for k, p in enumerate(phrases):
        mp3, meta = phrase_files(p["id"])
        words = words_with_times(p["text"], load_json(meta)["alignment"])
        dur = media_duration(mp3)
        s = max(0.0, words[0]["start"] - 0.05)       # чуть до первого слова
        e = min(dur, words[-1]["end"] + 0.25)         # чуть после последнего
        last = k == len(phrases) - 1
        pause = 0.0 if last else p.get("pause_after", timing["default_pause_sec"])
        cmd += ["-i", mp3]
        filters.append(f"[{k}:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,"
                       f"aresample=48000,aformat=channel_layouts=mono,apad=pad_dur={pause:.3f}[a{k}]")
        abs_words = [{"text": w["text"], "start": round(t + w["start"] - s, 3),
                      "end": round(t + w["end"] - s, 3)} for w in words]
        result.append({"id": p["id"], "text": p["text"],
                       "start": abs_words[0]["start"], "end": abs_words[-1]["end"],
                       "words": abs_words})
        t += (e - s) + pause
    total = t + tail
    chain = "".join(f"[a{k}]" for k in range(len(phrases)))
    filters.append(f"{chain}concat=n={len(phrases)}:v=0:a=1,"
                   f"adelay={int(lead * 1000)}:all=1,apad=pad_dur={tail:.3f},"
                   f"atrim=end={total:.3f}[out]")
    AUDIO.mkdir(exist_ok=True)
    wav, mp3_out = AUDIO / "voiceover.wav", AUDIO / "voiceover.mp3"
    run(cmd + ["-filter_complex", ";".join(filters), "-map", "[out]", "-c:a", "pcm_s16le", wav])
    run(["ffmpeg", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "192k", mp3_out])
    total = media_duration(wav)
    save_json(TIMINGS_FILE, {"total": round(total, 3), "phrases": result})

    # --- Отчёт ---
    print("\n№  | Начало   | Конец    | Длит.  | Фраза")
    print("---+----------+----------+--------+------")
    lines = ["# Озвучка\n", f"Голос: {voice['voice_name']} · модель {voice['model_id']}\n",
             "| № | Начало | Конец | Длительность | Фраза |", "|---|---|---|---|---|"]
    for r in result:
        d = r["end"] - r["start"]
        print(f"{r['id']:<2} | {fmt(r['start'])} | {fmt(r['end'])} | {d:5.2f}с | {r['text']}")
        lines.append(f"| {r['id']} | {fmt(r['start'])} | {fmt(r['end'])} | {d:.2f} с | {r['text']} |")
    print(f"\nОбщая длина озвучки (с паузами и хвостом): {total:.2f} сек")
    lines.append(f"\n**Общая длина:** {total:.2f} сек\n")
    (AUDIO.parent / "voiceover.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Файл для прослушивания: {mp3_out}")


if __name__ == "__main__":
    main()
