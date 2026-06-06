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
        <div className="px-4 py-3 border-b border-silver-200 flex items-center justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest">{title}</h3>
            )}
            {subtitle && <p className="text-xs text-ink-faint mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>{children}</div>
    </section>
  );
}
