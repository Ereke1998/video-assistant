// Дерево папок: корневая папка и подпапки, появляются по очереди с линиями дерева.
import { theme } from "../config";
import { Band, Card, useIn } from "./ui";

const Icon: React.FC<{ color: string; size?: number }> = ({ color, size = 56 }) => (
  <svg width={size} height={size * .8} viewBox="0 0 60 48"><path d="M2 8 Q2 3 7 3 H22 L28 9 H53 Q58 9 58 14 V41 Q58 46 53 46 H7 Q2 46 2 41 Z" fill={color} stroke={theme.name === "paper" ? "#161616" : "none"} strokeWidth={3} /></svg>
);

export const Folder: React.FC<{ root: string; children?: string[]; stagger?: number }> = ({ root, children = [], stagger = 10 }) => {
  const r = useIn(0); const colors = [theme.accent2, theme.accent, "#8B7CF6", "#34C759"];
  return (
    <Band top={620}>
      <div style={{ position: "absolute", left: 90, display: "flex", alignItems: "center", gap: 18, opacity: r, transform: `scale(${.8 + .2 * r})`,
        fontFamily: theme.font, fontSize: 46, fontWeight: 800, color: theme.text }}>
        <Icon color={theme.accent2} size={72} />{root}
      </div>
      <div style={{ position: "absolute", left: 128, top: 84, width: 4, height: `${children.length * 108 - 40}px`, background: theme.text, opacity: .5 * r }} />
      {children.map((c, i) => {
        const p = useIn(12 + i * stagger);
        return (
          <div key={i} style={{ position: "absolute", left: 128, top: 110 + i * 108, display: "flex", alignItems: "center", opacity: p, transform: `translateX(${(1 - p) * -40}px)` }}>
            <div style={{ width: 50, height: 4, background: theme.text, opacity: .5 }} />
            <Card style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 28px", fontSize: 36, fontWeight: 700, borderRadius: 16 }}>
              <Icon color={colors[i % colors.length]} size={44} />{c}
            </Card>
          </div>
        );
      })}
    </Band>
  );
};
