type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  size?: 'card' | 'hero' | 'thumb';
};

const FALLBACK_ICON = (
  <svg viewBox="0 0 64 48" className="w-16 h-12 text-slate-300" aria-hidden="true">
    <rect x="4" y="18" width="56" height="20" rx="4" fill="currentColor" opacity="0.35" />
    <circle cx="16" cy="38" r="6" fill="currentColor" opacity="0.5" />
    <circle cx="48" cy="38" r="6" fill="currentColor" opacity="0.5" />
    <path d="M12 18 L20 10 H44 L52 18" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.45" />
  </svg>
);

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
  card:  'aspect-[4/3]',
  hero:  'aspect-[4/3]',
  thumb: 'aspect-[4/3]',
};

export function VehicleImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  size = 'card',
}: Props) {
  const frame = `${SIZE_CLASS[size]} bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden ${className}`;

  if (src) {
    return (
      <div className={frame}>
        <img src={src} alt={alt} className={`w-full h-full object-cover ${imgClassName}`} loading="lazy" />
      </div>
    );
  }

  return (
    <div className={`${frame} flex flex-col items-center justify-center gap-2`} role="img" aria-label={alt}>
      {FALLBACK_ICON}
      <span className="text-xs font-medium text-slate-400">Photo unavailable</span>
    </div>
  );
}
