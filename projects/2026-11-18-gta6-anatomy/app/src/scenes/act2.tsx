import React from 'react';
import {interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_BODY, FONT_DISPLAY, glow} from '../theme';
import {fit, fmtNum, NeonBox, NeonText, Pill, PopIn, SceneProps, Stage, useProgress, useSpringIn} from '../components/ui';
import {Check, Coin, Console, Cross, Monitor, Trophy} from '../components/icons';

export const ActTitle: React.FC<SceneProps<{title: string; question?: string; actRoman?: string}>> = ({title, question, actRoman: roman = '', theme}) => {
  const frame = useCurrentFrame();
  const wipe = useProgress(0, 10);
  return (
    <Stage>
      {/* полосы-вайп */}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{position: 'absolute', left: 0, right: 0, top: 380 + i * 60, height: 18, background: i === 1 ? theme.b : theme.a, transform: `translateX(${(1 - wipe) * (i % 2 ? 1200 : -1200)}px)`, opacity: 0.18 + 0.1 * i, boxShadow: glow(theme.a, 0.4)}} />
      ))}
      <PopIn y={-40}>
        <Pill color={theme.a} size={46}>АКТ</Pill>
      </PopIn>
      <PopIn at={2} from={2}>
        <NeonText color={theme.a} size={330} fill={theme.b} glowK={1.5}>{roman}</NeonText>
      </PopIn>
      <PopIn at={6} y={50}>
        <NeonText color={theme.a} size={fit(title, 1000, 96, 0.92)}>{title}</NeonText>
      </PopIn>
      {question ? (
        <PopIn at={14} y={50}>
          <div style={{transform: `scale(${1 + 0.03 * Math.sin(frame / 4)})`}}>
            <Pill color={theme.b} filled size={fit(question, 920, 52, 0.72)}>{question}</Pill>
          </div>
        </PopIn>
      ) : null}
    </Stage>
  );
};

export const BigNumber: React.FC<
  SceneProps<{prefix?: string; suffix?: string; value: number; label: string; note?: string; bar?: boolean; format?: 'full'}>
> = ({prefix = '', suffix = '', value, label, note, bar, marks, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const land = marks.land ?? 24;
  const p = useProgress(3, Math.max(8, land), (x) => 1 - Math.pow(1 - x, 4));
  const text = `${prefix}${fmtNum(value * p)}${suffix}`;
  const finalText = `${prefix}${fmtNum(value)}${suffix}`;
  const size = fit(finalText, 1000, 260, 0.74);
  const landed = frame >= land;
  const kick = landed ? Math.exp(-(frame - land) / 5) : 0;
  const coins = label.includes('БЮДЖЕТ');
  return (
    <Stage>
      {coins
        ? Array.from({length: 18}).map((_, i) => {
            const start = land - 6 + (i % 6) * 2;
            const y = interpolate(frame, [start, start + fps], [-200, 1200], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            if (frame < start) return null;
            return (
              <div key={i} style={{position: 'absolute', opacity: 0.55, left: random(`c${i}`) * 980, top: y, transform: `rotate(${frame * 8 + i * 30}deg)`}}>
                <Coin size={70 + random(`cs${i}`) * 40} color={theme.b} />
              </div>
            );
          })
        : null}
      <PopIn y={-50}>
        <Pill color={theme.a} size={48}>{label}</Pill>
      </PopIn>
      <div style={{transform: `scale(${1 + kick * 0.12})`}}>
        <NeonText color={theme.a} size={size} fill={landed ? theme.b : '#fff'} glowK={landed ? 1.4 : 0.7} style={{fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>
          {text}
        </NeonText>
      </div>
      {bar ? (
        <div style={{width: 880}}>
          <div style={{height: 64, borderRadius: 18, border: `5px solid ${theme.a}`, padding: 6, boxShadow: glow(theme.a, 0.4)}}>
            <div style={{height: '100%', width: `${p * 100}%`, borderRadius: 10, background: `repeating-linear-gradient(90deg, ${theme.a} 0 26px, ${theme.b} 26px 32px)`}} />
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: FONT_BODY, fontWeight: 900, fontSize: 32, color: '#fff', marginTop: 12}}>
            <span>ЗАГРУЗКА…</span>
            <span style={{color: theme.b}}>{Math.round(p * 100)}%</span>
          </div>
        </div>
      ) : null}
      {note ? (
        <PopIn at={land + 4}>
          <div style={{fontFamily: FONT_BODY, fontWeight: 700, fontSize: 30, color: 'rgba(255,255,255,0.65)'}}>* {note}</div>
        </PopIn>
      ) : null}
    </Stage>
  );
};

export const BudgetBars: React.FC<SceneProps<{unit: string; note?: string; items: {label: string; value: number; highlight?: boolean}[]}>> = ({
  unit,
  note,
  items,
  marks,
  theme,
}) => {
  const frame = useCurrentFrame();
  const max = Math.max(...items.map((i) => i.value));
  const hero = marks.hero ?? 30;
  return (
    <Stage style={{alignItems: 'stretch', padding: '0 60px', gap: 34}}>
      <PopIn y={-40} style={{alignSelf: 'center'}}>
        <NeonText color={theme.a} size={74}>БЮДЖЕТ, {unit}</NeonText>
      </PopIn>
      {items.map((it, i) => {
        const at = it.highlight ? Math.max(10, hero - 10) : 2 + i * 9;
        const g = interpolate(frame, [at, at + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => 1 - Math.pow(1 - x, 3)});
        const col = it.highlight ? theme.b : theme.a;
        const w = 120 + (it.value / max) * 780;
        return (
          <div key={i} style={{opacity: frame >= at ? 1 : 0.15}}>
            <div style={{fontFamily: FONT_BODY, fontWeight: 900, fontSize: it.highlight ? 54 : 40, color: it.highlight ? theme.b : '#fff', marginBottom: 10}}>{it.label}</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
              <div style={{height: it.highlight ? 150 : 96, width: w * g, borderRadius: 18, background: `linear-gradient(90deg, ${col}aa, ${col})`, boxShadow: glow(col, it.highlight ? 0.9 : 0.4)}} />
              <div style={{fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: it.highlight ? 60 : 44, color: '#fff', opacity: g, whiteSpace: 'nowrap', textShadow: glow(col, 0.4)}}>
                {fmtNum(it.value * g)}
              </div>
            </div>
          </div>
        );
      })}
      {note ? <div style={{fontFamily: FONT_BODY, fontWeight: 700, fontSize: 28, color: 'rgba(255,255,255,0.6)', alignSelf: 'center'}}>* {note}</div> : null}
    </Stage>
  );
};

export const PriceTags: React.FC<SceneProps<{items: {price: string; label: string}[]}>> = ({items, marks, theme}) => {
  const frame = useCurrentFrame();
  const second = marks.second ?? 20;
  const colors = [theme.a, '#ff4fd8'];
  return (
    <Stage style={{gap: 50}}>
      <PopIn y={-40}>
        <Pill color={theme.a} size={48}>ЦЕНА</Pill>
      </PopIn>
      {items.map((it, i) => {
        const at = i === 0 ? 2 : second;
        const c = colors[i % 2];
        return (
          <PopIn key={i} at={at} from={1.6} rotate={i ? 8 : -8}>
            <NeonBox color={c} style={{width: 760, height: 300, transform: `rotate(${i ? 2 : -2}deg)`, opacity: frame >= at ? 1 : 0}}>
              <div style={{fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 150, color: '#fff', textShadow: glow(c, 0.8), lineHeight: 1}}>{it.price}</div>
              <div style={{fontFamily: FONT_BODY, fontWeight: 900, fontSize: 48, color: c, letterSpacing: 6, marginTop: 10}}>{it.label}</div>
            </NeonBox>
          </PopIn>
        );
      })}
    </Stage>
  );
};

export const RecordBadge: React.FC<SceneProps<{title: string; sub: string; note: string}>> = ({title, sub, note, marks, theme}) => {
  const frame = useCurrentFrame();
  const land = marks.land ?? 20;
  const s = useSpringIn(land, {damping: 9, stiffness: 200});
  return (
    <Stage>
      <div style={{position: 'absolute', width: 900, height: 900, opacity: 0.35}}>
        <svg width={900} height={900} viewBox="-450 -450 900 900" style={{transform: `rotate(${frame * 1.5}deg)`}}>
          {Array.from({length: 16}).map((_, i) => (
            <path key={i} transform={`rotate(${i * 22.5})`} d="M0 0 L-40 -450 L40 -450 Z" fill={i % 2 ? theme.a : theme.b} />
          ))}
        </svg>
      </div>
      <PopIn from={0.2}>
        <Trophy size={300} color={theme.b} stroke={5} />
      </PopIn>
      <PopIn at={6} y={40}>
        <NeonText color={theme.a} size={fit(title, 980, 96, 0.92)}>{title}</NeonText>
      </PopIn>
      <div style={{transform: `scale(${frame >= land ? 2 - s : 0})`, opacity: frame >= land ? 1 : 0}}>
        <NeonText color={theme.a} size={fit(sub, 980, 110, 0.92)} fill={theme.b} glowK={1.3}>{sub}</NeonText>
      </div>
      <PopIn at={land + 8}>
        <Pill color={theme.a} filled size={40}>{note}</Pill>
      </PopIn>
    </Stage>
  );
};

export const Platforms: React.FC<SceneProps<{items: {name: string; ok: boolean}[]}>> = ({items, marks, theme}) => {
  const frame = useCurrentFrame();
  const pcAt = marks.pc ?? 10;
  const consAt = marks.consoles ?? 30;
  const ok = items.filter((i) => i.ok);
  const bad = items.filter((i) => !i.ok);
  const tile = (it: {name: string; ok: boolean}, at: number, i: number) => {
    const c = it.ok ? '#2bff88' : '#ff3b4e';
    const markOn = frame >= at + 6;
    const shake = !it.ok && frame >= at + 6 && frame < at + 18 ? Math.sin(frame * 3) * 10 : 0;
    return (
      <PopIn key={it.name} at={at} y={60}>
        <NeonBox color={c} style={{width: it.ok ? 400 : 480, height: it.ok ? 320 : 340, position: 'relative', transform: `translateX(${shake}px)`}}>
          {it.ok ? <Console size={150} color="#fff" stroke={5} /> : <Monitor size={170} color="#fff" stroke={5} />}
          <div style={{fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: fit(it.name, 380, 54, 0.92), color: '#fff', marginTop: 10}}>{it.name}</div>
          <div style={{position: 'absolute', right: -30, top: -30, transform: `scale(${markOn ? 1 : 0})`, transition: 'none'}}>
            <div style={{width: 110, height: 110, borderRadius: 55, background: '#08040f', border: `6px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: glow(c, 0.6)}}>
              {it.ok ? <Check size={70} color={c} stroke={12} /> : <Cross size={70} color={c} stroke={12} />}
            </div>
          </div>
        </NeonBox>
      </PopIn>
    );
  };
  return (
    <Stage style={{gap: 34}}>
      <PopIn y={-40}>
        <NeonText color={theme.a} size={66}>ГДЕ ИГРАТЬ?</NeonText>
      </PopIn>
      <div style={{display: 'flex', gap: 50, opacity: frame >= consAt ? 1 : 0.0}}>{ok.map((it, i) => tile(it, consAt + i * 6, i))}</div>
      <div style={{display: 'flex', gap: 50}}>{bad.map((it, i) => tile(it, pcAt, i))}</div>
      {frame >= pcAt + 8 ? (
        <PopIn at={pcAt + 8}>
          <Pill color="#ff3b4e" filled size={40}>ПОРТА НА ПК НЕТ</Pill>
        </PopIn>
      ) : null}
    </Stage>
  );
};
