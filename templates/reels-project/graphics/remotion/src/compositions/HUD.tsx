// HUD-оверлеи: хлебные крошки + точки прогресса (paper), REC-бар с таймкодом (blueprint), бегущая строка.
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { config, theme, scenes, sceneIndexAt } from "../config";

const mono: React.CSSProperties = { fontFamily: theme.mono, fontSize: 24, letterSpacing: ".04em" };

export const HUD = () => {
  const f = useCurrentFrame(); const { fps, durationInFrames } = useVideoConfig();
  const i = sceneIndexAt(f); const s = scenes[i];
  const tc = (fr: number) => { const t = Math.floor(fr / fps); return `00:${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}:${String(fr % fps).padStart(2, "0")}`; };
  const brand = config.hud?.brand ?? "";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {theme.hud.breadcrumb && (
        <div style={{ ...mono, position: "absolute", top: 64, left: 64, color: theme.text, opacity: .55 }}>
          // {String(i + 1).padStart(2, "0")} — {s?.label ?? s?.id}
        </div>
      )}
      {theme.hud.dots && (
        <div style={{ position: "absolute", top: 66, right: 64, display: "flex", gap: 10 }}>
          {scenes.map((_, k) => <div key={k} style={{ width: 20, height: 20, borderRadius: 10, border: `3px solid ${theme.text}`, background: k === i ? theme.accent : "transparent", borderColor: k === i ? theme.accent : theme.text }} />)}
        </div>
      )}
      {theme.hud.topbar && (
        <div style={{ position: "absolute", top: 40, left: 40, right: 40, color: theme.text, ...mono, fontSize: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", opacity: .6 }}><span>{brand}</span><span>{tc(f)}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "#FF3B30", opacity: Math.floor(f / 15) % 2 ? .3 : 1 }} />
            <span style={{ opacity: .6 }}>REC</span>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,.12)", marginTop: 12 }}>
            <div style={{ height: 3, width: `${(f / durationInFrames) * 100}%`, background: theme.accent }} />
          </div>
        </div>
      )}
      {theme.hud.ticker && config.hud?.ticker && (
        <div style={{ position: "absolute", left: -60, right: -60, top: 1690, height: 76, background: theme.accent, transform: "rotate(-3deg)", overflow: "hidden", display: "flex", alignItems: "center" }}>
          <div style={{ whiteSpace: "nowrap", fontFamily: theme.font, fontWeight: 900, fontSize: 38, color: theme.accentText, transform: `translateX(${-(f * 4) % 1400}px)`, letterSpacing: ".02em" }}>
            {Array(8).fill(`${config.hud.ticker} ✦ `).join("")}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
