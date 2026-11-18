import React from 'react';

type IconProps = {size?: number; color: string; stroke?: number; style?: React.CSSProperties; fill?: string};

const Svg: React.FC<IconProps & {children: React.ReactNode; vb?: string}> = ({
  size = 120,
  color,
  stroke = 6,
  style,
  children,
  vb = '0 0 100 100',
}) => (
  <svg
    width={size}
    height={size}
    viewBox={vb}
    fill="none"
    stroke={color}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 16px ${color})`, overflow: 'visible', ...style}}
  >
    {children}
  </svg>
);

export const Check: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M20 52 L42 72 L82 28" />
  </Svg>
);

export const Cross: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M24 24 L76 76 M76 24 L24 76" />
  </Svg>
);

export const Star: React.FC<IconProps & {filled?: boolean}> = ({filled, ...p}) => (
  <Svg {...p}>
    <path
      d="M50 8 L61 37 L92 38 L68 57 L76 88 L50 70 L24 88 L32 57 L8 38 L39 37 Z"
      fill={filled ? p.color : 'none'}
    />
  </Svg>
);

export const Gamepad: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M28 30 H72 C86 30 94 44 94 60 C94 74 84 80 76 72 L66 62 H34 L24 72 C16 80 6 74 6 60 C6 44 14 30 28 30 Z" />
    <path d="M26 44 V56 M20 50 H32" />
    <circle cx="68" cy="46" r="2.5" />
    <circle cx="76" cy="54" r="2.5" />
  </Svg>
);

export const Monitor: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="8" y="14" width="84" height="54" rx="6" />
    <path d="M36 86 H64 M50 68 V86" />
  </Svg>
);

export const Console: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="30" y="6" width="40" height="88" rx="10" />
    <path d="M42 20 V80" />
    <circle cx="58" cy="82" r="3" />
  </Svg>
);

export const ConsoleBox: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="10" y="22" width="80" height="58" rx="10" />
    <path d="M10 36 H90 M26 54 H50 M26 64 H44" />
  </Svg>
);

export const Camera: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M10 30 L70 18 L76 44 L16 56 Z" />
    <path d="M70 26 L90 22 L92 38 L74 42" />
    <path d="M32 52 L36 72 M20 76 H52" />
    <circle cx="26" cy="38" r="3" />
  </Svg>
);

export const Eye: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M6 50 C22 24 78 24 94 50 C78 76 22 76 6 50 Z" />
    <circle cx="50" cy="50" r="13" />
  </Svg>
);

export const Play: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="6" y="18" width="88" height="64" rx="18" />
    <path d="M42 36 L64 50 L42 64 Z" fill={p.color} />
  </Svg>
);

export const Note: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M40 76 V18 C48 30 60 34 72 34" />
    <circle cx="28" cy="76" r="12" />
  </Svg>
);

export const Pin: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M50 94 C50 94 18 60 18 38 C18 20 32 6 50 6 C68 6 82 20 82 38 C82 60 50 94 50 94 Z" />
    <circle cx="50" cy="38" r="12" />
  </Svg>
);

export const Trophy: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M28 10 H72 V36 C72 50 62 60 50 60 C38 60 28 50 28 36 Z" />
    <path d="M28 18 H12 C12 34 20 40 30 42 M72 18 H88 C88 34 80 40 70 42" />
    <path d="M50 60 V76 M32 90 H68 M38 76 H62 V90 H38 Z" />
  </Svg>
);

export const Gear: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="50" cy="50" r="16" />
    {Array.from({length: 8}).map((_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return (
        <path
          key={i}
          d={`M${50 + Math.cos(a) * 28} ${50 + Math.sin(a) * 28} L${50 + Math.cos(a) * 42} ${50 + Math.sin(a) * 42}`}
          strokeWidth={12}
        />
      );
    })}
    <circle cx="50" cy="50" r="30" />
  </Svg>
);

export const Bag: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M16 32 H84 L78 92 H22 Z" />
    <path d="M34 40 V24 C34 14 42 8 50 8 C58 8 66 14 66 24 V40" />
  </Svg>
);

export const Waves: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M6 40 C18 30 30 50 42 40 C54 30 66 50 78 40 C86 34 90 36 94 40" />
    <path d="M6 62 C18 52 30 72 42 62 C54 52 66 72 78 62 C86 56 90 58 94 62" />
    <path d="M30 26 V8 M40 24 V12 M70 24 V6" />
  </Svg>
);

/** Условный «аллигатор»: пасть с зубами */
export const Jaws: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M6 44 L94 30 L88 46 L10 52 Z" />
    <path d="M10 58 L88 56 L94 72 L6 66 Z" />
    <path d="M24 50 L28 44 L32 50 L36 43 L40 49 L44 42 L48 48 L52 41 L56 47 L60 40 L64 46" strokeWidth={4} />
    <circle cx="80" cy="38" r="2.5" />
  </Svg>
);

export const Wallet: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="8" y="24" width="84" height="60" rx="10" />
    <path d="M8 38 H92 M66 54 H92 V68 H66 Z" />
    <path d="M18 24 L64 10 L72 24" />
  </Svg>
);

export const Coin: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="50" cy="50" r="38" />
    <path d="M60 34 C56 30 44 30 42 38 C40 46 60 46 58 56 C56 66 42 66 38 60 M50 24 V76" strokeWidth={5} />
  </Svg>
);

export const Comment: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M10 18 H90 V68 H44 L24 86 V68 H10 Z" />
    <path d="M26 36 H74 M26 50 H58" />
  </Svg>
);

export const Calendar: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="8" y="16" width="84" height="76" rx="10" />
    <path d="M8 36 H92 M30 6 V24 M70 6 V24" />
  </Svg>
);

export const Heart: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path
      d="M50 86 C20 64 8 48 8 32 C8 18 20 8 32 8 C40 8 46 12 50 20 C54 12 60 8 68 8 C80 8 92 18 92 32 C92 48 80 64 50 86 Z"
      fill={p.color}
    />
  </Svg>
);

export const Desk: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="28" y="14" width="44" height="30" rx="4" />
    <path d="M50 44 V52 M8 56 H92 M16 56 V90 M84 56 V90" />
  </Svg>
);
