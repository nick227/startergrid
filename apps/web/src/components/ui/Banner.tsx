import type { ReactNode } from 'react';

type Variant = 'success' | 'warning' | 'error' | 'info';

const STYLES: Record<Variant, { bg: string; border: string; text: string }> = {
  success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
  error:   { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-600'   },
  info:    { bg: 'bg-blue-50',  border: 'border-blue-200',  text: 'text-blue-800'  },
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
