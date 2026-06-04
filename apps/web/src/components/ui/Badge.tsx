import type { ReactNode } from 'react';

export type BadgeColor = 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'violet';

const COLOR_CLASSES: Record<BadgeColor, string> = {
  green:  'bg-green-100 text-green-700',
  amber:  'bg-amber-100 text-amber-700',
  red:    'bg-red-100 text-red-700',
  blue:   'bg-blue-100 text-blue-700',
  slate:  'bg-slate-100 text-slate-600',
  violet: 'bg-violet-100 text-violet-700',
};

type Props = {
  color: BadgeColor;
  children: ReactNode;
};

export function Badge({ color, children }: Props) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${COLOR_CLASSES[color]}`}>
      {children}
    </span>
  );
}
