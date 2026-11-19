#!/usr/bin/env python3
"""Озвучка сцен через ElevenLabs (with-timestamps): public/audio/vo/<scene>.mp3 + out/vo/<scene>.json.
Ключ API подставляет прокси окружения; локально задайте ELEVENLABS_API_KEY."""
import base64, json, os, sys, urllib.request

VOICE = os.environ.get('VOICE_ID', 'LmV7j80HF5QYSKe3sDtR')  # Mark Rubins
MODEL = 'eleven_multilingual_v2'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

# Текст для диктора (числа и бренд — словами, чтобы читались правильно)
SCENES = {
    'hook': 'Твой ноутбук прямо сейчас задыхается — и ты сам его убиваешь!',
    'dust': 'За год внутри скапливается плотный слой пыли. Она работает как одеяло — горячий воздух просто не выходит.',
    'thermal': 'Старая термопаста превращается в камень, а термопрокладки рассыпаются. Чип перегревается: ноутбук шумит, тормозит и может просто сгореть.',
    'solution': 'Профессиональная чистка, свежая термопаста и новые термопрокладки снижают нагрев на двадцать-тридцать градусов. Ноутбук снова тихий и быстрый!',
    'brand': 'Не жди дорогого ремонта. Всё это делают мастера Прайм Ай-Ти — быстро и с гарантией. Пиши в директ!',
}

def tts(text):
    body = json.dumps({
        'text': text,
        'model_id': MODEL,
        'voice_settings': {'stability': 0.38, 'similarity_boost': 0.8, 'style': 0.45, 'use_speaker_boost': True, 'speed': 1.15},
    }).encode()
    req = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128',
        data=body, method='POST',
        headers={'Content-Type': 'application/json', 'xi-api-key': os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)

only = sys.argv[1:] or list(SCENES)
for sid in only:
    d = tts(SCENES[sid])
    open(os.path.join(ROOT, 'public/audio/vo', f'{sid}.mp3'), 'wb').write(base64.b64decode(d['audio_base64']))
    al = d.get('normalized_alignment') or d['alignment']
    json.dump({'text': SCENES[sid], 'alignment': d['alignment']}, open(os.path.join(ROOT, 'out/vo', f'{sid}.json'), 'w'), ensure_ascii=False)
    end = d['alignment']['character_end_times_seconds'][-1]
    print(sid, f'{end:.2f}s')
