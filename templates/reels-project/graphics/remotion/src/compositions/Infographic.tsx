import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { config } from "../config";

type Item = { label: string; value: number };
export const Infographic: React.FC<{ items: Item[] }> = ({ items }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const max = Math.max(1, ...items.map((i) => i.value));
  const st = config.subtitles.style;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", paddingTop: "14%", paddingInline: 80, gap: 36 }}>
      {items.map((it, i) => {
        const p = spring({ frame: f - i * 8, fps, config: { damping: 14 } });
        const n = Math.round(interpolate(p, [0, 1], [0, it.value]));
        return (
          <div key={i} style={{ fontFamily: st.font, color: "#fff" }}>
            <div style={{ fontSize: 44, fontWeight: 700, marginBottom: 10 }}>{it.label} — {n}</div>
            <div style={{ height: 36, borderRadius: 18, background: "rgba(255,255,255,.15)" }}>
              <div style={{ height: "100%", width: `${(it.value / max) * 100 * p}%`, borderRadius: 18, background: st.accent_color }} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
