import { useState } from 'react';
import { Select } from '../ui/Select.tsx';

export type FieldDef = {
  key: string;
  type: 'text' | 'select';
  placeholder?: string;
  width?: string;
  options?: { value: string; label: string }[];
};

type Props = {
  count: number;
  fieldDefs: FieldDef[];
  onApply: (values: Record<string, string>) => Promise<void>;
  onClear: () => void;
};

export function BulkActionBar({ count, fieldDefs, onApply, onClear }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string) => (v: string) => setValues(vs => ({ ...vs, [key]: v }));

  const handleApply = async () => {
    const nonEmpty = Object.fromEntries(Object.entries(values).filter(([, v]) => Boolean(v)));
    if (!Object.keys(nonEmpty).length) { setError('Fill in at least one field'); return; }
    setSaving(true);
    setError(null);
    try {
      await onApply(nonEmpty);
      setValues({});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => { setValues({}); onClear(); };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface-card border-t border-silver-200 shadow-elevation-3 z-40">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-ink-body shrink-0">{count} selected — bulk edit:</span>
          {fieldDefs.map(f =>
            f.type === 'select' ? (
              <Select
                key={f.key}
                value={values[f.key] ?? ''}
                options={f.options ?? []}
                onChange={set(f.key)}
              />
            ) : (
              <input
                key={f.key}
                value={values[f.key] ?? ''}
                onChange={e => set(f.key)(e.target.value)}
                placeholder={f.placeholder}
                className={`${f.width ?? 'w-28'} px-2 py-1 text-xs border border-silver-200 rounded field-input-base !py-1 !px-2`}
              />
            )
          )}
          {error && <span className="text-xs text-status-error-text">{error}</span>}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleClear} className="px-3 py-1.5 text-xs text-ink-muted hover:text-ink-heading transition-colors">
              Clear
            </button>
            <button
              onClick={() => void handleApply()}
              disabled={saving}
              className="btn-primary-operator"
            >
              {saving ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
