// Сборка без склеек: постоянный фон → вспышка-акцент → визуал сцены → заголовок-караоке → маскот → HUD → звук.
import "./fonts";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { config, scenes, timeline, hasVoiceover, theme, wordTime, Token } from "./config";
import { COMPONENTS } from "./compositions";
import { Background } from "./compositions/Background";
import { Headline } from "./compositions/Headline";
import { Mascot } from "./compositions/Mascot";
import { HUD } from "./compositions/HUD";
import { Subtitles } from "./compositions/Subtitles";

const db = (v: number) => Math.pow(10, v / 20);

// Вход/выход визуала сцены: rise | pop | slide. Без жёстких склеек — фон и персонаж остаются.
const Enter: React.FC<{ type: string; frames: number; children: React.ReactNode }> = ({ type, frames, children }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const p = spring({ frame: f, fps, config: { damping: 16, stiffness: 150 } });
  const out = interpolate(f, [frames - 7, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tr = type === "slide" ? `translateX(${(1 - p) * 100}%)` : type === "pop" ? `scale(${.7 + .3 * p})` : `translateY(${(1 - p) * 120}px)`;
  return <AbsoluteFill style={{ transform: tr, opacity: Math.min(1, p * 1.6) * out }}>{children}</AbsoluteFill>;
};

const Flash: React.FC<{ at: number; from: number }> = ({ at, from }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const o = interpolate((f + from) / fps, [at - .02, at + .08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: theme.accent, opacity: o }} />;
};

export const Main = () => (
  <AbsoluteFill style={{ background: theme.bg }}>
    <Background />
    {scenes.map((s, i) => {
      const slot = timeline.find((t) => t.id === s.id);
      if (!slot) return null;
      const C = s.visual?.engine === "remotion" ? COMPONENTS[s.visual.component] : null;
      const acc = (s.tokens as Token[]).find((t) => (t.style === "accent" || t.style === "big") && t.wi !== null);
      const flashAt = s.flash && acc ? wordTime(acc.wi!).start : null;
      return (
        <Sequence key={s.id} from={slot.from} durationInFrames={slot.frames} name={s.id}>
          {flashAt != null && <Flash at={flashAt} from={slot.from} />}
          <Enter type={s.transition ?? "rise"} frames={slot.frames}>
            {C && <C {...s.visual.props} />}
            {s.visual?.engine === "hyperframes" && (
              <OffthreadVideo src={staticFile(`hf_${s.id}.mp4`)} transparent muted style={{ width: "100%", height: "100%" }} />
            )}
          </Enter>
          {config.subtitles.mode === "headline" && <Headline tokens={s.tokens} from={slot.from} frames={slot.frames} flashAt={flashAt} />}
          {config.audio.sfx_enabled && (s.sfx ?? []).map((x: string) => config.audio.sfx_files[x] && (
            <Audio key={x} src={staticFile(config.audio.sfx_files[x])} volume={db(config.audio.sfx_volume_db)} />
          ))}
        </Sequence>
      );
    })}
    <Mascot />
    <HUD />
    {config.subtitles.mode === "bottom" && <Subtitles />}
    {hasVoiceover && <Audio src={staticFile("voiceover.mp3")} />}
    {config.audio.music.file && <Audio src={staticFile(config.audio.music.file)} volume={db(config.audio.music.volume_db)} loop />}
  </AbsoluteFill>
);
