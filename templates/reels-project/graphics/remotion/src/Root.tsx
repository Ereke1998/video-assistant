import { Composition } from "remotion";
import { Main } from "./Main";
import { COMPONENTS } from "./compositions";
import { Subtitles } from "./compositions/Subtitles";
import { config, scenes, sec, totalFrames } from "./config";

const { width, height, fps } = config.format;

export const RemotionRoot = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={totalFrames} fps={fps} width={width} height={height} />
    <Composition id="Subtitles" component={Subtitles} durationInFrames={totalFrames} fps={fps} width={width} height={height} />
    {/* Каждая сцена отдельно — для быстрого превью правок в Studio */}
    {scenes.filter((s) => s.visual.engine === "remotion").map((s) => (
      <Composition key={s.id} id={`scene-${s.id}`} component={COMPONENTS[s.visual.component]}
        durationInFrames={sec(4)} fps={fps} width={width} height={height} defaultProps={s.visual.props} />
    ))}
  </>
);
