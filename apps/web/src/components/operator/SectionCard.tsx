type Props = {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
};

export function SectionCard({ title, subtitle, action, children, className = '', noPadding }: Props) {
  return (
    <section className={`surface-card-operator overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-silver-100 flex items-center justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-ink-heading">{title}</h3>
            )}
            {subtitle && <p className="text-xs text-ink-faint mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </section>
  );
}
