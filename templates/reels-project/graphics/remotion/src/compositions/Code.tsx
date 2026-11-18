// Окно редактора/терминала с эффектом печати.
import { useCurrentFrame } from "remotion";
import { config, theme } from "../config";
import { Band, Card, useIn } from "./ui";

export const Code: React.FC<{ code: string; title?: string; cps?: number }> = ({ code, title = "", cps = 40 }) => {
  const f = useCurrentFrame(); const p = useIn(0);
  const shown = code.slice(0, Math.floor((f / config.format.fps) * cps));
  return (
    <Band top={620}>
      <Card style={{ position: "absolute", left: 60, right: 60, overflow: "hidden", padding: 0, opacity: p, transform: `translateY(${(1 - p) * 60}px)` }}>
        <div style={{ display: "flex", gap: 12, padding: "18px 22px", alignItems: "center", borderBottom: `2px solid ${theme.muted}` }}>
          {["#FF5F56", "#FFBD2E", "#27C93F"].map((c) => <div key={c} style={{ width: 20, height: 20, borderRadius: 10, background: c }} />)}
          <div style={{ marginLeft: 14, fontFamily: theme.mono, fontSize: 24, opacity: .6 }}>{title}</div>
        </div>
        <pre style={{ margin: 0, padding: 32, fontSize: 34, lineHeight: 1.45, fontFamily: theme.mono, whiteSpace: "pre-wrap", minHeight: 300 }}>
          {shown}<span style={{ opacity: Math.floor(f / 15) % 2 ? 0 : 1, color: theme.accent }}>▍</span>
        </pre>
      </Card>
    </Band>
  );
};
