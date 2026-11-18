// Блок кода в окне редактора с эффектом печати.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { config } from "../config";

export const Code: React.FC<{ code: string; language?: string; cps?: number }> = ({ code, language = "", cps = 40 }) => {
  const f = useCurrentFrame(); const th = config.theme;
  const shown = code.slice(0, Math.floor((f / config.format.fps) * cps));
  return (
    <AbsoluteFill style={{ paddingTop: "18%", paddingInline: config.format.safe_zone.side_px }}>
      <div style={{ borderRadius: 28, background: "#0D1117", border: `2px solid ${th.plate.border}`, overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 14, padding: 24, background: "#161B22", alignItems: "center" }}>
          {["#FF5F56", "#FFBD2E", "#27C93F"].map((c) => <div key={c} style={{ width: 22, height: 22, borderRadius: 11, background: c }} />)}
          <div style={{ marginLeft: 16, color: "#8B949E", fontSize: 28, fontFamily: "monospace" }}>{language}</div>
        </div>
        <pre style={{ margin: 0, padding: 40, color: "#E6EDF3", fontSize: 40, lineHeight: 1.45, fontFamily: "monospace", whiteSpace: "pre-wrap", minHeight: 400 }}>
          {shown}<span style={{ opacity: Math.floor(f / 15) % 2 ? 0 : 1, color: th.accent_color }}>▍</span>
        </pre>
      </div>
    </AbsoluteFill>
  );
};
