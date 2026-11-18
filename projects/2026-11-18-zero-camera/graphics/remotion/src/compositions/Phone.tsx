// Мокапы телефонов (до 2, веером). Экраны: stats — цифра + график; post — обложка ролика; safe — безопасная зона 9:16.
import { interpolate, useCurrentFrame } from "remotion";
import { theme, L } from "../config";
import { Band, fmt, useIn } from "./ui";

type Screen = { kind: "stats" | "post" | "safe"; title?: string; value?: number; caption?: string; color?: string };

const Stats: React.FC<{ s: Screen; p: number }> = ({ s, p }) => (
  <div style={{ padding: 26, color: "#fff", fontFamily: theme.font }}>
    <div style={{ fontSize: 22, opacity: .6 }}>{s.title ?? L.stats}</div>
    <div style={{ fontSize: 62, fontWeight: 900, marginTop: 8 }}>{fmt((s.value ?? 0) * p)}</div>
    <div style={{ fontSize: 22, color: theme.accent, fontWeight: 700 }}>{s.caption}</div>
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 220, marginTop: 30 }}>
      {[.3, .45, .4, .6, .55, .8, 1].map((h, i) => <div key={i} style={{ flex: 1, height: `${h * 100 * Math.min(1, p * 1.4 - i * .05)}%`, background: i === 6 ? theme.accent : "rgba(255,255,255,.18)", borderRadius: 8 }} />)}
    </div>
  </div>
);

const Post: React.FC<{ s: Screen }> = ({ s }) => (
  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${s.color ?? theme.accent2}, #111)`, display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: "70px 24px 24px" }}>
    <div style={{ fontFamily: theme.font, fontWeight: 900, fontSize: 34, color: "#fff", lineHeight: 1.15, whiteSpace: "pre-line" }}>{s.title}</div>
    <div style={{ position: "absolute", left: "50%", top: "70%", width: 90, height: 90, marginLeft: -45, borderRadius: 45, background: "rgba(255,255,255,.85)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>▶</div>
    {s.caption && <div style={{ position: "absolute", bottom: 26, left: 28, fontFamily: theme.mono, fontSize: 20, color: "#fff", opacity: .8 }}>{s.caption}</div>}
  </div>
);

const Safe: React.FC<{ p: number }> = ({ p }) => (
  <div style={{ position: "absolute", inset: 0, background: "#1A1D24", fontFamily: theme.font }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "10%", background: `rgba(255,59,48,${.55 * p})` }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "20%", background: `rgba(255,59,48,${.55 * p})`, color: "#fff", fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{L.ui}</div>
    <div style={{ position: "absolute", right: 14, bottom: "24%", display: "flex", flexDirection: "column", gap: 22, fontSize: 34, opacity: .8 }}>{["♥", "💬", "↗"].map((x) => <span key={x}>{x}</span>)}</div>
    <div style={{ position: "absolute", left: "10%", right: "18%", top: "30%", height: "28%", border: `4px dashed #34C759`, borderRadius: 18, opacity: p, color: "#34C759", fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", whiteSpace: "pre-line" }}>{L.here}</div>
  </div>
);

export const Phone: React.FC<{ screens: Screen[] }> = ({ screens }) => {
  const f = useCurrentFrame();
  return (
    <Band top={600} height={660}>
      {screens.slice(0, 2).map((s, i) => {
        const p = useIn(4 + i * 10); const n = screens.length;
        const x = n === 1 ? 390 : [170, 560][i]; const rot = n === 1 ? -3 : [-7, 6][i];
        const cnt = interpolate(f, [10, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ position: "absolute", left: x, top: 20 + i * 40, width: 320, height: 620, borderRadius: 48, background: "#0B0C10", padding: 10,
            border: theme.name === "paper" ? "5px solid #161616" : `2px solid ${theme.accent}88`, boxShadow: theme.name === "paper" ? "10px 10px 0 #161616" : `0 0 40px ${theme.accent}44`,
            transform: `translateY(${(1 - p) * 300}px) rotate(${rot * p}deg)`, opacity: p }}>
            <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 38, overflow: "hidden", background: "#14161C" }}>
              {s.kind === "stats" && <Stats s={s} p={cnt} />}
              {s.kind === "post" && <Post s={s} />}
              {s.kind === "safe" && <Safe p={cnt} />}
            </div>
          </div>
        );
      })}
    </Band>
  );
};
