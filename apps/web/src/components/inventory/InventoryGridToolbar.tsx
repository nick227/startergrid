import { useState, useRef, useEffect, type ReactNode } from 'react';
import { INVENTORY_FIELD_REGISTRY, INVENTORY_COLUMN_PRESETS } from './fieldRegistry.ts';
import { inventoryLabels } from '@/lib/copy/index.ts';

type Props = {
  viewMode: 'table' | 'card';
  onChangeViewMode: (mode: 'table' | 'card') => void;
  activeColumns: string[];
  onChangeColumns: (cols: string[]) => void;
  search: string;
  onSearchChange: (s: string) => void;
  selectedCount: number;
  allSelected?: boolean;
  onToggleAll?: () => void;
  onClearSelection?: () => void;
  onPrintSelected?: () => void;
  onEditSelected?: () => void;
  extra?: ReactNode;
};

export function InventoryGridToolbar({
  viewMode, onChangeViewMode, activeColumns, onChangeColumns, search, onSearchChange, selectedCount, allSelected, onToggleAll, onClearSelection, onPrintSelected, onEditSelected, extra
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    if (pickerOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerOpen]);

  const allGroups = Array.from(new Set(Object.values(INVENTORY_FIELD_REGISTRY).map(f => f.group)));

  const handleToggleCol = (key: string) => {
    if (activeColumns.includes(key)) {
      onChangeColumns(activeColumns.filter(c => c !== key));
    } else {
      onChangeColumns([...activeColumns, key]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-2 border-b border-silver-100">
      <input
        type="text"
        placeholder={inventoryLabels().searchPlaceholder}
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        className="flex-1 min-w-[200px] max-w-sm px-3 py-1.5 text-sm border border-silver-200 rounded-md focus:outline-none focus:border-navy-500"
      />

      <div className="flex w-full max-w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
        {extra}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 mr-1">
            <span className="text-xs font-semibold text-navy-800 bg-navy-50 border border-navy-200 px-2.5 py-1 rounded-md">
              {selectedCount} selected
            </span>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="px-2 py-0.5 text-xs text-ink-muted hover:text-ink-body hover:underline"
                title="Clear selected vehicles"
              >
                Clear
              </button>
            )}
            {onEditSelected && (
              <button
                type="button"
                onClick={onEditSelected}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm transition-colors"
                title="Bulk edit selected vehicles with preview and safe undo"
              >
                <span>✏️ Bulk edit ({selectedCount})</span>
              </button>
            )}
            {onPrintSelected && (
              <button
                type="button"
                onClick={onPrintSelected}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-navy-900 hover:bg-navy-800 text-white rounded-md shadow-sm transition-colors"
                title="Print window stickers or Buyers Guides for selected vehicles"
              >
                <span>🖨️ Print documents ({selectedCount})</span>
              </button>
            )}
          </div>
        )}

        {/* Card View Select All */}
        {viewMode === 'card' && onToggleAll && (
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-ink-body cursor-pointer select-none border border-silver-200 rounded-md bg-white hover:bg-surface-raised transition-colors">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              aria-label="Select all vehicles in card view"
              className="w-3.5 h-3.5 accent-orange-600 rounded border-silver-300"
            />
            <span>Select all</span>
          </label>
        )}

        {/* View Toggle */}
        <div className="flex bg-silver-100 p-0.5 rounded-md border border-silver-200">
          <button
            onClick={() => onChangeViewMode('table')}
            className={`px-3 py-1 text-xs font-semibold rounded shadow-sm ${viewMode === 'table' ? 'bg-white text-ink-body' : 'text-ink-muted hover:text-ink-body'}`}
          >
            Table
          </button>
          <button
            onClick={() => onChangeViewMode('card')}
            className={`px-3 py-1 text-xs font-semibold rounded shadow-sm ${viewMode === 'card' ? 'bg-white text-ink-body' : 'text-ink-muted hover:text-ink-body'}`}
          >
            Cards
          </button>
        </div>

        {/* Column Picker */}
        {viewMode === 'table' && (
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setPickerOpen(!pickerOpen)}
              className="px-3 py-1.5 text-sm font-semibold border border-silver-200 rounded-md hover:bg-surface-raised bg-white"
            >
              Columns
            </button>
            {pickerOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 w-64 max-w-[calc(100vw-2rem)] bg-white border border-silver-200 rounded-lg shadow-elevation-2 z-50 p-2">
                <div className="text-xs font-bold text-ink-muted mb-2 uppercase px-2">Presets</div>
                <div className="flex flex-wrap gap-1 px-2 pb-3 border-b border-silver-100 mb-2">
                  {Object.entries(INVENTORY_COLUMN_PRESETS).map(([presetName, cols]) => (
                    <button
                      key={presetName}
                      onClick={() => onChangeColumns(cols)}
                      className="px-2 py-0.5 text-[10px] bg-silver-100 hover:bg-silver-200 rounded"
                    >
                      {presetName}
                    </button>
                  ))}
                </div>
                
                <div className="max-h-64 overflow-y-auto px-2">
                  {allGroups.map(group => (
                    <div key={group} className="mb-3">
                      <div className="text-xs font-bold text-ink-body mb-1">{group}</div>
                      <div className="space-y-1">
                        {Object.values(INVENTORY_FIELD_REGISTRY)
                          .filter(f => f.group === group)
                          .map(f => (
                            <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-surface-raised p-1 rounded">
                              <input
                                type="checkbox"
                                checked={activeColumns.includes(f.key)}
                                onChange={() => handleToggleCol(f.key)}
                                className="accent-orange-600"
                              />
                              <span className="truncate">{f.label}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
