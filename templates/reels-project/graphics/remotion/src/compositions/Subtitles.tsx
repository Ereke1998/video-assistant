// Динамичные субтитры: блок 2–4 слова, pop-анимация, активное слово подсвечивается, акценты — цвет + scale.
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { config, subtitles } from "../config";

export const Subtitles = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const t = f / fps;
  const b = subtitles.find((x) => t >= x.start && t < x.end);
  if (!b) return null;
  const st = config.subtitles.style;
  const pop = st.animation === "pop" ? spring({ frame: f - Math.round(b.start * fps), fps, config: { damping: 11, stiffness: 220 } }) : 1;
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingInline: config.format.safe_zone.side_px }}>
      <div style={{
        position: "absolute", top: `${st.position_y_pct}%`, width: "100%", textAlign: "center",
        fontFamily: st.font, fontWeight: st.weight, fontSize: st.size_px, lineHeight: 1.15,
        WebkitTextStroke: `${st.stroke_px}px ${st.stroke_color}`, paintOrder: "stroke",
        transform: `scale(${0.8 + 0.2 * pop})`, textTransform: st.uppercase ? "uppercase" : "none",
      }}>
        {b.words.map((w, i) => {
          const active = t >= w.start && t < w.end;
          return (
            <span key={i} style={{
              display: "inline-block", margin: "0 .18em",
              color: w.accent ? st.accent_color : st.color,
              transform: `scale(${w.accent ? st.accent_scale : 1}) translateY(${active ? -4 : 0}px)`,
              opacity: t >= w.start - 0.05 ? 1 : 0.55,
            }}>{w.text}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
