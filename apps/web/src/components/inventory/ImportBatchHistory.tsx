import { useState, useEffect } from 'react';
import { fetchImportBatches } from '../../lib/api/sdk.ts';
import type { ImportBatch } from '../../lib/types.ts';
import { EMPTY_STATE_COPY } from '../../lib/statusRegistry.ts';
import { EmptyState } from '../ui';

type Props = {
  dealerId: string;
  latestBatchId?: string;
  initialOpen?: boolean;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function BatchRow({ batch, isLatest }: { batch: ImportBatch; isLatest: boolean }) {
  return (
    <div className={`px-5 py-2.5 flex items-start justify-between border-b border-silver-100 last:border-0
      ${isLatest ? 'bg-status-success-bg/60' : 'hover:bg-surface-inset'} transition-colors`}>
      <div>
        <div className="text-xs text-ink-body font-medium flex items-center gap-2">
          {isLatest && <span className="w-1.5 h-1.5 rounded-full bg-status-success-dot inline-block" />}
          <span className="text-status-success-text">{batch.created} created</span>
          <span className="text-navy-700">{batch.updated} updated</span>
          {batch.skipped > 0 && <span className="text-ink-faint">{batch.skipped} skipped</span>}
          {batch.errors > 0 && <span className="text-red-600">{batch.errors} errors</span>}
        </div>
        <div className="text-xs text-ink-faint mt-0.5">
          {batch.rowCount} rows · {batch.mappedFields.slice(0, 5).join(', ')}
          {batch.mappedFields.length > 5 && ` +${batch.mappedFields.length - 5} more`}
        </div>
      </div>
      <time className="text-xs text-silver-300 font-mono shrink-0 ml-4 mt-0.5">
        {relativeTime(batch.createdAt)}
      </time>
    </div>
  );
}

export function ImportBatchHistory({ dealerId, latestBatchId, initialOpen = false }: Props) {
  const [open, setOpen] = useState(initialOpen);
  const [batches, setBatches] = useState<ImportBatch[] | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBatches = () => {
    setLoading(true);
    fetchImportBatches(dealerId)
      .then(r => { setBatches(r.batches); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (!latestBatchId) return;
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestBatchId, dealerId]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && batches === null) loadBatches();
  };

  const hasBatches = batches && batches.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-surface-inset transition-colors border-b border-silver-100"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-muted">Show past imports</span>
          {batches !== null && (
            <span className="text-xs text-silver-300">({batches.length})</span>
          )}
        </div>
        <span className="text-ink-faint text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div>
          {loading && !hasBatches && (
            <div className="px-5 py-3 text-xs text-ink-faint animate-pulse">Loading…</div>
          )}
          {!loading && !hasBatches && (
            <EmptyState
              icon="📋"
              title={EMPTY_STATE_COPY.noImportHistory.title}
              subtitle={EMPTY_STATE_COPY.noImportHistory.subtitle}
            />
          )}
          {hasBatches && batches.map(b => (
            <BatchRow key={b.id} batch={b} isLatest={b.id === latestBatchId} />
          ))}
        </div>
      )}
    </div>
  );
}
