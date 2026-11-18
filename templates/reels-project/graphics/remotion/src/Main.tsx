// Сборка всего ролика по config.timeline: видеоряд + графика блоков + субтитры поверх.
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, interpolate, useCurrentFrame } from "remotion";
import { config, sec, tcToSec } from "./config";
import { Hook } from "./compositions/Hook";
import { Infographic } from "./compositions/Infographic";
import { CTA } from "./compositions/CTA";
import { Subtitles } from "./compositions/Subtitles";

const GRAPHICS: Record<string, React.FC<any>> = { Hook, Infographic, CTA };

const Zoom: React.FC<{ factor: number; children: React.ReactNode; dur: number }> = ({ factor, children, dur }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, dur], [1, factor], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ transform: `scale(${s})` }}>{children}</AbsoluteFill>;
};

export const Main = () => {
  let videoOffset = 0; // позиция в смонтированном ряду main_cut.mp4
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {config.timeline.map((b: any) => {
        const from = sec(tcToSec(b.start));
        const dur = sec(tcToSec(b.end)) - from;
        const startFrom = videoOffset;
        if (b.source) videoOffset += Math.round(dur * (b.speed ?? 1));
        const G = b.graphics?.engine === "remotion" ? GRAPHICS[b.graphics.composition] : null;
        const video = b.source ? (
          <OffthreadVideo src={staticFile("main_cut.mp4")} startFrom={startFrom} playbackRate={b.speed ?? 1}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null;
        return (
          <Sequence key={b.id} from={from} durationInFrames={dur} name={b.id}>
            {video && (b.zoom?.enabled ? <Zoom factor={b.zoom.factor} dur={dur}>{video}</Zoom> : video)}
            {G && <G {...b.graphics.props} />}
          </Sequence>
        );
      })}
      <Subtitles />
    </AbsoluteFill>
  );
};
