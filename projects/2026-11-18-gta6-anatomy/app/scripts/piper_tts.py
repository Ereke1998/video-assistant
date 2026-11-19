#!/usr/bin/env python3
"""
Локальный русский TTS (Piper). Синтез по предложениям с управляемыми паузами.

  python3 scripts/piper_tts.py --model models/ru-irinia-medium.onnx --text-file act1.txt --out act1.wav \
      --length-scale 1.08 --pause 0.32 --pause-question 0.45 --pause-comma 0.0

Ударение можно задать вручную знаком «+» перед ударной гласной: «зам+ок».
"""
import argparse
import re
import wave

import numpy as np
from piper import PiperVoice, SynthesisConfig

ap = argparse.ArgumentParser()
ap.add_argument('--model', required=True)
ap.add_argument('--text-file', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--length-scale', type=float, default=1.0)
ap.add_argument('--noise-scale', type=float, default=0.5)
ap.add_argument('--noise-w', type=float, default=0.7)
ap.add_argument('--pause', type=float, default=0.32, help='пауза после . и !')
ap.add_argument('--pause-question', type=float, default=0.42)
ap.add_argument('--pause-colon', type=float, default=0.22)
args = ap.parse_args()

text = open(args.text_file, encoding='utf-8').read().strip()
# «+» перед гласной -> комбинируемое ударение U+0301 после гласной (понимает espeak-ng)
text = re.sub(r'\+([аеёиоуыэюяАЕЁИОУЫЭЮЯ])', lambda m: m.group(1) + '́', text)

voice = PiperVoice.load(args.model)
cfg = SynthesisConfig(length_scale=args.length_scale, noise_scale=args.noise_scale, noise_w_scale=args.noise_w)
sr = voice.config.sample_rate

# режем на фразы по . ! ? : — чтобы управлять паузами
parts = re.findall(r'[^.!?:]+[.!?:]*', text)
audio = []
for p in parts:
    p = p.strip()
    if not p:
        continue
    for chunk in voice.synthesize(p, syn_config=cfg):
        audio.append(chunk.audio_float_array)
    end = p[-1]
    pause = args.pause_question if end == '?' else args.pause_colon if end == ':' else args.pause
    audio.append(np.zeros(int(sr * pause), dtype=np.float32))

pcm = np.clip(np.concatenate(audio), -1, 1)
lead = np.zeros(int(sr * 0.05), dtype=np.float32)
pcm = np.concatenate([lead, pcm])
with wave.open(args.out, 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes((pcm * 32767).astype(np.int16).tobytes())
print(f'{args.out}: {len(pcm) / sr:.2f} s')
