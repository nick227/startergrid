import type { ReactNode } from 'react';

export type BadgeColor = 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'violet';

const COLOR_CLASSES: Record<BadgeColor, string> = {
  green:  'bg-status-success-bg text-status-success-text',
  amber:  'bg-status-warning-bg text-status-warning-text',
  red:    'bg-status-error-bg text-status-error-text',
  blue:   'bg-status-info-bg text-status-info-text',
  slate:  'bg-status-neutral-bg text-status-neutral-text',
  violet: 'bg-status-info-bg text-status-info-text',
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
