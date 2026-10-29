type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  variant?: 'card' | 'hero' | 'thumb';
  fit?: 'cover' | 'contain';
  decorative?: boolean;
  eager?: boolean;
};

export const VEHICLE_FALLBACK_ICON = (
  <svg viewBox="0 0 64 48" className="h-12 w-16 text-silver-300" aria-hidden="true">
    <rect x="4" y="18" width="56" height="20" rx="4" fill="currentColor" opacity="0.35" />
    <circle cx="16" cy="38" r="6" fill="currentColor" opacity="0.5" />
    <circle cx="48" cy="38" r="6" fill="currentColor" opacity="0.5" />
    <path d="M12 18 L20 10 H44 L52 18" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.45" />
  </svg>
);

export function ListingImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  variant = 'card',
  fit,
  decorative = false,
  eager = false,
}: Props) {
  const resolvedFit = fit ?? (variant === 'card' ? 'contain' : 'cover');
  const frame = variant === 'card'
    ? `mp-thumb-well ${className}`
    : `h-full w-full overflow-hidden bg-[#e8eef3] ${className}`;
  const imgFit = resolvedFit === 'contain'
    ? `h-full w-full object-contain ${variant === 'card' ? 'p-4' : 'p-1.5'}`
    : 'h-full w-full object-cover';
  const imgAlt = decorative ? '' : alt;

  if (src) {
    return (
      <div className={frame}>
        <img
          src={src}
          alt={imgAlt}
          className={`${imgFit} ${imgClassName}`}
          loading={eager ? 'eager' : 'lazy'}
          {...{ fetchpriority: eager ? 'high' : 'auto' }}
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div className={`${frame} flex flex-col items-center justify-center gap-2`} role="img" aria-label={alt}>
      {VEHICLE_FALLBACK_ICON}
      {variant !== 'thumb' && (
        <span className="text-xs font-medium text-ink-faint">Photo unavailable</span>
      )}
    </div>
  );
}
