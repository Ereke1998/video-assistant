import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { config } from "../config";

export const CTA: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps });
  const pulse = 1 + Math.sin(f / 5) * 0.03;
  const st = config.subtitles.style;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{
        fontFamily: st.font, fontWeight: 900, fontSize: 84, color: "#000", background: st.accent_color,
        padding: "28px 56px", borderRadius: 999, transform: `scale(${s * pulse})`,
      }}>{text}</div>
    </AbsoluteFill>
  );
};
