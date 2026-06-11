type Props = { className?: string };

export function SkeletonBlock({ className = 'h-4 w-full' }: Props) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} aria-hidden="true" />;
}
