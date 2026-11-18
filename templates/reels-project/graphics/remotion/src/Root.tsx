import { Composition } from "remotion";
import { Main } from "./Main";
import { Hook } from "./compositions/Hook";
import { Infographic } from "./compositions/Infographic";
import { CTA } from "./compositions/CTA";
import { Subtitles } from "./compositions/Subtitles";
import { config, sec } from "./config";

const { width, height, fps } = config.format;
const total = sec(config.project.target_duration_sec);

export const RemotionRoot = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={total} fps={fps} width={width} height={height} />
    <Composition id="Hook" component={Hook} durationInFrames={sec(3)} fps={fps} width={width} height={height}
      defaultProps={{ title: "Хук", scale: 1 }} />
    <Composition id="Infographic" component={Infographic} durationInFrames={sec(5)} fps={fps} width={width} height={height}
      defaultProps={{ items: [{ label: "Было", value: 10 }, { label: "Стало", value: 85 }] }} />
    <Composition id="CTA" component={CTA} durationInFrames={sec(4)} fps={fps} width={width} height={height}
      defaultProps={{ text: "Подпишись" }} />
    <Composition id="Subtitles" component={Subtitles} durationInFrames={total} fps={fps} width={width} height={height} />
  </>
);
