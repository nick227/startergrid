interface TrustBarProps {
  items: string[];
  variant?: 'light' | 'dark';
}

export function TrustBar({ items, variant = 'light' }: TrustBarProps) {
  return (
    <div className={`trust-bar trust-bar--${variant}`} aria-label="Trust indicators">
      {items.map((item, i) => (
        <span key={i} className="trust-bar__item">
          {i > 0 && <span className="trust-bar__dot" aria-hidden="true" />}
          {item}
        </span>
      ))}
    </div>
  );
}
