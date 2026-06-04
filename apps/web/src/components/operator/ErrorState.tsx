type Props = {
  message: string;
  label?: string;
  onRetry?: () => void;
  compact?: boolean;
  icon?: string;
};

export function ErrorState({ message, label, onRetry, compact, icon = '⚠' }: Props) {
  if (compact) {
    return (
      <div className="px-5 py-4 flex items-center justify-between gap-3 bg-red-50/80 border-b border-red-100">
        <span className="text-xs text-red-700">
          {label ? `Could not load ${label} — ` : ''}{message}
        </span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="text-xs font-medium text-red-700 underline shrink-0">
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 py-12 text-center">
      <div className="text-3xl mb-3 opacity-80">{icon}</div>
      <p className="text-sm font-medium text-slate-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
