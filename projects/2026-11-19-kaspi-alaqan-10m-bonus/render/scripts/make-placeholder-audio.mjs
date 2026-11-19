// Синтез временных заглушек SFX и фонового трека (ffmpeg aevalsrc), чтобы пайплайн собирался целиком.
// Существующие файлы НЕ перезаписываются — положи свои wav/mp3 с теми же именами, и они будут использованы.
//   node scripts/make-placeholder-audio.mjs [--force]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SFX, MUSIC } from '../config/audio.config.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
const R = 'random(0)*2-1';

// type → [выражение, длительность, доп. фильтр]
const GEN = {
  impact:  [`0.9*sin(2*PI*52*t*(1+1.5*exp(-18*t)))*exp(-5*t)+0.35*(${R})*exp(-28*t)`, 1.0, 'lowpass=f=4000'],
  scanner: [`0.35*sin(2*PI*1760*t)*(lt(t,0.07)+between(t,0.12,0.19))+0.12*sin(2*PI*220*t)*exp(-3*t)`, 0.5, ''],
  counter: [`0.5*sin(2*PI*2400*t)*exp(-180*mod(t,0.045))`, 2.4, 'highpass=f=900'],
  whoosh:  [`(${R})*pow(sin(PI*t/0.5),2)*0.7`, 0.5, 'bandpass=f=1400:w=1800,volume=2'],
  pop:     [`0.8*sin(2*PI*(500+1100*exp(-45*t))*t)*exp(-28*t)`, 0.18, ''],
  ding:    [`0.45*sin(2*PI*1318.5*t)*exp(-3.2*t)+0.3*sin(2*PI*1975.5*t)*exp(-4.5*t)+0.15*sin(2*PI*2637*t)*exp(-6*t)`, 1.4, ''],
  notify:  [`0.5*sin(2*PI*if(lt(t,0.11),987.8,1318.5)*t)*exp(-9*mod(t,0.11))`, 0.4, ''],
  miss:    [`0.42*sgn(sin(2*PI*130*t))*(1-t/0.42)+0.25*sin(2*PI*65*t)*exp(-6*t)`, 0.42, 'lowpass=f=1800'],
  cash:    [`0.4*sin(2*PI*2093*t)*exp(-9*t)+gt(t,0.08)*0.45*sin(2*PI*2637*(t-0.08))*exp(-7*(t-0.08))+0.25*(${R})*exp(-40*t)`, 1.0, ''],
  riser:   [`(0.25*sin(2*PI*(180*t+260*t*t))+0.25*(${R}))*pow(t/1.6,2)`, 1.6, 'highpass=f=300'],
};

const synth = (expr, d, af, out) => execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `aevalsrc='${expr}':s=48000:d=${d}`,
  '-af', [af, 'afade=t=out:st=' + Math.max(0, d - 0.03) + ':d=0.03'].filter(Boolean).join(','), '-ac', '1', out]);

mkdirSync(join(ROOT, 'assets/sfx'), { recursive: true });
mkdirSync(join(ROOT, 'assets/music'), { recursive: true });

const files = new Map(SFX.map((s) => [s.file, s.type]));
// гул сканера в хуке — отдельная фактура
const special = { 'assets/sfx/scanner-hum.wav': [`0.25*sin(2*PI*180*t)*(0.6+0.4*sin(2*PI*9*t))*min(1,t*8)+0.06*sin(2*PI*360*t)`, 1.8, 'lowpass=f=1200'] };
for (const [file, type] of files) {
  const out = join(ROOT, file);
  if (existsSync(out) && !force) { console.log('есть  ', file); continue; }
  const [e, d, af] = special[file] || GEN[type];
  synth(e, d, af, out);
  console.log('создан', file);
}

// фоновая заглушка: 112 BPM, кик + хэт + пэд (Am–F–C–G), 40 с
const music = join(ROOT, MUSIC.placeholder);
if (!existsSync(music) || force) {
  const b = 60 / 112;
  const chord = (n) => `if(lt(mod(t,${8 * b}),${2 * b}),${n[0]},if(lt(mod(t,${8 * b}),${4 * b}),${n[1]},if(lt(mod(t,${8 * b}),${6 * b}),${n[2]},${n[3]})))`;
  const root = chord([110, 87.31, 130.81, 98]), third = chord([130.81, 110, 164.81, 123.47]), fifth = chord([164.81, 130.81, 196, 146.83]);
  const pad = `0.10*(sin(2*PI*${root}*t)+sin(2*PI*${third}*2*t)*0.7+sin(2*PI*${fifth}*2*t)*0.6)`;
  const kick = `0.8*sin(2*PI*48*mod(t,${b})*(1+2*exp(-30*mod(t,${b}))))*exp(-9*mod(t,${b}))`;
  const hat = `0.12*(${R})*exp(-70*mod(t+${b / 2},${b}))`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `aevalsrc='${pad}+${kick}+${hat}':s=48000:d=40`,
    '-af', 'lowpass=f=9000,alimiter=limit=0.9', '-ac', '2', music]);
  console.log('создан', MUSIC.placeholder);
}
