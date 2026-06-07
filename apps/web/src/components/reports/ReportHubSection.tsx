import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ReportHubSection({ title, subtitle, children }: Props) {
  return (
    <section className="mb-10">
      <div className="mb-5 pb-3 border-b border-silver-200/90">
        <h3 className="text-sm font-bold text-ink-heading tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-ink-muted mt-1 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
