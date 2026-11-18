// Большая цифра с отсчётом и бейджем.
import { theme } from "../config";
import { Band, fmt, useIn } from "./ui";

export const Counter: React.FC<{ from?: number; to: number; suffix?: string; label?: string; badge?: string }> = ({ from = 0, to, suffix = "", label, badge }) => {
  const p = useIn(0, 30); const b = useIn(20);
  return (
    <Band top={640}>
      <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", fontFamily: theme.font, color: theme.text }}>
        <div style={{ fontSize: 230, fontWeight: 900, lineHeight: 1, color: theme.accent }}>{fmt(from + (to - from) * p)}{suffix}</div>
        {label && <div style={{ fontSize: 56, fontWeight: 800, marginTop: 10, opacity: p }}>{label}</div>}
        {badge && <div style={{ ...theme.cardAccent, display: "inline-block", marginTop: 26, padding: "12px 30px", fontSize: 36, fontWeight: 800, transform: `scale(${b}) rotate(-3deg)` }}>{badge}</div>}
      </div>
    </Band>
  );
};
