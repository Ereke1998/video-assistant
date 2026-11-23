import React, {useMemo} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {buildCues, Cue} from '../timeline';
import {FONT} from '../theme';
import {useSafeZoneGuard} from './SafeText';

// Нижний край блока субтитров — 330 px от низа кадра: запас 80 px над безопасной зоной (250 px).
const BOTTOM = 330;

const CueView: React.FC<{cue: Cue; frame: number}> = ({cue, frame}) => {
  const ref = useSafeZoneGuard(cue.text);
  const p = interpolate(frame, [cue.from, cue.from + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const out = interpolate(frame, [cue.to - 4, cue.to], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: 90,
        right: 90,
        bottom: BOTTOM,
        textAlign: 'center',
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 58,
        lineHeight: 1.15,
        color: 'white',
        opacity: p * out,
        transform: `translateY(${(1 - p) * 10}px)`,
        textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 28px rgba(0,0,0,0.6)',
      }}
    >
      {/* мягкая тёмная подложка для читаемости */}
      <div
        style={{
          position: 'absolute',
          left: -60,
          right: -60,
          top: -40,
          bottom: -40,
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.55), transparent 75%)',
          zIndex: -1,
        }}
      />
      {cue.text}
    </div>
  );
};

/** Субтитры озвучки внизу кадра (3–5 слов на экран), тайминг — по словам из forced alignment. */
export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const cues = useMemo(() => buildCues(), []);
  const active = cues.filter((c) => frame >= c.from && frame < c.to);
  return (
    <>
      {active.map((c) => (
        <CueView key={`${c.from}-${c.text}`} cue={c} frame={frame} />
      ))}
    </>
  );
};
