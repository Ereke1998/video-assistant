// Веер мини-постеров (обложки роликов/примеры): падают по очереди с поворотом.
import { theme } from "../config";
import { Band, useIn } from "./ui";

type Item = { title: string; emoji?: string; color?: string };
export const Cards: React.FC<{ items: Item[]; stagger?: number }> = ({ items, stagger = 8 }) => {
  const pal = [theme.accent2, theme.accent, "#8B7CF6", "#34C759", "#F2B233"];
  const n = items.length; const w = Math.min(300, 900 / n + 40);
  return (
    <Band top={640}>
      {items.map((it, i) => {
        const p = useIn(4 + i * stagger); const x = 540 - (n * (w - 30)) / 2 + i * (w - 30); const rot = (i - (n - 1) / 2) * 5;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: 40 + Math.abs(i - (n - 1) / 2) * 24, width: w, height: w * 1.3, borderRadius: 26,
            background: it.color ?? pal[i % pal.length], border: theme.name === "paper" ? "5px solid #161616" : `2px solid ${theme.accent}`,
            boxShadow: theme.name === "paper" ? "8px 8px 0 #161616" : `0 0 30px ${theme.accent}44`,
            transform: `translateY(${(1 - p) * -500}px) rotate(${rot * p}deg)`, opacity: p, padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ height: 22, borderRadius: 11, background: "rgba(255,255,255,.85)", width: "80%" }} />
            <div style={{ fontSize: w * .32, textAlign: "center" }}>{it.emoji ?? "▶"}</div>
            <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: 30, color: "#161616", background: "#fff", borderRadius: 12, padding: "8px 12px", textAlign: "center" }}>{it.title}</div>
          </div>
        );
      })}
    </Band>
  );
};
