import type { ReactNode } from 'react';

export type SortDir = 'asc' | 'desc';

type Props = {
  isActive: boolean;
  dir: SortDir;
  onClick: () => void;
  children: ReactNode;
  className?: string;
};

export function SortableHeaderCell({
  isActive,
  dir,
  onClick,
  children,
  className = '',
}: Props) {
  return (
    <th className={`px-4 py-3 font-semibold ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 whitespace-nowrap hover:text-ink-heading transition-colors"
      >
        {children}
        <span className={`text-[9px] ${isActive ? 'text-orange-600' : 'text-silver-300'}`}>
          {isActive ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}
