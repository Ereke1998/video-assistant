"""Mix voiceover + music + SFX synced to timeline.json, then mux with rendered frames.
usage: python3 mix.py <frames_dir> <out.mp4>   (run from build/)"""
import json, subprocess, sys

frames, out = sys.argv[1], sys.argv[2]
T = json.load(open('timeline.json'))
END = T['end']

sfx = [('hit', 0.0, .6), ('scratch', T['s1'] + .35, .8), ('pop', T['s1b'] + .1, .6),
       ('blip', T['s2'], .6), ('typing', T['s2'] + .4, .45), ('blip', T['s3'], .6)]
sfx += [('pop', T['s3'] + .25 + k * .3, .5) for k in range(6)]
sfx += [('whoosh', T['scen'] - .15, .6), ('blip', T['scen'], .6), ('blip', T['s4'], .6), ('blip', T['s5'], .6),
        ('riser', T['kod'] - 2.5, .7), ('impact', T['kod'] + .3, .8), ('blip', T['s6'], .6), ('charge', T['s6'] + .2, .5),
        ('ding', T['s6b'] - .1, .8), ('blip', T['s6b'], .5),
        ('pop', T['s6b'] + .3, .6), ('pop', T['s6b'] + .8, .6), ('pop', T['s6b'] + 1.3, .6),
        ('whoosh', T['st'], .6), ('ding', T['s7'] - .5, .5),
        ('whoosh', T['s7'], .7)]
sfx += [('pop', T['s7'] + .3 + k * .25, .5) for k in range(3)] + [('pop', T['pik'], .6)]

ins, f, labels = ['-i', 'audio/vo_kz.mp3', '-i', 'audio/music.mp3'], [], []
for k, (n, t, v) in enumerate(sfx):
    ins += ['-i', f'audio/sfx/{n}.mp3']
    trim = {'typing': ',atrim=0:1.9', 'charge': ',atrim=0:1.6'}.get(n, '')
    ms = int(t * 1000)
    f.append(f'[{k + 3}]aformat=channel_layouts=stereo:sample_rates=44100{trim},volume={v * .2},adelay={ms}|{ms}[s{k}]')
    labels.append(f'[s{k}]')
f.append(f'[1]aformat=channel_layouts=stereo:sample_rates=44100,volume=1.3,adelay=150|150,apad=whole_dur={END},asplit=2[vo][key]')
f.append(f"[2]aformat=channel_layouts=stereo:sample_rates=44100,atrim=0:{END},"
         f"volume='if(between(t,{T['kod'] - .4},{T['kod']}),0,0.10)':eval=frame,afade=t=out:st={END - 2}:d=2[mu]")
# SFX + music bus, ducked under the voice (sidechain) so speech always stays on top
f.append('[mu]' + ''.join(labels) + f'amix=inputs={len(labels) + 1}:normalize=0:duration=longest[bed]')
f.append('[bed][key]sidechaincompress=threshold=0.012:ratio=20:attack=5:release=350:makeup=1[duck]')
f.append(f'[vo][duck]amix=inputs=2:normalize=0:duration=longest,atrim=0:{END},loudnorm=I=-14:TP=-1.5:LRA=9[a]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-i', f'{frames}/f_%05d.jpg', *ins,
                '-filter_complex', ';'.join(f), '-map', '0:v', '-map', '[a]',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-shortest', '-movflags', '+faststart', out], check=True)
print('ok', out)
