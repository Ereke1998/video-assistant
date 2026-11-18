// Сборка ролика целиком из кода: фон → сцены (Remotion / HyperFrames) с переходами → субтитры → озвучка, музыка, SFX.
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { config, scenes, timeline, hasVoiceover } from "./config";
import { COMPONENTS } from "./compositions";
import { Background } from "./compositions/Background";
import { Subtitles } from "./compositions/Subtitles";

const db = (v: number) => Math.pow(10, v / 20);
const T = 8; // кадров на переход

const Transition: React.FC<{ type: string; frames: number; children: React.ReactNode }> = ({ type, frames, children }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 16, stiffness: 160 } });
  const exit = interpolate(f, [frames - T, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const transform = type === "slide" ? `translateX(${(1 - enter) * 120}%)` : `scale(${0.85 + 0.15 * enter})`;
  return <AbsoluteFill style={{ transform, opacity: Math.min(enter * 1.5, 1) * exit }}>{children}</AbsoluteFill>;
};

export const Main = () => (
  <AbsoluteFill>
    <Background />
    {scenes.map((s) => {
      const slot = timeline.find((t) => t.id === s.id);
      if (!slot) return null;
      const C = s.visual.engine === "remotion" ? COMPONENTS[s.visual.component] : null;
      return (
        <Sequence key={s.id} from={slot.from} durationInFrames={slot.frames} name={s.id}>
          <Transition type={s.transition ?? "zoom"} frames={slot.frames}>
            {C && <C {...s.visual.props} />}
            {s.visual.engine === "hyperframes" && (
              <OffthreadVideo src={staticFile(`hf_${s.id}.mp4`)} transparent muted style={{ width: "100%", height: "100%" }} />
            )}
          </Transition>
          {config.audio.sfx_enabled && (s.sfx ?? []).map((x: string) => config.audio.sfx_files[x] && (
            <Audio key={x} src={staticFile(config.audio.sfx_files[x])} volume={db(config.audio.sfx_volume_db)} />
          ))}
        </Sequence>
      );
    })}
    <Subtitles />
    {hasVoiceover && <Audio src={staticFile("voiceover.mp3")} />}
    {config.audio.music.file && <Audio src={staticFile(config.audio.music.file)} volume={db(config.audio.music.volume_db)} loop />}
  </AbsoluteFill>
);
