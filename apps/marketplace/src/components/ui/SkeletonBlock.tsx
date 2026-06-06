type Props = { className?: string };

export function SkeletonBlock({ className = 'h-4 w-full' }: Props) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} aria-hidden="true" />;
}

type SpinnerProps = { label?: string };

export function LoadingSpinner({ label = 'Loading…' }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" role="status" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
