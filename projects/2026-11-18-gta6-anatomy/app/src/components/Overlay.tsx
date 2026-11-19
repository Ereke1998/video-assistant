import React from 'react';
import {interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ActTheme, FONT_BODY, H, SAFE, W} from '../theme';
import {TL} from '../timeline';
import {themeAt} from './Background';

/** Верхний HUD: акт, LIVE, прогресс */
export const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const th = themeAt(t);
  const act = TL.acts.find((a) => t < a.end) ?? TL.acts[TL.acts.length - 1];
  const progress = Math.min(1, t / TL.duration);
  const blink = Math.floor(t * 2) % 2 === 0;
  const appear = interpolate(t, [0.9, 1.4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: SAFE.top - 20, opacity: appear}}>
      <div style={{position: 'relative', margin: '0 60px', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.15)'}}>
        <div
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`,
            borderRadius: 4, background: th.a, boxShadow: `0 0 14px ${th.a}`,
          }}
        />
        {TL.acts.slice(1).map((a) => (
          <div key={a.id} style={{position: 'absolute', left: `${(a.start / TL.duration) * 100}%`, top: -4, width: 4, height: 16, background: '#fff', opacity: 0.7}} />
        ))}
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '22px 60px 0'}}>
        <div
          style={{
            fontFamily: FONT_BODY, fontWeight: 900, fontSize: 30, color: '#fff', letterSpacing: 2,
            padding: '8px 20px', borderRadius: 12, background: 'rgba(0,0,0,0.55)', border: `3px solid ${th.a}`,
            boxShadow: `0 0 14px ${th.a}`,
          }}
        >
          АКТ {act.roman} <span style={{color: th.a}}>·</span> {act.title}
        </div>
        <div style={{fontFamily: FONT_BODY, fontWeight: 900, fontSize: 28, color: '#fff', display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{width: 16, height: 16, borderRadius: 8, background: '#ff2b3b', opacity: blink ? 1 : 0.3, boxShadow: '0 0 10px #ff2b3b'}} />
          LIVE · 19.11
        </div>
      </div>
    </div>
  );
};

/** Субтитры: 3–5 слов, пословное появление, активное слово и ключевые слова — акцентом */
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const th = themeAt(t);
  const chunk = TL.chunks.find((c) => t >= c.start - 0.04 && t < c.end);
  if (!chunk) return null;

  return (
    <div
      style={{
        position: 'absolute', left: 60, right: 60, top: SAFE.captionY, height: 230,
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: '4px 30px',
      }}
    >
      {chunk.words.map((wi) => {
        const w = TL.words[wi];
        const shown = t >= w.start - 0.03;
        const active = t >= w.start - 0.03 && t < w.end + 0.05;
        const k = interpolate(t, [w.start - 0.03, w.start + 0.09], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const color = active ? th.a : w.keyword ? th.b : '#fff';
        return (
          <span
            key={wi}
            style={{
              fontFamily: FONT_BODY, fontWeight: 900, fontSize: 66, textTransform: 'uppercase', lineHeight: 1.12,
              color, opacity: shown ? 1 : 0,
              transform: `scale(${shown ? 0.75 + 0.25 * k : 0.75}) translateY(${(1 - k) * 18}px)`,
              WebkitTextStroke: '12px #050208', paintOrder: 'stroke fill',
              textShadow: active ? `0 0 24px ${th.a}` : '0 6px 0 rgba(0,0,0,0.6)',
              display: 'inline-block',
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

/** Слот для B-roll: если в public/footage есть <name>.mp4 — играет он, иначе fallback-графика */
export const Footage: React.FC<{
  name?: string;
  footage: Record<string, string>;
  theme: ActTheme;
  fallback: React.ReactNode;
  style?: React.CSSProperties;
}> = ({name, footage, theme, fallback, style}) => {
  const file = name ? footage[name] : undefined;
  if (!file) return <>{fallback}</>;
  return (
    <div style={{position: 'relative', overflow: 'hidden', ...style}}>
      <OffthreadVideo muted src={staticFile(`footage/${file}`)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${theme.a}22, transparent 40%, #000a)`, mixBlendMode: 'normal'}} />
    </div>
  );
};

/** Вспышки и тряска на impact */
export const useImpact = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  let flash = 0;
  let shake = 0;
  for (const s of TL.sfx) {
    if (s.name !== 'impact') continue;
    const d = frame - Math.round(s.time * fps);
    if (d >= 0 && d < 14) {
      flash = Math.max(flash, (1 - d / 6) * 0.26 * s.volume);
      shake = Math.max(shake, (1 - d / 14) * 21 * s.volume);
    }
  }
  const sx = Math.sin(frame * 7.3) * shake;
  const sy = Math.cos(frame * 9.1) * shake;
  return {flash: Math.max(0, flash), transform: `translate(${sx}px, ${sy}px)`};
};

export const FlashLayer: React.FC<{opacity: number}> = ({opacity}) =>
  opacity > 0 ? <div style={{position: 'absolute', inset: 0, background: '#fff', opacity, width: W, height: H}} /> : null;
