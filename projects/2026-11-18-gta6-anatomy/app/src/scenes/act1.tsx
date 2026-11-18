import React from 'react';
import {interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_BODY, FONT_DISPLAY, glow} from '../theme';
import {NeonBox, NeonText, Pill, PopIn, SceneProps, Stage, useProgress, useSpringIn, fit} from '../components/ui';
import {Calendar, Console, Desk} from '../components/icons';
import {Footage} from '../components/Overlay';

/** 3-2-1 крупными красными цифрами */
export const Countdown: React.FC<SceneProps<{from: number}>> = ({from = 3, dur}) => {
  const frame = useCurrentFrame();
  const step = dur / from;
  const idx = Math.min(from - 1, Math.floor(frame / step));
  const local = frame - idx * step;
  const k = local / step;
  const n = from - idx;
  const red = '#ff1f3d';
  return (
    <Stage>
      <div style={{position: 'absolute', width: 760, height: 760, borderRadius: 380, border: `10px solid ${red}`, opacity: 0.6 * (1 - k), transform: `scale(${0.6 + k * 0.7})`, boxShadow: glow(red)}} />
      <div style={{position: 'absolute', width: 600, height: 600}}>
        <svg width={600} height={600} viewBox="0 0 100 100" style={{transform: 'rotate(-90deg)'}}>
          <circle cx="50" cy="50" r="44" stroke={red} strokeWidth="3" fill="none" strokeDasharray={`${276 * (1 - k)} 276`} style={{filter: `drop-shadow(0 0 3px ${red})`}} />
        </svg>
      </div>
      <NeonText color={red} size={440} fill={red} glowK={1.6} style={{transform: `scale(${1.35 - 0.35 * Math.min(1, k * 3)})`, opacity: 1 - Math.max(0, k - 0.8) * 4}}>
        {n}
      </NeonText>
    </Stage>
  );
};

export const Hook: React.FC<SceneProps<{title: string; accent: string; sub: string}>> = ({title, accent, sub, theme}) => {
  const frame = useCurrentFrame();
  const s = useSpringIn(0, {damping: 9, stiffness: 220});
  const flicker = frame < 10 && frame % 3 === 0 ? 0.6 : 1;
  return (
    <Stage>
      <div style={{transform: `scale(${2.2 - 1.2 * s})`, opacity: Math.min(1, s * 2) * flicker}}>
        <NeonText color="#ff4fa0" size={250} fill="#ffe3f1" glowK={1.4}>
          {title}
        </NeonText>
      </div>
      <PopIn at={6} from={1.8}>
        <NeonText color={theme.a} size={150} fill={theme.b} glowK={1.2}>
          {accent}
        </NeonText>
      </PopIn>
      <PopIn at={12} y={60}>
        <Pill color={theme.a} filled size={52}>
          {sub}
        </Pill>
      </PopIn>
    </Stage>
  );
};

export const YearsJump: React.FC<SceneProps<{from: number; to: number; label: string}>> = ({from, to, label, marks, theme}) => {
  const frame = useCurrentFrame();
  const land = marks.big ?? 30;
  const p = useProgress(4, land, (x) => 1 - Math.pow(1 - x, 3));
  const n = Math.round(p * (to - from));
  const landed = frame >= land;
  const pulse = landed ? 1 + 0.06 * Math.exp(-(frame - land) / 6) * Math.sin((frame - land) * 1.2) + 0.04 * Math.exp(-(frame - land) / 5) : 1;
  return (
    <Stage>
      <PopIn y={-60}>
        <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
          <NeonText color={theme.a} size={110}>{from}</NeonText>
          <NeonText color={theme.a} size={90} fill={theme.a}>→</NeonText>
          <NeonText color={theme.b} size={110} fill={theme.b}>{to}</NeonText>
        </div>
      </PopIn>
      <div style={{width: 860, height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.12)', position: 'relative'}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p * 100}%`, background: theme.a, borderRadius: 7, boxShadow: glow(theme.a, 0.6)}} />
        <div style={{position: 'absolute', left: `calc(${p * 100}% - 20px)`, top: -13, width: 40, height: 40, borderRadius: 20, background: '#fff', boxShadow: glow(theme.a)}} />
      </div>
      <div style={{transform: `scale(${pulse})`}}>
        <NeonText color={theme.a} size={420} fill={landed ? theme.b : '#fff'} glowK={landed ? 1.5 : 0.8}>
          {n}
        </NeonText>
      </div>
      <PopIn at={land}>
        <Pill color={theme.a} size={48}>{label}</Pill>
      </PopIn>
    </Stage>
  );
};

export const Generations: React.FC<SceneProps<{label: string; items: {name: string; year: string; old?: boolean}[]}>> = ({label, items, theme}) => {
  const frame = useCurrentFrame();
  return (
    <Stage style={{gap: 30}}>
      <PopIn y={-40}>
        <NeonText color={theme.a} size={fit(label, 980, 86, 0.92)}>
          <span style={{color: theme.b}}>{label.split(' ')[0]}</span> {label.split(' ').slice(1).join(' ')}
        </NeonText>
      </PopIn>
      {items.map((it, i) => {
        const at = 8 + i * 8;
        const strike = interpolate(frame, [at + 14, at + 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return (
          <PopIn key={i} at={at} y={80}>
            <NeonBox color={it.old ? '#777' : i === items.length - 1 ? theme.b : theme.a} style={{width: 840, height: 190, flexDirection: 'row', gap: 40, opacity: it.old ? 0.55 : 1, position: 'relative'}}>
              <Console size={130} color={it.old ? '#aaa' : theme.a} />
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: 560}}>
                <div style={{fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 58, color: '#fff'}}>{it.name}</div>
                <div style={{fontFamily: FONT_BODY, fontWeight: 900, fontSize: 38, color: it.old ? '#aaa' : theme.b}}>{it.year}</div>
              </div>
              {it.old ? (
                <div style={{position: 'absolute', left: 40, right: 40, top: 89, height: 10, background: theme.a, transformOrigin: 'left', transform: `scaleX(${strike}) rotate(-4deg)`, boxShadow: glow(theme.a, 0.5)}} />
              ) : null}
            </NeonBox>
          </PopIn>
        );
      })}
    </Stage>
  );
};

/** Ликующая толпа + чат стримера (fallback, если нет футажа crowd) */
export const Crowd: React.FC<SceneProps<{label: string; clip?: string}>> = ({label, clip, footage, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const people = Array.from({length: 34}).map((_, i) => {
    const row = i % 3;
    const x = ((i * 97) % 1000) + 40;
    const jump = Math.max(0, Math.sin(t * (7 + random(`j${i}`) * 3) + i)) * (26 + row * 10);
    return {x, row, jump, arms: Math.sin(t * 8 + i) > 0};
  });
  const chat = ['GTA 6 ВЫШЛА!!!', '13 ЛЕТ ЖДАЛ', 'ЛЕГЕНДА', 'ВЗЯЛ ОТГУЛ', 'ВСЕ В ИГРУ', 'НЕ СПЛЮ'];
  const fallback = (
    <div style={{position: 'relative', width: 1080, height: 820}}>
      {/* вспышки телефонов */}
      {Array.from({length: 14}).map((_, i) => {
        const on = Math.sin(t * 9 + i * 3.1) > 0.85;
        return <div key={i} style={{position: 'absolute', left: random(`fx${i}`) * 1000, top: 380 + random(`fy${i}`) * 120, width: 18, height: 26, borderRadius: 4, background: '#fff', opacity: on ? 1 : 0.15, boxShadow: on ? '0 0 30px #fff' : 'none'}} />;
      })}
      <svg width={1080} height={820} style={{position: 'absolute', inset: 0}}>
        {people.map((p, i) => {
          const base = 640 + p.row * 70;
          const s = 1 + p.row * 0.25;
          const y = base - p.jump;
          const c = ['#1a0820', '#120515', '#08020c'][p.row];
          return (
            <g key={i} transform={`translate(${p.x} ${y}) scale(${s})`} fill={c} stroke={theme.a} strokeWidth={p.row === 2 ? 2 : 1} strokeOpacity={0.6}>
              <circle cx={0} cy={-120} r={22} />
              <path d="M-30 -92 H30 L36 40 H-36 Z" />
              <path d={p.arms ? 'M-28 -88 L-56 -170 M28 -88 L56 -170' : 'M-28 -88 L-60 -140 M28 -88 L60 -140'} strokeWidth={16} stroke={c} />
            </g>
          );
        })}
      </svg>
      {/* конфетти */}
      {Array.from({length: 40}).map((_, i) => {
        const x = random(`cx${i}`) * 1080 + Math.sin(t * 3 + i) * 30;
        const y = ((random(`cy${i}`) * 900 + t * (180 + random(`cv${i}`) * 200)) % 900) - 80;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: 14, height: 26, background: i % 2 ? theme.a : theme.b, transform: `rotate(${t * 300 + i * 40}deg)`, opacity: 0.9}} />;
      })}
      {/* чат стримера */}
      {chat.map((c, i) => {
        const at = 4 + i * 5;
        const k = interpolate(frame, [at, at + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return (
          <div key={i} style={{position: 'absolute', left: i % 2 ? 560 : 70, top: 30 + i * 62 - k * 10, opacity: k, transform: `scale(${0.8 + 0.2 * k})`, fontFamily: FONT_BODY, fontWeight: 900, fontSize: 34, color: '#fff', background: 'rgba(0,0,0,0.7)', border: `3px solid ${i % 2 ? theme.b : theme.a}`, borderRadius: 18, padding: '8px 20px'}}>
            <span style={{color: i % 2 ? theme.b : theme.a}}>@player{(i * 37) % 97}:</span> {c}
          </div>
        );
      })}
    </div>
  );
  return (
    <Stage style={{gap: 10, justifyContent: 'flex-start'}}>
      <PopIn y={-30}>
        <NeonText color={theme.a} size={fit(label, 1000, 72, 0.92)}>{label}</NeonText>
      </PopIn>
      <Footage name={clip} footage={footage} theme={theme} fallback={fallback} style={{width: 980, height: 800, borderRadius: 40, border: `6px solid ${theme.a}`}} />
    </Stage>
  );
};

/** Пустой офис: «ЗАКРЫТО — ВСЕ ИГРАЮТ» */
export const OfficeClosed: React.FC<SceneProps<{company: string; note: string; clip?: string}>> = ({company, note, clip, marks, theme, footage}) => {
  const frame = useCurrentFrame();
  const stampAt = marks.stamp ?? 30;
  const st = useSpringIn(stampAt, {damping: 10, stiffness: 260});
  const grid = (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 260px)', gap: 30}}>
      {Array.from({length: 9}).map((_, i) => (
        <PopIn key={i} at={4 + i * 2}>
          <div style={{position: 'relative', width: 260, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Desk size={200} color={theme.a} stroke={4} />
            <div style={{position: 'absolute', top: 38, fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 30, color: theme.b, opacity: 0.6 + 0.4 * Math.sin(frame / 4 + i)}}>VI</div>
          </div>
        </PopIn>
      ))}
    </div>
  );
  return (
    <Stage>
      <PopIn y={-40}>
        <Pill color={theme.b} size={54}>{company}</Pill>
      </PopIn>
      <div style={{position: 'relative'}}>
        <Footage name={clip} footage={footage} theme={theme} fallback={grid} style={{width: 900, height: 560, borderRadius: 30}} />
        {frame >= stampAt ? (
          <div style={{position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) rotate(-12deg) scale(${2.4 - 1.4 * st})`, opacity: Math.min(1, st * 2), border: `12px solid ${theme.a}`, borderRadius: 24, padding: '14px 40px', background: 'rgba(0,0,0,0.75)', boxShadow: glow(theme.a, 0.8)}}>
            <div style={{fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 110, color: theme.a, whiteSpace: 'nowrap'}}>ЗАКРЫТО</div>
          </div>
        ) : null}
      </div>
      <PopIn at={stampAt + 6} y={40}>
        <NeonText color={theme.a} size={fit(note, 980, 60, 0.75)}>{note}</NeonText>
      </PopIn>
    </Stage>
  );
};

export const Question: React.FC<SceneProps<{text: string; accent: string}>> = ({text, accent, theme}) => {
  const frame = useCurrentFrame();
  const g = frame % 9 < 2 ? 1 : 0;
  const off = g * 10 * Math.sin(frame * 3);
  const layer = (color: string, dx: number, op: number) => (
    <div style={{position: 'absolute', inset: 0, transform: `translateX(${dx}px)`, opacity: op, mixBlendMode: 'screen'}}>
      <NeonText color={color} size={fit(text, 980, 96, 0.92)} fill={color} glowK={0}>{text}</NeonText>
    </div>
  );
  return (
    <Stage>
      <PopIn>
        <NeonBox color={theme.a} style={{width: 420, height: 380, gap: 0}}>
          <Calendar size={120} color={theme.a} />
          <div style={{fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 120, color: '#fff', lineHeight: 1}}>19</div>
          <div style={{fontFamily: FONT_BODY, fontWeight: 900, fontSize: 40, color: theme.b}}>НОЯБРЯ 2026</div>
        </NeonBox>
      </PopIn>
      <div style={{position: 'relative'}}>
        {layer('#00f0ff', -off - 4 * g, 0.8 * g)}
        {layer('#ff0050', off + 4 * g, 0.8 * g)}
        <NeonText color={theme.a} size={fit(text, 980, 96, 0.92)}>{text}</NeonText>
      </div>
      <PopIn at={8} from={1.6}>
        <NeonText color={theme.a} size={130} fill={theme.b}>{accent}</NeonText>
      </PopIn>
    </Stage>
  );
};
