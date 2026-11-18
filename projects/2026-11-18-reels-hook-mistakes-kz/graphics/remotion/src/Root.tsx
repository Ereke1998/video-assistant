import { Composition } from "remotion";
import { Main } from "./Main";
import { config, totalFrames } from "./config";

const { width, height, fps } = config.format;

export const RemotionRoot = () => (
  <Composition id="Main" component={Main} durationInFrames={totalFrames} fps={fps} width={width} height={height} />
);
