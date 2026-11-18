// Анимированный фон: медленно движущийся градиент + сетка. Цвета — theme.background.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { config } from "../config";

export const Background = () => {
  const f = useCurrentFrame(); const bg = config.theme.background;
  const a = bg.motion ? f * 0.4 : 0;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${160 + Math.sin(a / 40) * 20}deg, ${bg.colors.join(", ")})` }}>
      {bg.grid && (
        <AbsoluteFill style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)",
          backgroundSize: "90px 90px", backgroundPosition: `0 ${a % 90}px`,
        }} />
      )}
    </AbsoluteFill>
  );
};
