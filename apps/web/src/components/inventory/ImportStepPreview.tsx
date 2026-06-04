import { useState } from 'react';
import type { ImportPreviewResponse, ImportPreviewRow, ExistingSnapshot, ImportMappedRow } from '../../lib/types.ts';
import { ReadinessBadge, ActionBadge } from './inventoryConfig.tsx';

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
  if (!changes.length) return <span className="text-xs text-slate-400">no detected changes</span>;
  return (
    <span className="text-xs text-blue-600">
      {changes.join(' · ')}
    </span>
  );
}

export function ImportStepPreview({ preview, error, userSkips, onSkipToggle }: Props) {
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
          { label: 'Total',   value: preview.summary.total,      color: 'text-slate-700' },
          { label: 'Create',  value: preview.summary.willCreate, color: 'text-green-700' },
          { label: 'Update',  value: preview.summary.willUpdate, color: 'text-blue-700'  },
          { label: 'Blocked', value: preview.summary.blocked,    color: 'text-red-600'   },
        ].map(s => (
          <div key={s.label} className="bg-slate-50 rounded-lg px-3 py-2 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
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
        <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          You marked {userSkipCount} row{userSkipCount !== 1 ? 's' : ''} to skip. {effectiveCommit} will be imported.
        </div>
      )}
      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
      )}

      {/* Row table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2rem_6rem_7rem_1fr_5rem_4rem_4rem] px-3 py-2 bg-slate-50 border-b border-slate-200 gap-2 text-xs">
          {['#', 'Stock', 'VIN', 'Vehicle', 'Status', 'Action', ''].map(h => (
            <span key={h} className="font-semibold text-slate-500 uppercase tracking-wide">{h}</span>
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
        <p className="text-xs text-slate-500">
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
  const vehicle = [m.year, m.make, m.model, m.trim].filter(Boolean).join(' ');
  const canSkip = row.action === 'CREATE' || row.action === 'UPDATE';
  const canExpand = row.issues.length > 0 || (row.action === 'UPDATE' && row.existing != null);

  return (
    <>
      <div
        className={`grid grid-cols-[2rem_6rem_7rem_1fr_5rem_4rem_4rem] px-3 gap-2 border-b border-slate-50 last:border-0 text-xs items-center
          ${skipped ? 'opacity-40 bg-slate-50/50' : row.readiness === 'BLOCKED' ? 'bg-red-50/50' : row.readiness === 'WARNING' ? 'bg-amber-50/30' : ''}
          ${canExpand ? 'cursor-pointer hover:bg-slate-50' : ''} transition-colors py-2.5`}
        onClick={() => canExpand && setExpanded(v => !v)}
      >
        <span className="text-slate-400 font-mono">{row.rowIndex}</span>
        <span className="font-mono text-slate-700 truncate">{m.stockNumber ?? '—'}</span>
        <span className="font-mono text-slate-400 truncate">{m.vin ? `${m.vin.slice(0, 8)}…` : '—'}</span>
        <span className="text-slate-600 truncate">{vehicle || '—'}</span>
        <ReadinessBadge readiness={row.readiness} style="pill" />
        <ActionBadge action={skipped ? 'SKIP' : row.action} />
        {/* Skip toggle */}
        <div onClick={e => e.stopPropagation()}>
          {canSkip && (
            <button
              onClick={onSkipToggle}
              className={`text-xs px-1.5 py-0.5 rounded border transition-colors
                ${skipped
                  ? 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-white'
                  : 'bg-white text-slate-400 border-slate-200 hover:text-red-600 hover:border-red-200'}`}
            >
              {skipped ? 'Undo' : 'Skip'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-6 pb-2 bg-slate-50 border-b border-slate-100 space-y-0.5">
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
