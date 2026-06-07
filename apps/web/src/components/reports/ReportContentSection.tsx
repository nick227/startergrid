import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ReportContentSection({ title, subtitle, children }: Props) {
  return (
    <section className="mt-8">
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-faint">{title}</h3>
        {subtitle && <p className="text-xs text-ink-muted mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
