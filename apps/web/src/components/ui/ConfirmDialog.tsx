import { useEffect, useRef, type ReactNode } from 'react';

type Props = {
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: 'default' | 'danger';
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/** The single confirmation pattern for dealership management. Replaces window.confirm/alert. */
export function ConfirmDialog({ title, children, confirmLabel, tone = 'default', busy, error, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-xl border border-silver-200 bg-surface-card p-6 shadow-elevation-3 space-y-4">
        <h3 id="confirm-title" className="text-base font-semibold text-ink-heading">{title}</h3>
        {children && <div className="text-sm text-ink-body space-y-2">{children}</div>}
        {error && (
          <p role="alert" className="rounded-md border border-status-error-border bg-status-error-bg px-3 py-2 text-sm text-status-error-text">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy}
            className="min-h-11 rounded-md px-3 text-sm font-medium text-ink-muted hover:bg-silver-100 disabled:opacity-40">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy}
            className={`min-h-11 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-40 ${
              tone === 'danger' ? 'bg-status-error-dot hover:bg-red-700' : 'bg-navy-900 hover:bg-navy-800'
            }`}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
