type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: Props) {
  return (
    <div className="mp-card border-dashed px-5 py-12 text-center sm:px-8 sm:py-16" role="status">
      <p className="text-lg font-semibold text-ink-heading">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{description}</p>
      )}
      {(actionLabel || secondaryLabel) && (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
          {actionLabel && onAction && (
            <button type="button" onClick={onAction} className="mp-btn-primary w-full sm:w-auto">
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondary && (
            <button type="button" onClick={onSecondary} className="mp-btn-secondary w-full sm:w-auto">
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
