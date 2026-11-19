#!/usr/bin/env python3
"""Склейка озвучки сцен в public/audio/voiceover.mp3 (32 c) и запись реальных
пословных таймингов (из alignment ElevenLabs) в src/data/script.ts (CHUNKS + WORDS)."""
import json, os, re, subprocess

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FPS = 60
# сцена: (старт в ролике, ускорение atempo)
PLACE = {'hook': (0.08, 1.15), 'dust': (3.15, 1.03), 'thermal': (10.05, 1.06), 'solution': (18.1, 1.06), 'brand': (26.05, 1.2)}
ORDER = ['hook', 'dust', 'thermal', 'solution', 'brand']

def words_from_alignment(al):
    chars, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    out, cur, s0, e0 = [], '', None, None
    for c, s, e in zip(chars, st, en):
        if c.isspace():
            if cur:
                out.append((cur, s0, e0))
            cur, s0 = '', None
            continue
        if s0 is None:
            s0 = s
        cur += c
        e0 = e
    if cur:
        out.append((cur, s0, e0))
    return [w for w in out if not re.fullmatch(r'[—–-]+', w[0])]

# 1) аудио
inputs, filters = [], []
for i, sid in enumerate(ORDER):
    start, tempo = PLACE[sid]
    inputs += ['-i', os.path.join(ROOT, 'public/audio/vo', f'{sid}.mp3')]
    ms = int(start * 1000)
    filters.append(f'[{i}:a]atempo={tempo},adelay={ms}|{ms},aresample=48000[a{i}]')
mix = ''.join(f'[a{i}]' for i in range(len(ORDER))) + f'amix=inputs={len(ORDER)}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad=whole_dur=32,atrim=0:32[out]'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(filters) + ';' + mix,
                '-map', '[out]', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '192k',
                os.path.join(ROOT, 'public/audio/voiceover.mp3')], check=True)

# 2) тайминги: сопоставляем слова диктора со словами субтитров по порядку внутри сцены
script_path = os.path.join(ROOT, 'src/data/script.ts')
src = open(script_path, encoding='utf8').read()
chunk_re = re.compile(r"\{text: '([^']*)', from: [\d.]+, to: [\d.]+, scene: '(\w+)'\}")
chunks = [(m.group(1), m.group(2)) for m in chunk_re.finditer(src)]

timed = {}
for sid in ORDER:
    al = json.load(open(os.path.join(ROOT, 'out/vo', f'{sid}.json'), encoding='utf8'))['alignment']
    start, tempo = PLACE[sid]
    timed[sid] = [(w, start + s / tempo, start + e / tempo) for w, s, e in words_from_alignment(al)]

words_out, chunks_out = [], []
for sid in ORDER:
    disp = [(t, ci) for ci, (txt, sc) in enumerate(chunks) if sc == sid for t in txt.split() if not re.fullmatch(r'[—–-]+', t)]
    tw = timed[sid]
    assert len(disp) == len(tw), (sid, len(disp), len(tw), [d[0] for d in disp], [t[0] for t in tw])
    for (t, ci), (_, s, e) in zip(disp, tw):
        words_out.append((t, s, e, sid, ci))

# начало фразы = начало первого слова; конец = начало следующей фразы (или конец последнего слова + 0.3)
by_chunk = {}
for t, s, e, sid, ci in words_out:
    by_chunk.setdefault(ci, []).append((s, e))
for ci, (txt, sid) in enumerate(chunks):
    s = by_chunk[ci][0][0]
    nxt = by_chunk.get(ci + 1)
    last_e = by_chunk[ci][-1][1]
    end = nxt[0][0] if nxt and chunks[ci + 1][1] == sid else last_e + 0.3
    chunks_out.append((txt, round(s - 0.03, 2), round(end - 0.03, 2), sid))

for i in range(len(words_out)):
    t, s, e, sid, ci = words_out[i]
    nxt = words_out[i + 1][1] if i + 1 < len(words_out) and words_out[i + 1][3] == sid else e + 0.25
    words_out[i] = (t, s, max(e, nxt), sid, ci)

# без наложений между фразами; последняя — не дольше 30.9 с
for i in range(len(chunks_out)):
    t, a, b, sc = chunks_out[i]
    lim = chunks_out[i + 1][1] if i + 1 < len(chunks_out) else 30.9
    chunks_out[i] = (t, a, round(min(b, lim), 2), sc)

chunk_lit = 'export const CHUNKS: Chunk[] = [\n' + '\n'.join(
    f"  {{text: '{t}', from: {a}, to: {b}, scene: '{sc}'}}," for t, a, b, sc in chunks_out) + '\n];'
word_lit = 'export const WORDS: Word[] = [\n' + '\n'.join(
    f"  {{text: {json.dumps(t, ensure_ascii=False)}, start: {round(s * FPS)}, end: {round(e * FPS)}, scene: '{sid}'}}," for t, s, e, sid, _ in words_out) + '\n];'
src = re.sub(r'export const CHUNKS: Chunk\[\] = \[[\s\S]*?\n\];', chunk_lit, src)
src = re.sub(r'(// <WORDS:BEGIN>\n)[\s\S]*?(\n// <WORDS:END>)', lambda m: m.group(1) + word_lit + m.group(2), src)
src = src.replace('export const TIMINGS_ARE_PRELIMINARY = true;', 'export const TIMINGS_ARE_PRELIMINARY = false;')
src = src.replace('// Тайминги фраз по раскадровке v3 (предварительные — без озвучки).', '// Тайминги фраз — по реальной озвучке ElevenLabs (scripts/build_voiceover.py).')
open(script_path, 'w', encoding='utf8').write(src)
print('voiceover.mp3 ok;', len(words_out), 'words;', 'last chunk', chunks_out[-1])
for c in chunks_out: print(c)
