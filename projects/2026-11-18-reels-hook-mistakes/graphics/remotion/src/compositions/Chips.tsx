// Плашки-чипсы с чекбоксами: парят вокруг персонажа (float) или стопкой (stack).
import { theme } from "../config";
import { Band, Card, useIn } from "./ui";

type Item = { text: string; icon?: string; checked?: boolean };
const FLOAT = [[70, 40], [560, 150], [90, 300], [600, 420], [140, 540]];

export const Chips: React.FC<{ items: Item[]; layout?: "float" | "stack"; stagger?: number }> = ({ items, layout = "float", stagger = 9 }) => (
  <Band>
    {items.map((it, i) => {
      const p = useIn(6 + i * stagger); const c = useIn(16 + i * stagger);
      const [x, y] = layout === "float" ? FLOAT[i % FLOAT.length] : [90, i * 120];
      return (
        <Card key={i} style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 18, padding: "18px 30px 18px 22px",
          fontSize: 38, fontWeight: 700, borderRadius: 999, opacity: p, transform: `scale(${.6 + .4 * p}) rotate(${(i % 2 ? 2 : -2) * p}deg)` }}>
          {it.icon ? <span style={{ fontSize: 40 }}>{it.icon}</span> : (
            <span style={{ width: 40, height: 40, borderRadius: 10, border: `3px solid ${theme.accent}`, background: it.checked === false ? "transparent" : theme.accent,
              display: "inline-flex", alignItems: "center", justifyContent: "center", color: theme.accentText, fontSize: 28, transform: `scale(${it.checked === false ? 1 : .7 + .3 * c})` }}>
              {it.checked === false ? "" : "✓"}
            </span>
          )}
          {it.text}
        </Card>
      );
    })}
  </Band>
);
