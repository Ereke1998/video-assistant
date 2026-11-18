// Оригинальный кодовый персонаж-ведущий (вместо автора в кадре): робот с экраном-лицом.
// Позы по сценам (scenes[].mascot): idle | point | wave | think | present | shrug | null (скрыт).
// Рот двигается, пока звучит слово озвучки; моргание и лёгкое покачивание — постоянно.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, scenes, timeline, words, wordTime, config } from "../config";

type Pose = { L: [number, number]; R: [number, number]; tilt: number; look: [number, number] };
const POSES: Record<string, Pose> = {
  idle:    { L: [12, -8],   R: [12, -8],   tilt: 0,  look: [0, 0] },
  point:   { L: [12, -8],   R: [150, 15],  tilt: -4, look: [8, -10] },
  wave:    { L: [12, -8],   R: [135, 35],  tilt: 3,  look: [0, 0] },
  think:   { L: [12, -8],   R: [-8, -150], tilt: 6,  look: [-8, -8] },
  present: { L: [62, 25],   R: [62, 25],   tilt: 0,  look: [0, 4] },
  shrug:   { L: [48, -105], R: [48, -105], tilt: -5, look: [0, 0] },
};
const SH = { L: [192, 470], R: [408, 470] }; const U = 118, F = 104;

const Arm: React.FC<{ side: "L" | "R"; a1: number; a2: number }> = ({ side, a1, a2 }) => {
  const sgn = side === "L" ? -1 : 1; const r = (d: number) => (d * Math.PI) / 180;
  const [sx, sy] = SH[side];
  const ex = sx + sgn * Math.sin(r(a1)) * U, ey = sy + Math.cos(r(a1)) * U;
  const hx = ex + sgn * Math.sin(r(a1 + a2)) * F, hy = ey + Math.cos(r(a1 + a2)) * F;
  return (
    <g>
      <path d={`M${sx},${sy} L${ex},${ey} L${hx},${hy}`} stroke={theme.mascot.body} strokeWidth={50} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={hx} cy={hy} r={30} fill={theme.mascot.head} stroke={theme.mascot.face} strokeWidth={theme.name === "paper" ? 5 : 0} />
    </g>
  );
};

export const Mascot = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const t = f / fps;
  const i = Math.max(0, timeline.findIndex((s) => f >= s.from && f < s.from + s.frames));
  const cur = scenes[i]?.mascot === undefined ? "idle" : scenes[i]?.mascot;
  const prev = i > 0 ? (scenes[i - 1]?.mascot === undefined ? "idle" : scenes[i - 1].mascot) : cur;
  const k = spring({ frame: f - (timeline[i]?.from ?? 0), fps, config: { damping: 14 } });
  const A = POSES[prev ?? "idle"] ?? POSES.idle, B = POSES[cur ?? "idle"] ?? POSES.idle;
  const mix = (a: number, b: number) => a + (b - a) * k;
  const wave = cur === "wave" ? Math.sin(f / 4) * 14 : 0;
  const L: [number, number] = [mix(A.L[0], B.L[0]), mix(A.L[1], B.L[1])];
  const R: [number, number] = [mix(A.R[0], B.R[0]) + wave, mix(A.R[1], B.R[1]) + wave];
  // видимость: скрыт (null) → уезжает вниз
  const shown = cur !== null; const was = prev !== null;
  const vis = shown && was ? 1 : shown ? k : 1 - k;
  const enter = spring({ frame: f, fps, config: { damping: 15 } });
  const talking = words.length ? words.some((w) => t >= w.start && t < w.end)
    : scenes.some((s) => s.tokens?.some((tk: any) => tk.wi !== null && (() => { const w = wordTime(tk.wi); return t >= w.start && t < w.end - .05; })()));
  const mouth = talking ? 10 + Math.abs(Math.sin(f * .9)) * 22 : 6;
  const blink = f % 96 < 4 ? .1 : 1;
  const bob = Math.sin(f / 18) * 6;
  const pos = scenes[i]?.mascot_x ?? config.mascot?.x ?? "center";
  const x = { left: -250, center: 0, right: 250 }[pos as "left"] ?? 0;
  const m = theme.mascot; const outline = theme.name === "paper" ? { stroke: m.face, strokeWidth: 6 } : {};
  const tilt = mix(A.tilt, B.tilt); const look = [mix(A.look[0], B.look[0]), mix(A.look[1], B.look[1])];
  if (!config.mascot?.enabled) return null;
  return (
    <svg viewBox="0 0 600 700" width={640} height={746}
      style={{ position: "absolute", left: 220 + x, top: 1920 - 746 + (1 - enter) * 500 + (1 - vis) * 800 + bob, overflow: "visible" }}>
      {/* тело-худи */}
      <path d="M140,720 L162,500 Q172,450 228,444 L372,444 Q428,450 438,500 L460,720 Z" fill={m.body} {...outline} />
      <path d="M262,450 L250,540 M338,450 L350,540" stroke={m.trim} strokeWidth={8} strokeLinecap="round" />
      <circle cx={300} cy={600} r={26} fill={m.trim} />
      <Arm side="L" a1={L[0]} a2={L[1]} />
      <Arm side="R" a1={R[0]} a2={R[1]} />
      <g transform={`rotate(${tilt} 300 300)`}>
        {/* антенна */}
        <line x1={300} y1={150} x2={300 + Math.sin(f / 10) * 8} y2={92} stroke={m.head} strokeWidth={10} strokeLinecap="round" {...(theme.name === "paper" ? {} : {})} />
        <circle cx={300 + Math.sin(f / 10) * 8} cy={84} r={18} fill={m.trim} {...outline} />
        {/* уши */}
        <rect x={138} y={240} width={34} height={90} rx={14} fill={m.trim} {...outline} />
        <rect x={428} y={240} width={34} height={90} rx={14} fill={m.trim} {...outline} />
        {/* голова и экран-лицо */}
        <rect x={160} y={148} width={280} height={262} rx={70} fill={m.head} {...outline} />
        <rect x={186} y={182} width={228} height={186} rx={52} fill={m.face} />
        <g transform={`translate(${look[0]} ${look[1]})`}>
          <rect x={238} y={232 + (1 - blink) * 28} width={36} height={64 * blink} rx={18} fill={m.eye} />
          <rect x={326} y={232 + (1 - blink) * 28} width={36} height={64 * blink} rx={18} fill={m.eye} />
          <rect x={276} y={322 - mouth / 2} width={48} height={mouth} rx={Math.min(mouth / 2, 14)} fill={m.eye} opacity={.9} />
        </g>
      </g>
    </svg>
  );
};
