// Заголовок сцены = текст озвучки. Слова появляются синхронно с голосом (pop) или «караоке» (ещё не сказанные — бледные).
// Разметка в scenes[].voice: *акцент*  ~зачёркнуто~  ^КРУПНО^  _подводка_  | — перенос строки.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, wordTime, Token, config } from "../config";

// Неразрывные группы: знаки без букв («—», «→») липнут к предыдущему слову,
// подряд идущие ^КРУПНЫЕ^ слова в одной строке не разрываются («0 МИКРОФОНОВ»).
const groups = (tokens: Token[]) => tokens.reduce<Token[][]>((acc, tk) => {
  const prev = acc[acc.length - 1];
  const last = prev?.[prev.length - 1];
  const glue = prev && !prev[0].br && !tk.br && (tk.wi === null || (tk.style === "big" && last?.style === "big"));
  if (glue) prev.push(tk); else acc.push([tk]);
  return acc;
}, []);

// Автоподгонка: оценка ширины самой длинной неразрывной группы → уменьшаем кегль, чтобы ничего не вылезало.
const WIDTH = 1080 - 128;
const fitSize = (tokens: Token[], size: number) => {
  let need = 1;
  for (const g of groups(tokens)) {
    if (g[0].br) continue;
    const w = g.reduce((sum, t) => {
      const k = t.style === "big" ? 1.75 * .74 : t.style === "kicker" ? .78 * .5 : .6; // ср. ширина знака, в кеглях
      return sum + (t.text.length + 1) * size * k;
    }, 0);
    need = Math.max(need, w / WIDTH);
  }
  return size / need;
};

export const Headline: React.FC<{ tokens: Token[]; from: number; frames: number; flashAt?: number | null }> = ({ tokens, from, frames, flashAt }) => {
  const lf = useCurrentFrame(); const { fps } = useVideoConfig();
  const t = (lf + from) / fps;
  const flash = flashAt != null && t >= flashAt;
  const textC = flash ? "#FFFFFF" : theme.text;
  const accentC = flash ? theme.accent2 : theme.accent;
  const exit = interpolate(lf, [frames - 6, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const top = theme.hud.topbar ? 200 : 150;
  const size = fitSize(tokens, config.headline?.size_px ?? theme.headlineSize);
  let last = 0;
  return (
    <div style={{
      position: "absolute", top, left: 64, right: 64, display: "flex", flexWrap: "wrap", alignItems: "baseline",
      justifyContent: theme.align === "center" ? "center" : "flex-start", columnGap: ".26em", rowGap: 4,
      fontFamily: theme.font, fontWeight: theme.headlineWeight, fontSize: size, lineHeight: 1.14, color: textC,
      opacity: exit, filter: `blur(${(1 - exit) * 8}px)`, textAlign: theme.align,
    }}>
      {groups(tokens).map((g, gi) => g[0].br ? <div key={gi} style={{ flexBasis: "100%", height: 0 }} /> : (
        <span key={gi} style={{ display: "inline-flex", columnGap: ".26em", whiteSpace: "nowrap", alignItems: "baseline" }}>
        {g.map((tk, k) => {
        const wt = tk.wi !== null ? wordTime(tk.wi) : null;
        const start = wt ? wt.start : last; if (wt) last = wt.start;
        const end = wt ? wt.end : start + .2;
        const said = t >= start - .03;
        const p = spring({ frame: Math.round((t - start) * fps), fps, config: { damping: 13, stiffness: 220 } });
        const base: React.CSSProperties = { display: "inline-block", position: "relative", whiteSpace: "nowrap" };
        if (theme.reveal === "pop") Object.assign(base, { opacity: p, transform: `translateY(${(1 - p) * 26}px) scale(${.85 + .15 * p})` });
        else base.color = said ? textC : theme.muted;
        let el: React.ReactNode = tk.text;
        if (tk.style === "accent") {
          if (theme.accentStyle === "plate") {
            el = <><span style={{ position: "absolute", inset: "4% -.08em", background: accentC, borderRadius: 12, transform: `scaleX(${said ? p : 0})`, transformOrigin: "left" }} />
              <span style={{ position: "relative", color: said ? theme.accentText : theme.muted }}>{tk.text}</span></>;
          } else {
            base.color = said ? accentC : theme.muted;
            if (theme.accentStyle === "italic") base.fontStyle = "italic";
          }
        }
        if (tk.style === "big") Object.assign(base, { fontSize: size * 1.75, fontWeight: 900, textTransform: "uppercase", lineHeight: 1, letterSpacing: "-.01em" });
        if (tk.style === "kicker") Object.assign(base, { fontFamily: theme.serif, fontStyle: "italic", fontWeight: 400, fontSize: size * .78, color: said ? accentC : theme.muted });
        if (tk.style === "strike") {
          const w = interpolate(t, [end, end + .25], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          el = <>{tk.text}<span style={{ position: "absolute", left: "-4%", top: "52%", height: ".12em", width: `${w * 1.08}%`, background: accentC, borderRadius: 4 }} /></>;
          if (w > 0) base.color = theme.muted;
        }
        return <span key={k} style={base}>{el}</span>;
        })}
        </span>
      ))}
    </div>
  );
};
