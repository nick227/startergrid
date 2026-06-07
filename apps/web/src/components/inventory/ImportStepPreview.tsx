import { useState } from 'react';
import type { ImportPreviewResponse, ImportPreviewRow, ExistingSnapshot, ImportMappedRow } from '../../lib/types.ts';
import { ReadinessBadge, ActionBadge } from './inventoryConfig.tsx';
import { useInventoryLabels } from '@/contexts/CategoryContext.tsx';

type Props = {
  preview: ImportPreviewResponse;
  error: string | null;
  userSkips: Set<number>;
  onSkipToggle: (rowIndex: number) => void;
};

function fmt$$(cents: number) { return `$${(cents / 100).toLocaleString()}`; }
function fmtMi(mi: number) { return mi.toLocaleString() + ' mi'; }

function ChangeSummary({ existing, mapped }: { existing: ExistingSnapshot; mapped: ImportMappedRow }) {
  const changes: string[] = [];
  if (mapped.priceCents !== undefined && mapped.priceCents !== existing.priceCents)
    changes.push(`price ${fmt$$(existing.priceCents)} → ${fmt$$(mapped.priceCents)}`);
  if (mapped.mileage !== undefined && mapped.mileage !== existing.mileage)
    changes.push(`mileage ${fmtMi(existing.mileage)} → ${fmtMi(mapped.mileage)}`);
  if (mapped.condition && mapped.condition.toUpperCase() !== existing.condition)
    changes.push(`condition ${existing.condition} → ${mapped.condition.toUpperCase()}`);
  if (!changes.length) return <span className="text-xs text-ink-faint">no detected changes</span>;
  return (
    <span className="text-xs text-navy-700">
      {changes.join(' · ')}
    </span>
  );
}

export function ImportStepPreview({ preview, error, userSkips, onSkipToggle }: Props) {
  const labels = useInventoryLabels();
  const effectiveCommit = preview.rows.filter(
    r => (r.action === 'CREATE' || r.action === 'UPDATE') && !userSkips.has(r.rowIndex)
  ).length;
  const userSkipCount = [...userSkips].filter(idx => {
    const row = preview.rows.find(r => r.rowIndex === idx);
    return row && row.action !== 'SKIP';
  }).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',   value: preview.summary.total,      color: 'text-ink-body' },
          { label: 'Create',  value: preview.summary.willCreate, color: 'text-status-success-text' },
          { label: 'Update',  value: preview.summary.willUpdate, color: 'text-navy-700'  },
          { label: 'Blocked', value: preview.summary.blocked,    color: 'text-red-600'   },
        ].map(s => (
          <div key={s.label} className="bg-silver-100 rounded-lg px-3 py-2 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-ink-faint">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Notices */}
      {preview.unmappedColumns.length > 0 && (
        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          Ignored columns: {preview.unmappedColumns.join(', ')}
        </div>
      )}
      {userSkipCount > 0 && (
        <div className="px-3 py-2 bg-status-info-bg border border-status-info-border rounded-lg text-xs text-status-info-text">
          You marked {userSkipCount} row{userSkipCount !== 1 ? 's' : ''} to skip. {effectiveCommit} will be imported.
        </div>
      )}
      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
      )}

      {/* Row table */}
      <div className="border border-silver-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2rem_6rem_7rem_1fr_5rem_4rem_4rem] px-3 py-2 bg-silver-100 border-b border-silver-200 gap-2 text-xs">
          {['#', labels.refColumn, labels.canonicalId, labels.titleColumn, 'Status', 'Action', ''].map(h => (
            <span key={h} className="font-semibold text-ink-muted uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {preview.rows.map(row => (
          <PreviewRowItem
            key={row.rowIndex}
            row={row}
            skipped={userSkips.has(row.rowIndex)}
            onSkipToggle={() => onSkipToggle(row.rowIndex)}
          />
        ))}
      </div>

      {preview.summary.blocked > 0 && (
        <p className="text-xs text-ink-muted">
          {preview.summary.blocked} blocked row{preview.summary.blocked !== 1 ? 's' : ''} will be skipped automatically.
          Go back to fix column mappings or correct the source data.
        </p>
      )}
    </div>
  );
}

function PreviewRowItem({
  row, skipped, onSkipToggle
}: {
  row: ImportPreviewRow;
  skipped: boolean;
  onSkipToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const m = row.mapped;
  const title = [m.year, m.make, m.model, m.trim].filter(Boolean).join(' ');
  const canSkip = row.action === 'CREATE' || row.action === 'UPDATE';
  const canExpand = row.issues.length > 0 || (row.action === 'UPDATE' && row.existing != null);

  return (
    <>
      <div
        className={`grid grid-cols-[2rem_6rem_7rem_1fr_5rem_4rem_4rem] px-3 gap-2 border-b border-silver-100 last:border-0 text-xs items-center
          ${skipped ? 'opacity-40 bg-silver-100/50' : row.readiness === 'BLOCKED' ? 'bg-red-50/50' : row.readiness === 'WARNING' ? 'bg-amber-50/30' : ''}
          ${canExpand ? 'cursor-pointer hover:bg-surface-inset' : ''} transition-colors py-2.5`}
        onClick={() => canExpand && setExpanded(v => !v)}
      >
        <span className="text-ink-faint font-mono">{row.rowIndex}</span>
        <span className="font-mono text-ink-body truncate">{m.stockNumber ?? '—'}</span>
        <span className="font-mono text-ink-faint truncate">{m.vin ? `${m.vin.slice(0, 8)}…` : '—'}</span>
        <span className="text-ink-body truncate">{title || '—'}</span>
        <ReadinessBadge readiness={row.readiness} style="pill" />
        <ActionBadge action={skipped ? 'SKIP' : row.action} />
        {/* Skip toggle */}
        <div onClick={e => e.stopPropagation()}>
          {canSkip && (
            <button
              onClick={onSkipToggle}
              className={`text-xs px-1.5 py-0.5 rounded border transition-colors
                ${skipped
                  ? 'bg-silver-100 text-ink-muted border-silver-200 hover:bg-white'
                  : 'bg-white text-ink-faint border-silver-200 hover:text-red-600 hover:border-red-200'}`}
            >
              {skipped ? 'Undo' : 'Skip'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-6 pb-2 bg-silver-100 border-b border-silver-100 space-y-0.5">
          {/* UPDATE diff */}
          {row.action === 'UPDATE' && row.existing && (
            <div className="py-1">
              <ChangeSummary existing={row.existing} mapped={row.mapped} />
            </div>
          )}
          {/* Validation issues */}
          {row.issues.map((iss, i) => (
            <div key={i} className={`text-xs py-0.5 ${iss.severity === 'FAIL' ? 'text-red-600' : 'text-amber-600'}`}>
              {iss.severity === 'FAIL' ? '✕' : '⚠'} {iss.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
