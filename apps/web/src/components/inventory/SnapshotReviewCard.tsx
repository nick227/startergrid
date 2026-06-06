import { useState } from 'react';
import type { IngressSnapshotReview } from '@/lib/types.ts';
import { commitSnapshotRemovals } from '@/lib/api/sdk.ts';
import { LIFECYCLE_SOURCE_LABELS } from '@/lib/lifecycleDisplay.ts';

type Props = {
  dealerId: string;
  ingressRunId: string;
  review: IngressSnapshotReview;
  onCommitted: () => void;
};

export function SnapshotReviewCard({ dealerId, ingressRunId, review, onCommitted }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(review.candidates.map(c => c.stockNumber)),
  );
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  if (review.pendingCount === 0) return null;

  const toggle = (stock: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(stock)) next.delete(stock);
      else next.add(stock);
      return next;
    });
  };

  const handleCommit = async () => {
    if (selected.size === 0) return;
    setCommitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await commitSnapshotRemovals(dealerId, {
        ingressRunId,
        stockNumbers: [...selected],
      });
      setResult(`Marked ${res.applied} as removed (${LIFECYCLE_SOURCE_LABELS.feed_snapshot.toLowerCase()}).`);
      onCommitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Commit failed');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div
      data-testid="snapshot-review-card"
      className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 space-y-2"
    >
      <div>
        <p className="text-xs font-bold text-amber-900">
          {review.candidates.length} missing from latest feed
        </p>
        <p className="text-[11px] text-amber-800 mt-0.5">
          Dry-run snapshot — review before marking removed. This is not a sale.
        </p>
      </div>

      <ul className="space-y-1 max-h-32 overflow-y-auto">
        {review.candidates.map(c => (
          <li key={c.stockNumber} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={selected.has(c.stockNumber)}
              onChange={() => toggle(c.stockNumber)}
              className="rounded border-amber-300"
            />
            <span className="font-mono font-semibold text-slate-800">{c.stockNumber}</span>
            <span className="text-amber-700 truncate">{c.label}</span>
          </li>
        ))}
      </ul>

      {error && <p className="text-[11px] text-red-700">{error}</p>}
      {result && <p className="text-[11px] text-emerald-800 font-medium">{result}</p>}

      <button
        type="button"
        disabled={committing || selected.size === 0}
        onClick={() => void handleCommit()}
        className="px-3 py-1.5 text-xs font-bold bg-amber-800 hover:bg-amber-900 text-white rounded-lg disabled:opacity-50"
      >
        {committing ? 'Committing…' : `Commit ${selected.size} as removed`}
      </button>
    </div>
  );
}
