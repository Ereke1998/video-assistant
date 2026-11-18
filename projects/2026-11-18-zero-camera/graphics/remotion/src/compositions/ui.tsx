// Общие примитивы для визуалов: появление со spring, карточка в стиле темы, рабочая зона между заголовком и маскотом.
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../config";

export const useIn = (delay = 0, damping = 14) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping, stiffness: 170 } });
};

export const Card: React.FC<{ style?: React.CSSProperties; children?: React.ReactNode }> = ({ style, children }) => (
  <div style={{ ...theme.card, color: theme.text === "#161616" ? "#161616" : theme.text, fontFamily: theme.font, ...style }}>{children}</div>
);

// Рабочая зона визуала: по умолчанию y = 640…1260 (под заголовком, над/рядом с маскотом).
export const Band: React.FC<{ top?: number; height?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ top = 640, height = 620, children, style }) => (
  <AbsoluteFill><div style={{ position: "absolute", left: 0, right: 0, top, height, ...style }}>{children}</div></AbsoluteFill>
);

export const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ");
