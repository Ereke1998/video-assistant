// Крупная цифра с отсчётом from → to и подписью.
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { config } from "../config";

export const Counter: React.FC<{ from?: number; to: number; suffix?: string; label?: string }> = ({ from = 0, to, suffix = "", label }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const th = config.theme;
  const p = spring({ frame: f, fps, config: { damping: 30 }, durationInFrames: fps * 1.2 });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: th.font, color: th.text_color, marginTop: "-20%" }}>
      <div style={{ fontSize: 260, fontWeight: 900, color: th.accent_color }}>{Math.round(interpolate(p, [0, 1], [from, to]))}{suffix}</div>
      {label && <div style={{ fontSize: 56, fontWeight: 700, opacity: p }}>{label}</div>}
    </AbsoluteFill>
  );
};
