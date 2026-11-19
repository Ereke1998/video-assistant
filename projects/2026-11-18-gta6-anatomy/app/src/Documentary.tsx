import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ACT_THEME} from './theme';
import {TL, sec} from './timeline';
import {Background} from './components/Background';
import {Captions, FlashLayer, Hud, useImpact} from './components/Overlay';
import {SCENES} from './scenes';

const ENTER = 7; // кадры появления сцены
const EXIT = 5; // кадры ухода

/** Вход/выход сцены: zoom + blur + fade */
const SceneShell: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const f = useCurrentFrame();
  const inK = interpolate(f, [0, ENTER], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const outK = interpolate(f, [dur - EXIT, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const scale = 1.12 - 0.12 * inK - 0.06 * outK;
  return (
    <AbsoluteFill style={{opacity: inK * (1 - outK), transform: `scale(${scale})`, filter: inK < 1 || outK > 0 ? `blur(${(1 - inK) * 14 + outK * 10}px)` : undefined}}>
      {children}
    </AbsoluteFill>
  );
};

// интервалы речи — для дакинга музыки
const voiceSpans = TL.acts.map((a) => {
  const ws = TL.words.filter((w) => w.act === a.id);
  return [ws[0]?.start ?? a.voiceStart, ws[ws.length - 1]?.end ?? a.end] as const;
});

// уровни при голосе −16 LUFS и музыке −20 LUFS: под голосом ≈ −18 dB, в паузах ≈ −10 dB
const MUSIC_UNDER_VOICE = 0.2;
const MUSIC_OPEN = 0.5;

const musicVolume = (frame: number, fps: number) => {
  const t = frame / fps;
  const inVoice = voiceSpans.some(([s, e]) => t >= s - 0.15 && t <= e + 0.25);
  // плавный дакинг: расстояние до ближайшей границы речи
  let edge = Infinity;
  for (const [s, e] of voiceSpans) edge = Math.min(edge, Math.abs(t - (s - 0.15)), Math.abs(t - (e + 0.25)));
  const k = Math.min(1, edge / 0.25);
  const base = inVoice
    ? MUSIC_UNDER_VOICE + (MUSIC_OPEN - MUSIC_UNDER_VOICE) * (1 - k) * 0.5
    : MUSIC_OPEN - (MUSIC_OPEN - MUSIC_UNDER_VOICE) * (1 - k) * 0.5;
  // music stop: музыка уходит под riser перед титулом акта и возвращается на impact
  let stop = 1;
  for (const a of TL.acts.slice(1)) {
    if (t > a.start - 1.4 && t < a.start) stop = Math.min(stop, interpolate(t, [a.start - 1.4, a.start - 1.1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  }
  const fadeIn = interpolate(t, [0, 0.6], [0, 1], {extrapolateRight: 'clamp'});
  const fadeOut = interpolate(t, [TL.duration - 1.8, TL.duration], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return base * fadeIn * fadeOut * stop;
};

export const Documentary: React.FC = () => {
  const {fps} = useVideoConfig();
  const impact = useImpact();

  return (
    <AbsoluteFill style={{backgroundColor: '#05020a'}}>
      <Background />

      <AbsoluteFill style={{transform: impact.transform}}>
        {TL.scenes.map((s) => {
          const Comp = SCENES[s.type];
          if (!Comp) throw new Error(`Нет компонента для сцены типа ${s.type}`);
          const from = sec(s.start);
          const dur = Math.max(1, sec(s.end) - from);
          const marks = Object.fromEntries(Object.entries(s.marks).map(([k, v]) => [k, Math.round(v * fps)]));
          const act = TL.acts.find((a) => a.id === s.act)!;
          return (
            <Sequence key={s.id} from={from} durationInFrames={dur} name={`${s.act}·${s.id}`} layout="none">
              <SceneShell dur={dur}>
                <Comp {...s.props} actRoman={act.roman} dur={dur} marks={marks} theme={ACT_THEME[s.act]} footage={TL.footage} />
              </SceneShell>
            </Sequence>
          );
        })}
      </AbsoluteFill>

      <Hud />
      <Captions />
      <FlashLayer opacity={impact.flash} />

      {/* озвучка */}
      {TL.acts.map((a) =>
        a.audio ? (
          <Sequence key={`vo${a.id}`} from={sec(a.voiceStart)} name={`VO акт ${a.roman}`} layout="none">
            <Audio src={staticFile(a.audio)} volume={1} />
          </Sequence>
        ) : null,
      )}

      {/* музыка с дакингом под голос */}
      {TL.music ? <Audio src={staticFile(TL.music)} loop volume={(f) => musicVolume(f, fps)} /> : null}

      {/* SFX */}
      {TL.sfx.map((s, i) => (
        <Sequence key={`sfx${i}`} from={sec(s.time)} name={`sfx ${s.name}`} layout="none">
          <Audio src={staticFile(s.file)} volume={Math.min(1, s.volume * 0.7)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
