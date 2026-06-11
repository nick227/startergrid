import { getCategoryInventorySchema } from '@auto-dealer/category-schemas';
import type { BusinessCategoryId } from '@auto-dealer/category-schemas';

type ReadinessStatus = 'READY' | 'WARNING' | 'BLOCKED';

type DistributionSummary = {
  liveCount: number;
  queuedCount: number;
  failedCount: number;
  blockedCount: number;
  nextAction: string | null;
};

type InventoryRowItem = {
  id: string;
  category: BusinessCategoryId;
  primaryIdentifier: string;   // VIN for AUTOMOTIVE
  displayTitle: string;        // "2021 Toyota Camry SE"
  stockNumber: string;
  priceCents: number;
  condition: string;
  readiness: ReadinessStatus;
  readinessNextAction: string | null;
  mediaThumbnail: string | null;
  mediaCount: number;
  distribution?: DistributionSummary;
};

type Props = {
  item: InventoryRowItem;
  selected?: boolean;
  selectable?: boolean;
  onToggle?: (id: string) => void;
  onClick?: (id: string) => void;
};

const readinessBadge: Record<ReadinessStatus, { label: string; cls: string }> = {
  READY:   { label: 'Ready',   cls: 'bg-green-100 text-green-700 border-green-200' },
  WARNING: { label: 'Warning', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  BLOCKED: { label: 'Blocked', cls: 'bg-red-100 text-red-700 border-red-200' },
};

function formatPrice(cents: number) {
  return cents > 0 ? `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}` : '—';
}

export function InventoryRowCard({ item, selected, selectable, onToggle, onClick }: Props) {
  const schema = getCategoryInventorySchema(item.category);
  const primaryLabel = schema?.primaryIdentifier.label ?? 'ID';
  const badge = readinessBadge[item.readiness];

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
        selected ? 'border-navy-400 bg-navy-50' : 'border-silver-200 bg-white hover:bg-surface-raised'
      }`}
      onClick={() => onClick?.(item.id)}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={() => onToggle?.(item.id)}
          onClick={e => e.stopPropagation()}
          className="mt-1 shrink-0"
        />
      )}

      {item.mediaThumbnail ? (
        <img
          src={item.mediaThumbnail}
          alt={item.displayTitle}
          className="w-16 h-12 object-cover rounded-lg shrink-0 border border-silver-100"
        />
      ) : (
        <div className="w-16 h-12 rounded-lg bg-silver-100 border border-silver-200 flex items-center justify-center text-xl shrink-0">
          🚗
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-body truncate">{item.displayTitle}</p>
            <p className="text-xs text-ink-muted mt-0.5">
              <span className="font-mono">{primaryLabel} {item.primaryIdentifier}</span>
              {item.stockNumber && <span className="ml-2 text-ink-faint">#{item.stockNumber}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.cls}`}>
              {badge.label}
            </span>
            <span className="text-sm font-semibold text-ink-body">{formatPrice(item.priceCents)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-[11px] text-ink-muted">{item.condition}</span>
          <span className="text-[11px] text-ink-muted">{item.mediaCount} photo{item.mediaCount !== 1 ? 's' : ''}</span>

          {item.distribution && (
            <div className="flex items-center gap-1.5 text-[11px]">
              {item.distribution.liveCount > 0 && (
                <span className="text-green-600 font-medium">{item.distribution.liveCount} live</span>
              )}
              {item.distribution.queuedCount > 0 && (
                <span className="text-blue-600">{item.distribution.queuedCount} queued</span>
              )}
              {item.distribution.failedCount > 0 && (
                <span className="text-red-600 font-medium">{item.distribution.failedCount} failed</span>
              )}
              {item.distribution.blockedCount > 0 && (
                <span className="text-amber-600">{item.distribution.blockedCount} blocked</span>
              )}
            </div>
          )}
        </div>

        {(item.readinessNextAction || item.distribution?.nextAction) && (
          <p className="mt-1 text-[11px] text-ink-muted truncate">
            {item.readinessNextAction ?? item.distribution?.nextAction}
          </p>
        )}
      </div>
    </div>
  );
}
