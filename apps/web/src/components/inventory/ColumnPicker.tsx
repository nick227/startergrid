import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { INVENTORY_COLUMN_PRESETS, INVENTORY_FIELD_REGISTRY } from './fieldRegistry.ts';

type Props = {
  activeColumns: string[];
  onChangeColumns: (cols: string[]) => void;
  sheet: boolean;
  onShowSheet: () => void;
  onShowRows: () => void;
};

export function ColumnPicker({ activeColumns, onChangeColumns, sheet, onShowSheet, onShowRows }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const groups = Array.from(new Set(Object.values(INVENTORY_FIELD_REGISTRY).map(field => field.group)));

  const toggleColumn = (key: string) => {
    onShowSheet();
    if (activeColumns.includes(key)) onChangeColumns(activeColumns.filter(col => col !== key));
    else onChangeColumns([...activeColumns, key]);
  };

  return (
    <div className="relative" ref={ref}>
      <Button variant={sheet ? 'primary' : 'secondary'} size="sm" pressed={sheet} onClick={() => setOpen(value => !value)}>
        Columns
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-silver-200 bg-white p-2 shadow-elevation-2 sm:left-auto sm:right-0">
          <Button variant="ghost" size="sm" onClick={() => { onShowRows(); setOpen(false); }}>
            Compact rows
          </Button>
          <div className="mb-2 mt-2 border-b border-silver-100 px-2 pb-3">
            <div className="mb-2 text-xs font-bold uppercase text-ink-muted">Presets</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(INVENTORY_COLUMN_PRESETS).map(([name, cols]) => (
                <Button key={name} variant="secondary" size="sm" onClick={() => { onChangeColumns(cols); onShowSheet(); }}>
                  {name}
                </Button>
              ))}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto px-2">
            {groups.map(group => (
              <div key={group} className="mb-3">
                <div className="mb-1 text-xs font-bold text-ink-body">{group}</div>
                <div className="space-y-1">
                  {Object.values(INVENTORY_FIELD_REGISTRY).filter(field => field.group === group).map(field => (
                    <label key={field.key} className="flex cursor-pointer items-center gap-2 rounded p-1 text-xs hover:bg-surface-raised">
                      <input
                        type="checkbox"
                        checked={activeColumns.includes(field.key)}
                        onChange={() => toggleColumn(field.key)}
                        className="accent-orange-600"
                      />
                      <span className="truncate">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
