interface AtlasLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  variant?: 'icon' | 'horizontal' | 'vertical';
  theme?: 'light' | 'dark' | 'mono';
}

const primary = '#10B981';
const accent = '#D4A017';
const darkText = '#f1f5f9';
const lightText = '#1a1a1a';
const darkMuted = '#64748B';
const lightMuted = '#64748B';

function LogoIcon({ s, fill }: { s: number; fill: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 96 96" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx="48" cy="48" r="44" stroke={fill} strokeWidth="3.5" />
      <path d="M48 14 L22 76" stroke={fill} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 14 L74 76" stroke={fill} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="29" y1="47" x2="67" y2="47" stroke={fill} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M48 0 L52 6 L50 6 L50 14 L46 14 L46 6 L44 6Z" fill={fill} />
      <path d="M48 43 L54 49 L48 55 L42 49Z" fill={accent} />
    </svg>
  );
}

export default function AtlasLogo({ size = 36, showText = false, className = '', variant = 'horizontal', theme = 'light' }: AtlasLogoProps) {
  const isDark = theme === 'dark';
  const isMono = theme === 'mono';
  const textColor = isDark ? darkText : isMono ? '#1a1a1a' : lightText;
  const tagColor = isDark ? darkMuted : isMono ? '#1a1a1a' : lightMuted;
  const iconFill = isDark ? primary : isMono ? '#1a1a1a' : primary;

  if (variant === 'icon') {
    return <LogoIcon s={size} fill={iconFill} />;
  }

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center gap-4 ${className}`}>
        <LogoIcon s={size} fill={iconFill} />
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-sans font-bold" style={{ fontSize: Math.round(size * 0.35), color: textColor, letterSpacing: '0.031em' }}>Atlas</span>
          <span className="font-sans font-normal" style={{ fontSize: Math.round(size * 0.12), color: tagColor, letterSpacing: '0.45em' }}>SMART TRAVEL</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 shrink-0 ${className}`}>
      <LogoIcon s={size} fill={iconFill} />
      {showText && (
        <div className="flex flex-col gap-0.5">
          <span className="font-sans font-bold" style={{ fontSize: Math.round(size * 0.45), color: textColor, letterSpacing: '0.031em' }}>Atlas</span>
          <span className="font-sans font-normal" style={{ fontSize: Math.round(size * 0.13), color: tagColor, letterSpacing: '0.45em' }}>SMART TRAVEL</span>
        </div>
      )}
    </div>
  );
}
