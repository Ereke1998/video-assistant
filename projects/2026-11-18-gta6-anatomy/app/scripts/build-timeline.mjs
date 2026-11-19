#!/usr/bin/env node
/**
 * Собирает src/data/timeline.generated.json из src/data/script.ts + озвучки.
 *
 *  - если есть public/audio/actN.mp3 + actN.alignment.json (ElevenLabs with-timestamps) —
 *    тайминги слов берутся из них (точная синхронизация);
 *  - иначе тайминги оцениваются по темпу речи (черновой режим, удобно для Remotion Studio).
 *
 * Флаги/ENV:
 *   ALIGN_TO_PLAN=1  — акт не начинается раньше плановой точки из ТЗ (может дать паузы);
 *   по умолчанию акты идут встык (плотный темп, как в Reels).
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ACTS, PROJECT, SFX_MIX} from '../src/data/script.ts';
import {parseMarkup, findCue} from '../src/data/markup.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'src/data/timeline.generated.json');
const ALIGN_TO_PLAN = process.env.ALIGN_TO_PLAN === '1';

const CUE_PREROLL = 0.08; // визуал чуть раньше слова — так воспринимается синхроннее

const r3 = (x) => Math.round(x * 1000) / 1000;

function probeDuration(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    return parseFloat(out.toString().trim());
  } catch {
    return null;
  }
}

function wordTimesFromAlignment(parsed, alignment) {
  const st = alignment.character_start_times_seconds;
  const en = alignment.character_end_times_seconds;
  const chars = alignment.characters.join('');
  if (chars !== parsed.spoken) {
    throw new Error('Текст в alignment не совпадает с текстом акта — перегенерируйте озвучку (npm run voice -- --force)');
  }
  return parsed.spokenWords.map((w) => ({start: st[w.charStart], end: en[w.charEnd]}));
}

function wordTimesEstimated(parsed) {
  let t = 0;
  return parsed.spokenWords.map((w) => {
    const len = 0.06 + w.text.replace(/[^\p{L}\p{N}]/gu, '').length * 0.045;
    const start = t;
    const end = t + len;
    t = end + (/[.?!:]$/.test(w.text) ? 0.35 : /[,—]$/.test(w.text) ? 0.15 : 0.04);
    return {start, end};
  });
}

function buildChunks(words) {
  // 3–5 слов на экран; разрыв на конце фразы, на запятой при >=2 словах, на паузе > 0.45 с
  const chunks = [];
  let cur = [];
  const flush = () => {
    if (cur.length) chunks.push(cur);
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (cur.length && prev && w.start - prev.end > 0.45) flush();
    cur.push(i);
    const letters = cur.reduce((n, k) => n + words[k].text.length, 0);
    if (/[.?!:]$/.test(w.text)) flush();
    else if (/[,;]$/.test(w.text) && cur.length >= 2) flush();
    else if (cur.length >= 4 || letters > 24) flush();
  });
  flush();
  return chunks.map((idx, ci) => {
    const first = words[idx[0]];
    const last = words[idx[idx.length - 1]];
    const nextChunkFirst = chunks[ci + 1] ? words[chunks[ci + 1][0]] : null;
    let end = last.end + 0.25;
    if (nextChunkFirst) end = Math.min(end, nextChunkFirst.start);
    return {start: first.start, end: r3(end), words: idx};
  });
}

function listFiles(dir, exts) {
  if (!fs.existsSync(dir)) return {};
  const res = {};
  for (const f of fs.readdirSync(dir)) {
    const ext = path.extname(f).toLowerCase();
    if (exts.includes(ext)) res[path.basename(f, path.extname(f))] = f;
  }
  return res;
}

export function buildTimeline({quiet = false} = {}) {
  const log = quiet ? () => {} : console.log;
  const sfxFiles = listFiles(path.join(PUB, 'sfx'), ['.mp3', '.wav']);
  const footage = listFiles(path.join(PUB, 'footage'), ['.mp4', '.mov', '.webm']);
  const musicFile = ['music.mp3', 'music.wav'].find((f) => fs.existsSync(path.join(PUB, 'audio', f)));

  const acts = [];
  const words = [];
  const scenes = [];
  const sfx = [];
  const missingSfx = new Set();
  let cursor = 0;
  let estimated = false;

  for (const act of ACTS) {
    const parsed = parseMarkup(act.text);
    const audioRel = `audio/act${act.id}.mp3`;
    const audioAbs = path.join(PUB, audioRel);
    const alignAbs = path.join(PUB, `audio/act${act.id}.alignment.json`);

    let spokenTimes;
    let audioDur;
    let hasAudio = false;
    if (fs.existsSync(audioAbs) && fs.existsSync(alignAbs)) {
      const al = JSON.parse(fs.readFileSync(alignAbs, 'utf8'));
      spokenTimes = wordTimesFromAlignment(parsed, al.alignment);
      audioDur = probeDuration(audioAbs) ?? spokenTimes[spokenTimes.length - 1].end;
      hasAudio = true;
    } else {
      spokenTimes = wordTimesEstimated(parsed);
      audioDur = spokenTimes[spokenTimes.length - 1].end + 0.2;
      estimated = true;
    }

    const start = ALIGN_TO_PLAN ? Math.max(cursor, act.plannedStart) : cursor;
    const voiceStart = start + act.leadIn;
    const lastWordEnd = voiceStart + spokenTimes[spokenTimes.length - 1].end;
    const end = Math.max(voiceStart + audioDur, lastWordEnd) + act.tail;

    // слова (в разрезе субтитров)
    const firstWordIdx = words.length;
    const actWords = parsed.tokens.map((t) => ({
      text: t.display,
      norm: t.norm,
      start: r3(voiceStart + spokenTimes[t.spokenStart].start),
      end: r3(voiceStart + spokenTimes[t.spokenEnd].end),
      act: act.id,
      keyword: act.keywords.some((k) => t.norm === k || t.norm.startsWith(k)),
    }));
    words.push(...actWords);

    const resolve = (cue, from, label) => {
      if (cue === '@start') return {time: start, idx: from};
      const i = findCue(parsed.tokens, cue, from);
      if (i < 0) throw new Error(`Акт ${act.id}: cue «${cue}» (${label}) не найден в тексте`);
      return {time: Math.max(start, actWords[i].start - CUE_PREROLL), idx: i};
    };

    let from = 0;
    const actScenes = act.scenes.map((s) => {
      const r = resolve(s.cue, from, s.id);
      from = r.idx;
      return {s, startTime: r.time, cueIdx: r.idx};
    });

    actScenes.forEach(({s, startTime, cueIdx}, k) => {
      const endTime = k + 1 < actScenes.length ? actScenes[k + 1].startTime : end;
      const marks = {};
      for (const [key, phrase] of Object.entries(s.marks ?? {})) {
        const r = resolve(phrase, cueIdx, `${s.id}.marks.${key}`);
        marks[key] = r3(r.time - startTime);
      }
      scenes.push({
        id: s.id,
        type: s.type,
        act: act.id,
        start: r3(startTime),
        end: r3(endTime),
        props: s.props ?? {},
        marks,
      });
      for (const fx of s.sfx ?? []) {
        const base = fx.cue ? resolve(fx.cue, cueIdx, `${s.id}.sfx`).time : startTime;
        const t = Math.max(0, base + (fx.offset ?? 0));
        if (!sfxFiles[fx.name]) {
          missingSfx.add(fx.name);
          continue;
        }
        sfx.push({name: fx.name, file: `sfx/${sfxFiles[fx.name]}`, time: r3(t), volume: r3((fx.volume ?? 0.8) * (SFX_MIX[fx.name] ?? 1))});
      }
    });

    acts.push({
      id: act.id,
      roman: act.roman,
      title: act.title,
      start: r3(start),
      end: r3(end),
      voiceStart: r3(voiceStart),
      audio: hasAudio ? audioRel : null,
      plannedStart: act.plannedStart,
      plannedEnd: act.plannedEnd,
      firstWord: firstWordIdx,
      lastWord: words.length - 1,
    });
    cursor = end;
  }

  const chunks = buildChunks(words);
  const duration = r3(cursor);

  const timeline = {
    generatedAt: new Date().toISOString(),
    estimated,
    fps: PROJECT.fps,
    width: PROJECT.width,
    height: PROJECT.height,
    duration,
    music: musicFile ? `audio/${musicFile}` : null,
    footage,
    acts,
    scenes,
    words,
    chunks,
    sfx,
  };
  fs.writeFileSync(OUT, JSON.stringify(timeline, null, 1));

  const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  log(`\nТаймлайн → ${path.relative(ROOT, OUT)} ${estimated ? '(ЧЕРНОВИК: оценка без озвучки)' : '(по озвучке)'}`);
  log('Акт | План          | Факт          | Δ конца');
  for (const a of acts) {
    log(
      ` ${a.roman.padEnd(3)}| ${fmt(a.plannedStart)}–${fmt(a.plannedEnd)} | ${fmt(a.start)}–${fmt(a.end)} | ${(a.end - a.plannedEnd >= 0 ? '+' : '') + (a.end - a.plannedEnd).toFixed(1)} с`,
    );
  }
  log(`Итого: ${fmt(duration)} (${duration} с), сцен: ${scenes.length}, SFX: ${sfx.length}, субтитров: ${chunks.length}`);
  if (missingSfx.size) log(`⚠ Нет файлов SFX: ${[...missingSfx].join(', ')} → npm run sfx или положите public/sfx/<name>.mp3`);
  if (!musicFile) log('⚠ Нет фоновой музыки: public/audio/music.mp3 (npm run sfx сгенерирует луп)');
  log(`Футаж: ${Object.keys(footage).length ? Object.keys(footage).join(', ') : 'нет (используется моушн-графика)'}`);
  return timeline;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildTimeline();
}
