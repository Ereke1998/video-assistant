// Сравнение столбиками: высота растёт, подпись значения считает вверх.
import { theme } from "../config";
import { Band, fmt, useIn } from "./ui";

type Item = { label: string; value: number };
export const Bars: React.FC<{ items: Item[]; suffix?: string }> = ({ items, suffix = "" }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <Band top={640} height={600}>
      <div style={{ position: "absolute", left: 90, right: 90, bottom: 60, top: 0, display: "flex", alignItems: "flex-end", gap: 50, fontFamily: theme.font }}>
        {items.map((it, i) => {
          const p = useIn(6 + i * 12, 20); const hi = i === items.length - 1;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, height: "100%", justifyContent: "flex-end" }}>
              <div style={{ fontSize: 52, fontWeight: 900, color: hi ? theme.accent : theme.text }}>{fmt(it.value * p)}{suffix}</div>
              <div style={{ width: "100%", height: `${(it.value / max) * 70 * p}%`, borderRadius: 18, background: hi ? theme.accent : theme.muted,
                border: theme.name === "paper" ? "4px solid #161616" : "none", boxShadow: hi && theme.name !== "paper" ? `0 0 40px ${theme.accent}66` : undefined }} />
              <div style={{ fontSize: 30, fontWeight: 700, color: theme.text, opacity: .75, textAlign: "center" }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </Band>
  );
};
