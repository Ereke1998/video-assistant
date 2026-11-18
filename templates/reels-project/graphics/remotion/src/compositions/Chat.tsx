// Переписка/комментарии: пузыри появляются по очереди; strike — индекс зачёркиваемого сообщения (антипример).
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../config";
import { Band, Card, useIn } from "./ui";

type Msg = { from: "me" | "them"; text: string; name?: string };
export const Chat: React.FC<{ messages: Msg[]; strike?: number; stagger?: number }> = ({ messages, strike, stagger = 14 }) => {
  const f = useCurrentFrame();
  return (
    <Band top={620}>
      <div style={{ position: "absolute", left: 70, right: 70, display: "flex", flexDirection: "column", gap: 22 }}>
        {messages.map((m, i) => {
          const p = useIn(6 + i * stagger); const me = m.from === "me";
          const sw = strike === i ? interpolate(f, [30 + i * stagger, 42 + i * stagger], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
          return (
            <Card key={i} style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "82%", padding: "22px 30px", fontSize: 36, fontWeight: 600, lineHeight: 1.3, position: "relative",
              ...(me ? { background: theme.accent, color: theme.accentText } : {}), borderRadius: 28,
              opacity: p * (sw > 0 ? .7 : 1), transform: `translateY(${(1 - p) * 40}px) scale(${.9 + .1 * p})` }}>
              {m.name && <div style={{ fontSize: 24, opacity: .6, marginBottom: 6 }}>{m.name}</div>}
              {m.text}
              {sw > 0 && <div style={{ position: "absolute", left: "4%", top: "50%", height: 8, width: `${sw * .92}%`, background: theme.name === "paper" ? theme.accent : "#FF3B30", borderRadius: 4, transform: "rotate(-3deg)" }} />}
            </Card>
          );
        })}
      </div>
    </Band>
  );
};
