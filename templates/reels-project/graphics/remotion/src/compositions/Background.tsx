// Фон без склеек: созвездие (night), чертёжная сетка (blueprint), бумага в клетку (paper).
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { theme } from "../config";

const W = 1080, H = 1920;
const PTS = Array.from({ length: 46 }, (_, i) => ({ x: random(`x${i}`) * W, y: random(`y${i}`) * H, vx: (random(`vx${i}`) - .5) * .5, vy: (random(`vy${i}`) - .5) * .5 }));

const Constellation = () => {
  const f = useCurrentFrame();
  const pts = PTS.map((p) => ({ x: (p.x + p.vx * f + W) % W, y: (p.y + p.vy * f + H) % H }));
  const lines: JSX.Element[] = [];
  pts.forEach((a, i) => pts.slice(i + 1).forEach((b, j) => {
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < 240) lines.push(<line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={theme.accent} strokeOpacity={(1 - d / 240) * .35} strokeWidth={1.5} />);
  }));
  return (
    <svg width={W} height={H} style={{ position: "absolute" }}>
      {lines}
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={theme.accent} opacity={.6} />)}
    </svg>
  );
};

const Grid: React.FC<{ step: number; major?: number }> = ({ step, major }) => (
  <AbsoluteFill style={{
    backgroundImage: [
      `linear-gradient(${theme.line} 1px, transparent 1px)`, `linear-gradient(90deg, ${theme.line} 1px, transparent 1px)`,
      ...(major ? [`linear-gradient(${theme.line} 2px, transparent 2px)`, `linear-gradient(90deg, ${theme.line} 2px, transparent 2px)`] : []),
    ].join(","),
    backgroundSize: [`${step}px ${step}px`, `${step}px ${step}px`, ...(major ? [`${major}px ${major}px`, `${major}px ${major}px`] : [])].join(","),
  }} />
);

export const Background = () => (
  <AbsoluteFill style={{ background: theme.bg }}>
    {theme.bgKind === "constellation" && <><Constellation />
      <AbsoluteFill style={{ background: `radial-gradient(60% 40% at 50% 85%, ${theme.accent}26, transparent 70%)` }} /></>}
    {theme.bgKind === "blueprint" && <><Grid step={45} major={225} />
      <AbsoluteFill style={{ background: `radial-gradient(70% 45% at 50% 60%, ${theme.accent}22, transparent 70%), radial-gradient(50% 30% at 80% 10%, ${theme.accent2}22, transparent 70%)` }} /></>}
    {theme.bgKind === "paper" && <><Grid step={48} />
      <AbsoluteFill style={{ background: "radial-gradient(90% 70% at 50% 40%, transparent 60%, rgba(90,60,20,.10))" }} /></>}
  </AbsoluteFill>
);
