import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { config } from "../config";

export const CTA: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps });
  const pulse = 1 + Math.sin(f / 5) * 0.03;
  const st = { ...config.subtitles.style, font: config.theme.font, accent_color: config.theme.accent_color };
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", marginTop: "-15%" }}>
      <div style={{
        fontFamily: st.font, fontWeight: 900, fontSize: 84, color: "#000", background: st.accent_color,
        padding: "28px 56px", borderRadius: 999, maxWidth: "84%", textAlign: "center", lineHeight: 1.15, transform: `scale(${s * pulse})`,
      }}>{text}</div>
    </AbsoluteFill>
  );
};
