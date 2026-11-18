// Пошаговый список «01 Шаг · пояснение»: активный шаг подсвечивается по ходу сцены.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../config";
import { Band, useIn } from "./ui";

type Item = { name: string; note?: string };
export const Steps: React.FC<{ items: Item[] }> = ({ items }) => {
  const f = useCurrentFrame(); const { durationInFrames } = useVideoConfig();
  const active = Math.min(items.length - 1, Math.floor((f / Math.max(1, durationInFrames - 10)) * items.length));
  return (
    <Band top={620}>
      <div style={{ position: "absolute", left: 80, right: 80, display: "flex", flexDirection: "column", gap: 26, fontFamily: theme.font }}>
        {items.map((it, i) => {
          const p = useIn(4 + i * 6); const st = i < active ? "done" : i === active ? "on" : "off";
          return (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 24, opacity: p * (st === "off" ? .35 : 1), transform: `translateX(${(1 - p) * -40}px) scale(${st === "on" ? 1.04 : 1})`, transformOrigin: "left" }}>
              <span style={{ fontFamily: theme.mono, fontSize: 34, color: theme.accent }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontSize: 54, fontWeight: 800, color: theme.text }}>{it.name}</span>
              {it.note && <span style={{ fontSize: 30, fontWeight: 600, color: theme.text, opacity: .55 }}>· {it.note}</span>}
              {st === "done" && <span style={{ fontSize: 40, color: theme.accent }}>✓</span>}
            </div>
          );
        })}
      </div>
    </Band>
  );
};
