import type { ReactNode } from 'react';

export type ViewMode = 'grid' | 'list';

type Props = { children: ReactNode; viewMode?: ViewMode; className?: string };

export function VehicleGrid({ children, viewMode = 'grid', className = '' }: Props) {
  const cls = viewMode === 'list'
    ? `flex flex-col gap-2 ${className}`
    : `mp-grid-vehicles ${className}`;
  return (
    <div className={cls}>
      {children}
    </div>
  );
}
