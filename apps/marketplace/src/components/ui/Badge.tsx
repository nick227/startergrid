import type { ReactNode } from 'react';

const TONE_CLASS = {
  neutral: 'bg-status-neutral-bg text-status-neutral-text ring-status-neutral-border',
  sky:     'bg-status-info-bg text-status-info-text ring-status-info-border',
  slate:   'bg-status-neutral-bg text-status-neutral-text ring-status-neutral-border',
  emerald: 'bg-status-success-bg text-status-success-text ring-status-success-border',
} as const;

type Tone = keyof typeof TONE_CLASS;

type Props = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

export function Badge({ children, tone = 'neutral', className = '' }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE_CLASS[tone]} ${className}`}>
      {children}
    </span>
  );
}
