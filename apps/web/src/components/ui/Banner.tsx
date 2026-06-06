import type { ReactNode } from 'react';

type Variant = 'success' | 'warning' | 'error' | 'info';

const STYLES: Record<Variant, { bg: string; border: string; text: string }> = {
  success: { bg: 'bg-status-success-bg', border: 'border-status-success-border', text: 'text-status-success-text' },
  warning: { bg: 'bg-status-warning-bg', border: 'border-status-warning-border', text: 'text-status-warning-text' },
  error:   { bg: 'bg-status-error-bg',   border: 'border-status-error-border',   text: 'text-status-error-text'   },
  info:    { bg: 'bg-status-info-bg',    border: 'border-status-info-border',    text: 'text-status-info-text'    },
};

type Props = {
  variant: Variant;
  children: ReactNode;
  onDismiss?: () => void;
  action?: ReactNode;
};

export function Banner({ variant, children, onDismiss, action }: Props) {
  const s = STYLES[variant];
  return (
    <div className={`${s.bg} border ${s.border} rounded-xl px-5 py-3 flex items-center justify-between`}>
      <div className={`text-sm ${s.text} flex-1`}>{children}</div>
      {(action || onDismiss) && (
        <div className="flex items-center gap-2 ml-3 shrink-0">
          {action}
          {onDismiss && (
            <button onClick={onDismiss} className={`text-sm ${s.text} opacity-60 hover:opacity-100`}>✕</button>
          )}
        </div>
      )}
    </div>
  );
}
