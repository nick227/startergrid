import type { ReactNode } from 'react';

const TONE_CLASS = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  sky:     'bg-sky-50 text-sky-800 ring-sky-100',
  slate:   'bg-slate-100 text-slate-700 ring-slate-200',
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
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
