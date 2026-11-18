// Призыв: кнопка-пилюля, курсор подлетает и «кликает», под ней ник.
import { interpolate, useCurrentFrame } from "remotion";
import { config, theme } from "../config";
import { Band, useIn } from "./ui";

export const CTA: React.FC<{ text: string; icon?: string; handle?: string }> = ({ text, icon = "✉", handle }) => {
  const f = useCurrentFrame(); const p = useIn(0);
  const c = interpolate(f, [14, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const click = f > 34 && f < 42; const ring = interpolate(f, [34, 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const h = handle ?? config.hud?.handle;
  return (
    <Band top={660}>
      <div style={{ position: "absolute", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ position: "relative", transform: `scale(${p * (click ? .94 : 1)})` }}>
          <div style={{ position: "absolute", inset: -10, borderRadius: 999, border: `4px solid ${theme.accent}`, opacity: ring > 0 ? 1 - ring : 0, transform: `scale(${1 + ring * .25})` }} />
          <div style={{ ...theme.cardAccent, borderRadius: 999, padding: "30px 60px", fontFamily: theme.font, fontWeight: 900, fontSize: 56, display: "flex", gap: 20, alignItems: "center",
            boxShadow: theme.name === "paper" ? "8px 8px 0 #161616" : `0 0 50px ${theme.accent}88` }}>
            <span>{icon}</span>{text}
          </div>
          <svg width={70} height={84} viewBox="0 0 24 28" style={{ position: "absolute", left: `${interpolate(c, [0, 1], [130, 70])}%`, top: `${interpolate(c, [0, 1], [260, 55])}%`, opacity: c > 0 ? 1 : 0 }}>
            <path d="M2 2 L2 22 L7.5 17 L11 26 L14.5 24.5 L11 16 L18 16 Z" fill="#fff" stroke="#000" strokeWidth={1.6} strokeLinejoin="round" />
          </svg>
        </div>
        {h && <div style={{ fontFamily: theme.mono, fontSize: 34, color: theme.text, opacity: p * .8 }}>{h}</div>}
      </div>
    </Band>
  );
};
