import { useMemo } from 'react';
import { Select } from '../ui/Select.tsx';
import { canonicalImportOptions, requiredFieldLabels } from './inventoryConfig.tsx';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';

type Props = {
  headers: string[];
  rows: Record<string, string>[];
  mapping: Record<string, string>;
  suggestedMapping: Record<string, string>;
  onChange: (header: string, value: string) => void;
  error: string | null;
};

export function ImportStepMapping({ headers, rows, mapping, suggestedMapping, onChange, error }: Props) {
  const schema = useCategorySchema();

  // Compute first 3 non-empty values per column for the preview column
  const columnPreviews = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const h of headers) {
      out[h] = rows.slice(0, 8)
        .map(r => (r[h] ?? '').trim())
        .filter(Boolean)
        .slice(0, 3);
    }
    return out;
  }, [headers, rows]);

  // Which required fields still have no column mapped to them?
  const mappedCanonicals = useMemo(() => {
    const s = new Set<string>();
    for (const h of headers) {
      const v = mapping[h] ?? suggestedMapping[h] ?? '';
      if (v) s.add(v);
    }
    return s;
  }, [headers, mapping, suggestedMapping]);

  const fieldLabels = requiredFieldLabels(schema);
  const importOptions = canonicalImportOptions(schema);

  const missingRequired = useMemo(
    () => Object.keys(fieldLabels).filter(k => !mappedCanonicals.has(k)),
    [mappedCanonicals, fieldLabels],
  );

  const autoMappedCount = headers.filter(h => Boolean(suggestedMapping[h])).length;

  return (
    <div className="space-y-3">
      {/* Auto-map summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Map your column headers to inventory fields.
        </p>
        {autoMappedCount > 0 && (
          <span className="text-xs text-status-success-text bg-status-success-bg border border-status-success-border rounded px-2 py-0.5">
            ✓ {autoMappedCount} auto-detected
          </span>
        )}
      </div>

      {/* Missing required fields warning */}
      {missingRequired.length > 0 && (
        <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-xs font-semibold text-amber-700 mb-1">Required fields not yet mapped:</div>
          <div className="flex flex-wrap gap-1.5">
            {missingRequired.map(k => (
              <span key={k} className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded border border-amber-200">
                {fieldLabels[k]}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
      )}

      <div className="border border-silver-200 rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_11rem_minmax(0,1fr)] px-4 py-2 bg-silver-100 border-b border-silver-200 gap-3">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Your column</span>
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Maps to</span>
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Sample values</span>
        </div>

        {headers.map(h => {
          const current = mapping[h] ?? suggestedMapping[h] ?? '';
          const isAutoMapped = Boolean(suggestedMapping[h]) && current === suggestedMapping[h];
          const isRequired = current && fieldLabels[current];
          const preview = columnPreviews[h] ?? [];

          return (
            <div
              key={h}
              className={`grid grid-cols-[1fr_11rem_minmax(0,1fr)] px-4 py-2.5 border-b border-silver-100 last:border-0 gap-3 items-center
                ${isRequired ? 'hover:bg-status-success-bg/20' : 'hover:bg-surface-inset'} transition-colors`}
            >
              {/* Column name */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-mono text-ink-body truncate">{h}</span>
                {isAutoMapped && (
                  <span className="text-xs text-status-success-text shrink-0" title="Auto-detected">✓</span>
                )}
              </div>

              {/* Mapping select */}
              <Select
                value={current}
                options={importOptions}
                onChange={v => onChange(h, v)}
                highlighted
                className="w-44"
              />

              {/* Sample values */}
              <div className="flex gap-1 min-w-0 flex-wrap">
                {preview.length > 0 ? (
                  preview.map((val, i) => (
                    <span
                      key={i}
                      className="text-xs text-ink-faint bg-silver-100 border border-silver-100 rounded px-1.5 py-0.5 truncate max-w-[7rem]"
                      title={val}
                    >
                      {val}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-silver-300 italic">empty</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-ink-faint">
        Unmapped columns are ignored. Map all required fields above to avoid blocked rows.
      </p>
    </div>
  );
}
