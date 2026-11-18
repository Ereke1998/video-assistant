// Список: пункты выезжают по очереди с номером-плашкой.
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { config } from "../config";

export const List: React.FC<{ title?: string; items: string[]; stagger?: number }> = ({ title, items, stagger = 12 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const th = config.theme;
  return (
    <AbsoluteFill style={{ paddingTop: "16%", paddingInline: 80, fontFamily: th.font, color: th.text_color, gap: 32 }}>
      {title && <div style={{ fontSize: 72, fontWeight: 900, marginBottom: 20 }}>{title}</div>}
      {items.map((it, i) => {
        const s = spring({ frame: f - 6 - i * stagger, fps, config: { damping: 14 } });
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 28, opacity: s, transform: `translateX(${(1 - s) * -200}px)` }}>
            <div style={{ minWidth: 88, height: 88, borderRadius: 24, background: th.accent_color, color: "#000",
              fontSize: 52, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
            <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.15 }}>{it}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
