import React, {useLayoutEffect, useRef} from 'react';
import {Easing, getRemotionEnvironment, interpolate, useCurrentFrame} from 'remotion';
import {HEIGHT, SAFE_BOTTOM, SAFE_TOP} from '../content';
import {FONT, TEXT_SHADOW} from '../theme';

/**
 * Проверка безопасной зоны: при каждом кадре меряем текст. Если он заходит в верхние/нижние 250 px —
 * в Studio предупреждение в консоли, при рендере — ошибка (рендер упадёт, а не выпустит брак).
 */
export const useSafeZoneGuard = (label: string) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = el.closest('[data-composition-root]') as HTMLElement | null;
    if (!root) return;
    const rr = root.getBoundingClientRect();
    // Невидимые экземпляры (Remotion держит их вне экрана с нулевой высотой) не проверяем.
    if (rr.height < 10) return;
    const k = rr.height / HEIGHT; // масштаб превью в Studio; при рендере = 1
    const r = el.getBoundingClientRect();
    if (r.height === 0) return;
    const top = (r.top - rr.top) / k;
    const bottom = (r.bottom - rr.top) / k;
    if (top < SAFE_TOP - 0.5 || bottom > HEIGHT - SAFE_BOTTOM + 0.5) {
      const msg = `Текст «${label}» вне безопасной зоны на кадре ${frame}: top=${top.toFixed(0)} bottom=${bottom.toFixed(0)}`;
      if (getRemotionEnvironment().isRendering) throw new Error(msg);
      console.warn(msg);
    }
  });
  return ref;
};

/** Крупный белый текст с мягкой тенью, появляется плавно (fade + подъём + расфокус → фокус). */
export const OnScreenText: React.FC<{
  text: string;
  kicker?: string;
  kickerSize?: number;
  appearAt: number;
  hideAt?: number;
  top: number; // px от верха кадра (не меньше SAFE_TOP)
  size?: number;
  weight?: number;
}> = ({text, kicker, kickerSize = 34, appearAt, hideAt, top, size = 84, weight = 800}) => {
  const frame = useCurrentFrame();
  const ease = Easing.out(Easing.cubic);
  const p = interpolate(frame, [appearAt, appearAt + 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const out = hideAt
    ? interpolate(frame, [hideAt, hideAt + 14], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 1;
  const ref = useSafeZoneGuard(text);
  if (p <= 0 || out <= 0) return null;
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top,
        left: 80,
        right: 80,
        textAlign: 'center',
        fontFamily: FONT,
        color: 'white',
        opacity: p * out,
        transform: `translateY(${(1 - p) * 26}px)`,
        filter: `blur(${(1 - p) * 10}px)`,
      }}
    >
      {kicker ? (
        <div
          style={{
            fontSize: kickerSize,
            fontWeight: 600,
            letterSpacing: kickerSize * 0.16,
            textTransform: 'uppercase',
            color: 'rgba(200, 245, 255, 0.85)',
            textShadow: TEXT_SHADOW,
            marginBottom: 18,
          }}
        >
          {kicker}
        </div>
      ) : null}
      <div style={{fontSize: size, fontWeight: weight, lineHeight: 1.12, letterSpacing: -0.5, textShadow: TEXT_SHADOW}}>{text}</div>
    </div>
  );
};
