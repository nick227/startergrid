import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function ReportToolbar({ children }: Props) {
  return (
    <div className="surface-card-operator rounded-lg border border-silver-200/90 bg-surface-card px-4 py-3 shadow-elevation-1 mb-5">
      {children}
    </div>
  );
}
