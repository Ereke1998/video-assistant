import React from 'react';
import {interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_BODY, FONT_DISPLAY, glow} from '../theme';
import {fit, fmtNum, NeonBox, NeonText, Pill, PopIn, SceneProps, Stage, useProgress, useSpringIn} from '../components/ui';
import {Coin, Comment, ConsoleBox, Eye, Gamepad, Heart, Monitor, Note, Play, Wallet} from '../components/icons';

export const Demand: React.FC<SceneProps<{label: string; sub: string}>> = ({label, sub, dur, theme}) => {
  const frame = useCurrentFrame();
  const soldAt = Math.max(16, Math.round(dur * 0.55));
  const st = useSpringIn(soldAt, {damping: 10, stiffness: 260});
  return (
    <Stage>
      <PopIn y={-40}>
        <NeonText color={theme.a} size={fit(label, 1000, 84, 0.92)}>{label}</NeonText>
      </PopIn>
      <div style={{position: 'relative', width: 760, height: 480, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <PopIn>
          <Wallet size={260} color={theme.b} />
        </PopIn>
        {Array.from({length: 7}).map((_, i) => {
          const at = 6 + i * 4;
          const k = interpolate(frame, [at, at + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          if (k <= 0 || k >= 1) return null;
          const x = 200 + k * 300;
          const y = 200 - Math.sin(k * Math.PI) * 200;
          return (
            <div key={i} style={{position: 'absolute', left: x, top: y}}>
              <Coin size={80} color={theme.b} />
            </div>
          );
        })}
        <PopIn at={4}>
          <div style={{position: 'relative'}}>
            <ConsoleBox size={280} color={theme.a} />
            {frame >= soldAt ? (
              <div style={{position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) rotate(-14deg) scale(${2.2 - 1.2 * st})`, border: '10px solid #ff3b4e', borderRadius: 18, padding: '6px 22px', background: 'rgba(0,0,0,0.8)', fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 50, color: '#ff3b4e', whiteSpace: 'nowrap', boxShadow: glow('#ff3b4e', 0.6)}}>
                SOLD OUT
              </div>
            ) : null}
          </div>
        </PopIn>
      </div>
      <PopIn at={10}>
        <Pill color={theme.a} filled size={46}>{sub}</Pill>
      </PopIn>
    </Stage>
  );
};

/** Иллюстративный график акций (без цифр — только тренд) */
export const StockChart: React.FC<SceneProps<{ticker: string; label: string; tag: string}>> = ({ticker, label, tag, marks, dur, theme}) => {
  const frame = useCurrentFrame();
  const tagAt = marks.tag ?? 20;
  const N = 22;
  const p = useProgress(0, Math.max(20, dur - 8), (x) => x);
  const shown = Math.ceil(p * N);
  const W = 900;
  const Hc = 560;
  const candles = Array.from({length: N}).map((_, i) => {
    const trend = Math.pow(i / (N - 1), 1.8);
    const base = Hc - 60 - trend * (Hc - 140) + (random(`n${i}`) - 0.5) * 50;
    const up = i > N - 6 || random(`u${i}`) > 0.35;
    const body = 20 + random(`b${i}`) * 50;
    return {x: 30 + i * ((W - 60) / N), top: up ? base - body : base, h: body, up, wick: body + 30};
  });
  const line = candles.slice(0, shown).map((c) => `${c.x + 14},${c.top + c.h / 2}`).join(' ');
  return (
    <Stage>
      <PopIn y={-40}>
        <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
          <NeonText color={theme.a} size={84}>{ticker}</NeonText>
          <Pill color="#2bff88" filled size={40}>▲ {label}</Pill>
        </div>
      </PopIn>
      <NeonBox color={theme.a} style={{width: W + 40, height: Hc + 40, padding: 20}}>
        <svg width={W} height={Hc}>
          {[1, 2, 3, 4].map((g) => (
            <line key={g} x1={0} x2={W} y1={(Hc / 5) * g} y2={(Hc / 5) * g} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
          ))}
          {candles.slice(0, shown).map((c, i) => {
            const col = c.up ? '#2bff88' : '#ff3b4e';
            return (
              <g key={i}>
                <line x1={c.x + 14} x2={c.x + 14} y1={c.top - 14} y2={c.top + c.h + 14} stroke={col} strokeWidth={4} />
                <rect x={c.x} y={c.top} width={28} height={c.h} rx={4} fill={col} style={{filter: `drop-shadow(0 0 6px ${col})`}} />
              </g>
            );
          })}
          <polyline points={line} fill="none" stroke={theme.b} strokeWidth={6} strokeLinejoin="round" style={{filter: `drop-shadow(0 0 8px ${theme.b})`}} />
        </svg>
      </NeonBox>
      <PopIn at={tagAt} from={1.6}>
        <Pill color={theme.b} size={44}>{tag}</Pill>
      </PopIn>
      <div style={{fontFamily: FONT_BODY, fontWeight: 700, fontSize: 26, color: 'rgba(255,255,255,0.5)', opacity: frame > 6 ? 1 : 0}}>* иллюстрация тренда, не котировки</div>
    </Stage>
  );
};

export const Views: React.FC<SceneProps<{value: number; label: string; tag: string}>> = ({value, label, tag, dur, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = useProgress(4, Math.max(14, dur - 10), (x) => 1 - Math.pow(1 - x, 3));
  return (
    <Stage>
      <div style={{display: 'flex', gap: 40}}>
        <PopIn>
          <Play size={170} color="#ff3b4e" />
        </PopIn>
        <PopIn at={4}>
          <Note size={170} color={theme.a} />
        </PopIn>
      </div>
      <PopIn at={2} y={60}>
        <NeonBox color={theme.a} style={{width: 860, height: 380, gap: 10}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
            <Eye size={90} color={theme.b} />
            <div style={{fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 120, color: '#fff', fontVariantNumeric: 'tabular-nums', textShadow: glow(theme.a, 0.6)}}>
              {fmtNum(value * p)}
              {p >= 1 ? '+' : ''}
            </div>
          </div>
          <div style={{fontFamily: FONT_BODY, fontWeight: 900, fontSize: 48, color: theme.b, letterSpacing: 4}}>{label}</div>
        </NeonBox>
      </PopIn>
      <PopIn at={12}>
        <Pill color={theme.a} filled size={44}>{tag}</Pill>
      </PopIn>
      {Array.from({length: 12}).map((_, i) => {
        const at = 6 + i * 3;
        const k = (frame - at) / (fps * 1.4);
        if (k < 0 || k > 1) return null;
        return (
          <div key={i} style={{position: 'absolute', right: 60 + random(`hx${i}`) * 160 + Math.sin(k * 8 + i) * 30, top: 900 - k * 900, opacity: 1 - k}}>
            <Heart size={60 + random(`hs${i}`) * 40} color={i % 2 ? '#ff3b4e' : theme.a} />
          </div>
        );
      })}
    </Stage>
  );
};

export const FinalPoll: React.FC<
  SceneProps<{headline: string; question: string; a: {icon: string; label: string}; b: {icon: string; label: string}; cta: string}>
> = ({headline, question, a, b, cta, marks, theme}) => {
  const frame = useCurrentFrame();
  const qAt = marks.question ?? 20;
  const aAt = marks.a ?? 30;
  const bAt = marks.b ?? 40;
  const ctaAt = marks.cta ?? 55;
  const crack = useProgress(0, 10);
  const head = interpolate(frame, [qAt - 4, qAt + 4], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const option = (o: {icon: string; label: string}, at: number, color: string, i: number) => {
    const Icon = o.icon === 'pc' ? Monitor : Gamepad;
    const pulse = frame > at + 10 ? 1 + 0.03 * Math.sin((frame + i * 10) / 5) : 1;
    return (
      <PopIn at={at} from={0.3} y={80}>
        <NeonBox color={color} style={{width: 440, height: 440, transform: `scale(${pulse})`, gap: 20}}>
          <div style={{fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 60, color}}>{i === 0 ? 'A' : 'B'}</div>
          <Icon size={170} color={color} />
          <div style={{fontFamily: FONT_BODY, fontWeight: 900, fontSize: fit(o.label, 380, 40, 0.68), color: '#fff', textAlign: 'center', padding: '0 20px'}}>{o.label}</div>
        </NeonBox>
      </PopIn>
    );
  };
  return (
    <Stage style={{gap: 40}}>
      {/* трещина-разделение */}
      <svg width={1080} height={1100} style={{position: 'absolute', left: 0, top: -60, opacity: 0.45}}>
        <path d="M640 0 L560 220 L620 360 L500 560 L580 760 L470 1100" stroke={theme.b} strokeWidth={8} fill="none" strokeDasharray={1400} strokeDashoffset={1400 * (1 - crack)} style={{filter: `drop-shadow(0 0 10px ${theme.b})`}} />
      </svg>
      <div style={{position: 'relative', height: 140, width: 1000}}>
        <div style={{position: 'absolute', inset: 0, opacity: head, transform: `scale(${1 + (1 - head) * 0.2})`}}>
          <NeonText color={theme.a} size={fit(headline, 1000, 100, 0.92)} fill={theme.b}>{headline}</NeonText>
        </div>
        <div style={{position: 'absolute', inset: 0, opacity: 1 - head}}>
          <NeonText color={theme.a} size={fit(question, 1000, 84, 0.92)}>{question}</NeonText>
        </div>
      </div>
      <div style={{display: 'flex', gap: 40, alignItems: 'center'}}>
        {option(a, aAt, theme.a, 0)}
        {option(b, bAt, theme.b, 1)}
      </div>
      <PopIn at={ctaAt} from={1.5}>
        <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
          <Comment size={100} color="#fff" />
          <Pill color={theme.a} filled size={fit(cta, 760, 46, 0.72)}>{cta}</Pill>
        </div>
      </PopIn>
      {frame >= ctaAt ? (
        <div style={{fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 80, color: theme.a, transform: `translateY(${Math.abs(Math.sin(frame / 5)) * 20}px)`, textShadow: glow(theme.a, 0.6)}}>↓</div>
      ) : null}
    </Stage>
  );
};
