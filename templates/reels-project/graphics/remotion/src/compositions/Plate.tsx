// Плашка: стеклянная карточка с эмодзи, заголовком и подзаголовком. Стиль — theme.plate.
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { config } from "../config";

export const Plate: React.FC<{ title: string; subtitle?: string; emoji?: string }> = ({ title, subtitle, emoji }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const th = config.theme;
  const s = spring({ frame: f, fps, config: { damping: 14 } });
  const s2 = spring({ frame: f - 6, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: "22%", paddingInline: config.format.safe_zone.side_px }}>
      <div style={{
        width: "100%", padding: 64, borderRadius: th.plate.radius, background: th.plate.bg, border: `2px solid ${th.plate.border}`,
        backdropFilter: `blur(${th.plate.blur_px}px)`, fontFamily: th.font, color: th.text_color, textAlign: "center",
        transform: `translateY(${(1 - s) * 80}px)`, opacity: s,
      }}>
        {emoji && <div style={{ fontSize: 140, transform: `scale(${s2})` }}>{emoji}</div>}
        <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 44, marginTop: 24, opacity: 0.8 * s2, color: th.accent_color }}>{subtitle}</div>}
      </div>
    </AbsoluteFill>
  );
};
