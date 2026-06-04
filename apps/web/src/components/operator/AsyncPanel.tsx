import { ErrorState } from './ErrorState.tsx';

export function PanelSkeleton({ rows = 4, height = 'h-3' }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-slate-100 rounded animate-pulse ${i % 2 === 0 ? 'w-full' : 'w-4/5'}`}
        />
      ))}
    </div>
  );
}

export function PanelError({ label, error, onRetry }: { label: string; error: string; onRetry: () => void }) {
  return <ErrorState message={error} label={label} onRetry={onRetry} compact />;
}

type AsyncPanelProps = {
  label: string;
  loading: boolean;
  error: string | null;
  hasData: boolean;
  onRetry: () => void;
  skeletonRows?: number;
  children: React.ReactNode;
};

export function AsyncPanel({
  label,
  loading,
  error,
  hasData,
  onRetry,
  skeletonRows = 4,
  children,
}: AsyncPanelProps) {
  return (
    <>
      {error && <PanelError label={label} error={error} onRetry={onRetry} />}
      {loading && !hasData ? <PanelSkeleton rows={skeletonRows} /> : hasData ? children : null}
    </>
  );
}
