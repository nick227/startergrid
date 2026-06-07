export function FeedCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mp-grid-vehicles" aria-busy="true" aria-label="Loading feed">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="mp-card overflow-hidden">
          <div className="mp-aspect-vehicle animate-pulse rounded-lg bg-silver-200" />
          <div className="space-y-4 p-5">
            <div className="h-5 w-3/4 animate-pulse rounded bg-silver-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-silver-100" />
            <div className="rounded-lg bg-surface-inset p-3">
              <div className="h-7 w-28 animate-pulse rounded bg-silver-200" />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="h-4 animate-pulse rounded bg-silver-200" />
                <div className="h-4 animate-pulse rounded bg-silver-200" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingMoreState() {
  return (
    <div className="mt-8 flex justify-center" aria-live="polite">
      <span className="rounded-pill border border-silver-200 bg-white px-4 py-2 text-sm font-semibold text-ink-muted shadow-elevation-1">
        Loading more vehicles...
      </span>
    </div>
  );
}

export function EndOfFeedState({ onClear, onTop, canClear }: { onClear: () => void; onTop: () => void; canClear: boolean }) {
  return (
    <div className="mt-10 rounded-xl border border-silver-200 bg-white p-6 text-center shadow-elevation-1">
      <h2 className="text-lg font-semibold text-ink-heading">You have seen all matching inventory</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
        Adjust your filters or jump back to the top to keep browsing.
      </p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        {canClear && (
          <button type="button" className="mp-btn-secondary" onClick={onClear}>
            Clear filters
          </button>
        )}
        <button type="button" className="mp-btn-primary" onClick={onTop}>
          Back to top
        </button>
      </div>
    </div>
  );
}
