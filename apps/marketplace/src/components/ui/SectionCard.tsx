import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  title?: string;
  className?: string;
  padded?: boolean;
};

export function SectionCard({ children, title, className = '', padded = true }: Props) {
  return (
    <section className={`mp-card ${padded ? 'p-4 sm:p-5' : ''} ${className}`}>
      {title && (
        <h2 className="mp-label mb-3 text-slate-400">{title}</h2>
      )}
      {children}
    </section>
  );
}
