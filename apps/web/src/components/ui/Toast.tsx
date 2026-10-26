import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastTone = 'success' | 'error';
type ToastState = { message: string; tone: ToastTone } | null;

/** One toast style for dealership management: success confirms, error explains. */
export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((message: string, tone: ToastTone = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? 8000 : 4000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { toast, show, dismiss: () => setToast(null) };
}

export function ToastView({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  if (!toast) return null;
  const error = toast.tone === 'error';
  return (
    <div role={error ? 'alert' : 'status'}
      className={`fixed bottom-6 right-6 z-[60] max-w-sm px-4 py-3 rounded-lg shadow-elevation-3 border text-sm flex items-start gap-3 ${
        error ? 'bg-status-error-bg border-status-error-border text-status-error-text' : 'bg-navy-950 border-navy-700 text-white'
      }`}>
      <span aria-hidden="true">{error ? '!' : '✓'}</span>
      <span className="flex-1">{toast.message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}
