import type { ReactNode } from 'react';

type Props = { children: ReactNode; className?: string };

export function VehicleGrid({ children, className = '' }: Props) {
  return (
    <div className={`mp-grid-vehicles ${className}`}>
      {children}
    </div>
  );
}
