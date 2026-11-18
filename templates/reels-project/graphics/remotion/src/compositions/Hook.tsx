import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { config } from "../config";

export const Hook: React.FC<{ title: string; scale?: number }> = ({ title, scale = 1 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const pop = spring({ frame: f, fps, config: { damping: 12, stiffness: 180 } });
  const st = config.subtitles.style;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: config.format.safe_zone.side_px }}>
      <div style={{
        fontFamily: st.font, fontWeight: 900, fontSize: 120 * scale, lineHeight: 1.05, textAlign: "center",
        color: st.color, WebkitTextStroke: `${st.stroke_px}px ${st.stroke_color}`, paintOrder: "stroke",
        transform: `scale(${0.6 + 0.4 * pop}) rotate(${(1 - pop) * -4}deg)`, opacity: pop,
      }}>{title}</div>
    </AbsoluteFill>
  );
};
