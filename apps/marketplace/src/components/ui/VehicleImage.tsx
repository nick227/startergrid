type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  variant?: 'card' | 'hero' | 'thumb';
  decorative?: boolean;
};

const FALLBACK_ICON = (
  <svg viewBox="0 0 64 48" className="h-12 w-16 text-slate-300" aria-hidden="true">
    <rect x="4" y="18" width="56" height="20" rx="4" fill="currentColor" opacity="0.35" />
    <circle cx="16" cy="38" r="6" fill="currentColor" opacity="0.5" />
    <circle cx="48" cy="38" r="6" fill="currentColor" opacity="0.5" />
    <path d="M12 18 L20 10 H44 L52 18" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.45" />
  </svg>
);

export function VehicleImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  variant = 'card',
  decorative = false,
}: Props) {
  const frame = `mp-aspect-vehicle overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 ${className}`;
  const imgAlt = decorative ? '' : alt;

  if (src) {
    return (
      <div className={frame}>
        <img
          src={src}
          alt={imgAlt}
          className={`h-full w-full object-cover ${imgClassName}`}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div className={`${frame} flex flex-col items-center justify-center gap-2`} role="img" aria-label={alt}>
      {FALLBACK_ICON}
      {variant !== 'thumb' && (
        <span className="text-xs font-medium text-slate-400">Photo unavailable</span>
      )}
    </div>
  );
}
