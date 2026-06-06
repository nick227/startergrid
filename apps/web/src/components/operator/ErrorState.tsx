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
      <div className="px-5 py-4 flex items-center justify-between gap-3 bg-status-error-bg/80 border-b border-status-error-border">
        <span className="text-xs text-status-error-text">
          {label ? `Could not load ${label} — ` : ''}{message}
        </span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="text-xs font-medium text-status-error-text underline shrink-0">
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 py-12 text-center">
      <div className="text-3xl mb-3 opacity-80">{icon}</div>
      <p className="text-sm font-medium text-ink-heading">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 btn-primary-operator !px-4 !py-2 !text-sm"
        >
          Try again
        </button>
      )}
    </div>
  );
}
