import React from 'react';
import {interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_BODY, FONT_DISPLAY, glow} from '../theme';
import {fit, NeonBox, NeonText, Pill, PopIn, SceneProps, Stage, useProgress} from '../components/ui';
import {Bag, Camera, Eye, Gear, Jaws, Pin, Star, Waves} from '../components/icons';
import {Footage} from '../components/Overlay';

export const Engine: React.FC<SceneProps<{name: string; tag: string}>> = ({name, tag, marks, theme}) => {
  const frame = useCurrentFrame();
  const tagAt = marks.tag ?? 30;
  const p = useProgress(0, tagAt);
  const glitch = frame < 8 && frame % 2 === 0;
  return (
    <Stage>
      {/* «код» на фоне */}
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.35}}>
        {Array.from({length: 14}).map((_, c) => (
          <div key={c} style={{position: 'absolute', left: c * 78 + 10, top: ((frame * (6 + (c % 4) * 3)) % 400) - 400, fontFamily: 'monospace', fontSize: 30, lineHeight: '36px', color: theme.a, whiteSpace: 'pre'}}>
            {Array.from({length: 40}).map((_, r) => Math.floor(random(`h${c}-${r}`) * 16).toString(16).toUpperCase() + Math.floor(random(`g${c}-${r}`) * 16).toString(16).toUpperCase()).join('\n')}
          </div>
        ))}
      </div>
      <div style={{transform: `rotate(${frame * 3}deg)`}}>
        <Gear size={240} color={theme.b} stroke={5} />
      </div>
      <PopIn from={1.8}>
        <NeonText color={theme.a} size={fit(name, 1000, 200, 0.92)} style={{transform: glitch ? 'translateX(12px) skewX(-8deg)' : undefined}}>
          {name}
        </NeonText>
      </PopIn>
      <div style={{width: 820}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: FONT_BODY, fontWeight: 900, fontSize: 32, color: '#fff', marginBottom: 10}}>
          <span>REBUILD</span>
          <span style={{color: theme.a}}>{Math.round(p * 100)}%</span>
        </div>
        <div style={{height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.12)'}}>
          <div style={{height: '100%', width: `${p * 100}%`, borderRadius: 13, background: theme.a, boxShadow: glow(theme.a, 0.6)}} />
        </div>
      </div>
      <PopIn at={tagAt} from={1.6}>
        <Pill color={theme.b} filled size={50}>{tag}</Pill>
      </PopIn>
    </Stage>
  );
};

export const CopsAI: React.FC<SceneProps<{title: string}>> = ({title, marks, theme}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const camAt = marks.cams ?? 20;
  const witAt = marks.witnesses ?? 35;
  const stars = Math.min(5, Math.floor(interpolate(frame, [4, witAt + 10], [0, 5.99], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})));
  const police = Math.floor(frame / (fps / 6)) % 2 === 0;
  const scan = (frame % 30) / 30;
  return (
    <Stage>
      {/* мигалки по краям */}
      <div style={{position: 'absolute', left: -200, top: -300, bottom: -300, width: 300, background: police ? '#ff1f3d' : '#1f5bff', filter: 'blur(80px)', opacity: 0.45}} />
      <div style={{position: 'absolute', right: -200, top: -300, bottom: -300, width: 300, background: police ? '#1f5bff' : '#ff1f3d', filter: 'blur(80px)', opacity: 0.45}} />
      <PopIn y={-40}>
        <NeonText color={theme.a} size={fit(title, 1000, 88, 0.92)}>{title}</NeonText>
      </PopIn>
      <div style={{display: 'flex', gap: 14}}>
        {Array.from({length: 5}).map((_, i) => (
          <div key={i} style={{transform: `scale(${i < stars ? 1.1 : 0.9})`}}>
            <Star size={120} color={i < stars ? '#ffd60a' : 'rgba(255,255,255,0.35)'} filled={i < stars} stroke={5} />
          </div>
        ))}
      </div>
      <div style={{display: 'flex', gap: 40}}>
        <PopIn at={camAt} y={60}>
          <NeonBox color={theme.a} style={{width: 430, height: 360, position: 'relative', overflow: 'hidden'}}>
            <Camera size={170} color={theme.a} />
            <div style={{fontFamily: FONT_BODY, fontWeight: 900, fontSize: 44, color: '#fff', marginTop: 12}}>КАМЕРЫ</div>
            <div style={{position: 'absolute', left: 0, right: 0, top: `${scan * 100}%`, height: 6, background: theme.a, boxShadow: glow(theme.a, 0.6), opacity: frame >= camAt ? 1 : 0}} />
            <div style={{position: 'absolute', top: 18, left: 22, fontFamily: 'monospace', fontWeight: 700, fontSize: 24, color: '#ff3b4e'}}>● REC</div>
          </NeonBox>
        </PopIn>
        <PopIn at={witAt} y={60}>
          <NeonBox color={theme.b} style={{width: 430, height: 360}}>
            <div style={{display: 'flex', gap: 10}}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{transform: `scaleY(${(frame + i * 7) % 40 < 3 ? 0.1 : 1})`}}>
                  <Eye size={110} color={theme.b} />
                </div>
              ))}
            </div>
            <div style={{fontFamily: FONT_BODY, fontWeight: 900, fontSize: 44, color: '#fff', marginTop: 22}}>СВИДЕТЕЛИ</div>
          </NeonBox>
        </PopIn>
      </div>
      <PopIn at={witAt + 8}>
        <Pill color="#ff3b4e" size={38}>АНАЛИЗ ДЕЙСТВИЙ: АКТИВЕН</Pill>
      </PopIn>
    </Stage>
  );
};

type Side = {title: string; year: string; clip?: string};

/** Процедурная «физика»: старая — угловатая и синхронная, новая — плавная и живая */
const PhysicsSim: React.FC<{modern: boolean; color: string}> = ({modern, color}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const w = 470;
  const h = 640;
  const seg = modern ? 60 : 6;
  const wave = (layer: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= seg; i++) {
      const x = (i / seg) * w;
      const y = modern
        ? 470 + layer * 40 + Math.sin(x / 40 + t * 3 + layer) * 18 + Math.sin(x / 17 - t * 5) * 6
        : 470 + layer * 40 + Math.sin(i + Math.floor(t * 4)) * 12;
      pts.push(`${x},${y}`);
    }
    return `M0,${h} L${pts.join(' L')} L${w},${h} Z`;
  };
  const crowd = Array.from({length: modern ? 42 : 8}).map((_, i) => {
    const bx = random(`px${i}`) * w;
    const x = modern
      ? (bx + Math.sin(t * (0.8 + random(`ps${i}`)) + i) * 60 + t * (random(`pv${i}`) - 0.5) * 80 + w) % w
      : (bx + t * 40) % w; // все идут одинаково
    const y = 340 + (modern ? random(`py${i}`) * 90 : (i % 2) * 40);
    const hue = modern ? ['#ffd60a', '#ff4fd8', '#19e6ff', '#2bff88', '#ffffff'][i % 5] : '#888';
    return {x, y, hue};
  });
  const carX = ((t * 160) % (w + 200)) - 140;
  const bounce = modern ? Math.sin(t * 14) * 5 : 0;
  const tilt = modern ? Math.sin(t * 7) * 3 : 0;
  return (
    <svg width={w} height={h} style={{display: 'block', imageRendering: modern ? 'auto' : 'pixelated'}}>
      <rect width={w} height={h} fill={modern ? '#0a1a2e' : '#1a1a1a'} />
      {/* дорога + машина */}
      <rect y={200} width={w} height={90} fill={modern ? '#141820' : '#2a2a2a'} />
      <g transform={`translate(${carX} ${220 + bounce}) rotate(${tilt} 70 30)`}>
        <rect width={140} height={40} rx={modern ? 14 : 0} fill={modern ? color : '#777'} />
        <rect x={30} y={-24} width={70} height={30} rx={modern ? 10 : 0} fill={modern ? color : '#666'} opacity={0.8} />
        <circle cx={30} cy={44} r={14} fill="#000" />
        <circle cx={110} cy={44} r={14} fill="#000" />
      </g>
      {crowd.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`}>
          <circle r={modern ? 9 : 11} cy={-22} fill={p.hue} />
          <rect x={-8} y={-12} width={16} height={28} rx={modern ? 6 : 0} fill={p.hue} />
        </g>
      ))}
      {[0, 1, 2].map((l) => (
        <path key={l} d={wave(l)} fill={modern ? ['#1373ff', '#0d55c4', '#083a8a'][l] : ['#2b4f8a', '#22406e', '#1a3155'][l]} opacity={modern ? 0.85 : 1} />
      ))}
      {modern
        ? Array.from({length: 26}).map((_, i) => (
            <circle key={i} cx={(random(`f${i}`) * w + t * 30) % w} cy={475 + Math.sin(t * 4 + i) * 14} r={2 + random(`fr${i}`) * 3} fill="#fff" opacity={0.7} />
          ))
        : null}
    </svg>
  );
};

export const SplitScreen: React.FC<SceneProps<{caption: string; left: Side; right: Side}>> = ({caption, left, right, theme, footage}) => {
  const frame = useCurrentFrame();
  const open = useProgress(0, 12);
  const panel = (side: Side, modern: boolean, dir: number) => {
    const c = modern ? theme.a : '#9a9a9a';
    return (
      <div style={{transform: `translateX(${(1 - open) * dir * 600}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
        <div style={{fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 64, color: modern ? '#fff' : '#bbb', textShadow: modern ? glow(c, 0.7) : 'none'}}>{side.title}</div>
        <div style={{fontFamily: FONT_BODY, fontWeight: 900, fontSize: 34, color: c}}>{side.year}</div>
        <div style={{border: `6px solid ${c}`, borderRadius: 28, overflow: 'hidden', boxShadow: modern ? glow(c, 0.6) : 'none', filter: modern ? 'none' : 'saturate(0.4) contrast(0.9)'}}>
          <Footage name={side.clip} footage={footage} theme={theme} fallback={<PhysicsSim modern={modern} color={theme.a} />} style={{width: 470, height: 640}} />
        </div>
      </div>
    );
  };
  return (
    <Stage style={{gap: 20}}>
      <div style={{display: 'flex', gap: 40, position: 'relative'}}>
        {panel(left, false, -1)}
        {panel(right, true, 1)}
        <div style={{position: 'absolute', left: '50%', top: 0, bottom: 0, width: 6, marginLeft: -3, background: theme.b, boxShadow: glow(theme.b, 0.7), transform: `scaleY(${open})`}} />
        <div style={{position: 'absolute', left: '50%', top: '55%', transform: `translate(-50%, -50%) scale(${open})`, width: 130, height: 130, borderRadius: 65, background: '#08040f', border: `6px solid ${theme.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 48, color: theme.b, boxShadow: glow(theme.b, 0.6)}}>
          VS
        </div>
      </div>
      <PopIn at={10}>
        <Pill color={theme.a} filled size={42}>{caption}</Pill>
      </PopIn>
      {frame < 0 ? null : null}
    </Stage>
  );
};

export const MapPin: React.FC<SceneProps<{title: string; sub: string; city: string}>> = ({title, sub, city, theme}) => {
  const frame = useCurrentFrame();
  const draw = useProgress(0, 24);
  const drop = interpolate(frame, [10, 20], [-300, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => 1 - Math.pow(1 - x, 3)});
  // стилизованный полуостров (не точная карта)
  const d = 'M120 60 L560 60 L600 110 L640 120 L660 200 L700 330 L740 470 L760 600 L730 690 L660 720 L620 640 L560 560 L520 460 L470 380 L420 330 L330 300 L250 250 L150 230 L100 160 Z';
  return (
    <Stage>
      <PopIn y={-40}>
        <NeonText color={theme.a} size={150} fill="#ffe3f1">{title}</NeonText>
      </PopIn>
      <PopIn at={4}>
        <NeonText color={theme.b} size={70} fill={theme.b}>{sub}</NeonText>
      </PopIn>
      <div style={{position: 'relative', width: 820, height: 760, transform: 'scale(0.82)', margin: '-70px 0'}}>
        <svg width={820} height={760} viewBox="0 0 820 760">
          <path d={d} fill={`${theme.a}22`} stroke={theme.a} strokeWidth={6} strokeDasharray={3000} strokeDashoffset={3000 * (1 - draw)} style={{filter: `drop-shadow(0 0 10px ${theme.a})`}} />
          {Array.from({length: 7}).map((_, i) => (
            <circle key={i} cx={680} cy={640} r={20 + (((frame + i * 8) % 56) / 56) * 140} fill="none" stroke={theme.b} strokeWidth={3} opacity={1 - ((frame + i * 8) % 56) / 56} />
          ))}
        </svg>
        <div style={{position: 'absolute', left: 680 - 70, top: 640 - 150 + drop}}>
          <Pin size={140} color={theme.b} />
        </div>
        <div style={{position: 'absolute', left: 300, top: 600, opacity: draw}}>
          <Pill color={theme.b} size={36}>{city}</Pill>
        </div>
      </div>
    </Stage>
  );
};

export const ChaosTags: React.FC<SceneProps<{items: string[]}>> = ({items, marks, theme}) => {
  const ats = [marks.a ?? 4, marks.b ?? 18, marks.c ?? 30];
  const icons = [Bag, Waves, Jaws];
  const colors = [theme.a, theme.b, '#2bff88'];
  return (
    <Stage style={{gap: 50}}>
      {items.map((label, i) => {
        const Icon = icons[i % icons.length];
        const c = colors[i % colors.length];
        return (
          <PopIn key={i} at={ats[i]} from={2} rotate={i % 2 ? 12 : -12}>
            <NeonBox color={c} style={{width: 900, height: 230, flexDirection: 'row', gap: 40, transform: `rotate(${i % 2 ? 3 : -3}deg)`}}>
              <Icon size={150} color={c} />
              <div style={{fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: fit(label, 600, 64, 0.92), color: '#fff', width: 620}}>{label}</div>
            </NeonBox>
          </PopIn>
        );
      })}
    </Stage>
  );
};
