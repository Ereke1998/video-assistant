// Список инструментов/пунктов: заголовок-пилюля, бейдж, строки заполняют пустые слоты по очереди.
import { theme } from "../config";
import { Band, Card, useIn } from "./ui";

type Item = { name: string; desc?: string; icon?: string };
export const ToolList: React.FC<{ title?: string; badge?: string; items: Item[]; total?: number; stagger?: number }> = ({ title, badge, items, total, stagger = 10 }) => {
  const slots = Math.max(total ?? items.length, items.length); const head = useIn(0);
  return (
    <Band top={600}>
      <div style={{ position: "absolute", left: 70, right: 70, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: head }}>
          {title && <Card style={{ padding: "12px 30px", fontSize: 36, fontWeight: 800, borderRadius: 999 }}>{title}</Card>}
          {badge && <div style={{ ...theme.cardAccent, padding: "12px 30px", fontSize: 32, fontWeight: 800, fontFamily: theme.font, transform: `rotate(4deg) scale(${useIn(18)})` }}>{badge}</div>}
        </div>
        {Array.from({ length: slots }).map((_, i) => {
          const it = items[i]; const p = useIn(10 + i * stagger);
          if (!it) return <div key={i} style={{ height: 78, borderRadius: 18, border: `3px dashed ${theme.muted}` }} />;
          return (
            <div key={i} style={{ position: "relative", height: 78 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 18, border: `3px dashed ${theme.muted}` }} />
              <Card style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 20, padding: "0 26px", borderRadius: 18,
                opacity: p, transform: `translateX(${(1 - p) * -60}px)` }}>
                <span style={{ width: 50, height: 50, borderRadius: 12, background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{it.icon ?? "◆"}</span>
                <span style={{ fontSize: 36, fontWeight: 800 }}>{it.name}</span>
                {it.desc && <span style={{ marginLeft: "auto", fontSize: 28, fontWeight: 600, opacity: .65 }}>{it.desc}</span>}
              </Card>
            </div>
          );
        })}
      </div>
    </Band>
  );
};
