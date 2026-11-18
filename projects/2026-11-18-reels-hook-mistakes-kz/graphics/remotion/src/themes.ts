// Стилевые пресеты (вдохновлены приёмами референсов, но с собственной графикой и палитрой).
// Выбор: project.config.json → theme.preset; точечные правки: theme.overrides.
export type Theme = {
  name: string;
  bg: string; bgKind: "constellation" | "blueprint" | "paper";
  line: string;            // линии фона
  text: string; muted: string; // muted — ещё не произнесённые слова (караоке)
  accent: string; accentText: string; accent2: string;
  accentStyle: "plate" | "color" | "italic";
  align: "left" | "center";
  font: string; mono: string; serif: string;
  headlineSize: number; headlineWeight: number;
  reveal: "karaoke" | "pop";
  card: React.CSSProperties; cardAccent: React.CSSProperties;
  mascot: { body: string; head: string; face: string; eye: string; trim: string };
  hud: { breadcrumb: boolean; dots: boolean; topbar: boolean; ticker: boolean };
};

const base = { font: "Montserrat", mono: "JetBrains Mono", serif: "Georgia, 'Times New Roman', serif" };

export const THEMES: Record<string, Theme> = {
  night: {
    ...base, name: "night",
    bg: "#07080C", bgKind: "constellation", line: "rgba(255,122,26,.22)",
    text: "#FFFFFF", muted: "rgba(255,255,255,.28)",
    accent: "#FF7A1A", accentText: "#140A02", accent2: "#3B82F6",
    accentStyle: "plate", align: "center", headlineSize: 74, headlineWeight: 800, reveal: "pop",
    card: { background: "#111318", border: "2px solid rgba(255,122,26,.75)", borderRadius: 26, boxShadow: "0 0 32px rgba(255,122,26,.35)" },
    cardAccent: { background: "#FF7A1A", color: "#140A02", borderRadius: 999 },
    mascot: { body: "#1C1F27", head: "#E9ECF2", face: "#0B0D12", eye: "#FF7A1A", trim: "#FF7A1A" },
    hud: { breadcrumb: false, dots: false, topbar: false, ticker: false },
  },
  blueprint: {
    ...base, name: "blueprint",
    bg: "#0A1424", bgKind: "blueprint", line: "rgba(80,130,200,.16)",
    text: "#F4F7FB", muted: "rgba(244,247,251,.25)",
    accent: "#FF8A1F", accentText: "#1A0E02", accent2: "#5AA9FF",
    accentStyle: "color", align: "left", headlineSize: 78, headlineWeight: 900, reveal: "pop",
    card: { background: "rgba(14,28,46,.92)", border: "1.5px solid #2D4D78", borderRadius: 22, boxShadow: "0 20px 60px rgba(0,0,0,.45)" },
    cardAccent: { background: "#FF8A1F", color: "#1A0E02", borderRadius: 12 },
    mascot: { body: "#16263D", head: "#DCE6F5", face: "#08111E", eye: "#5AA9FF", trim: "#FF8A1F" },
    hud: { breadcrumb: false, dots: false, topbar: true, ticker: true },
  },
  paper: {
    ...base, name: "paper",
    bg: "#EFE7D8", bgKind: "paper", line: "rgba(120,100,70,.12)",
    text: "#161616", muted: "rgba(22,22,22,.22)",
    accent: "#E8402A", accentText: "#FFFFFF", accent2: "#F2B233",
    accentStyle: "italic", align: "left", headlineSize: 66, headlineWeight: 800, reveal: "karaoke",
    card: { background: "#FFFFFF", border: "4px solid #161616", borderRadius: 20, boxShadow: "8px 8px 0 #161616" },
    cardAccent: { background: "#E8402A", color: "#FFFFFF", borderRadius: 999, border: "4px solid #161616" },
    mascot: { body: "#2B3A67", head: "#FFFFFF", face: "#161616", eye: "#FFFFFF", trim: "#E8402A" },
    hud: { breadcrumb: true, dots: true, topbar: false, ticker: false },
  },
};
