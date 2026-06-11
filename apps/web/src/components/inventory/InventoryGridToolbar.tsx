import { useState, useRef, useEffect } from 'react';
import { INVENTORY_FIELD_REGISTRY, INVENTORY_COLUMN_PRESETS } from './fieldRegistry.ts';

type Props = {
  viewMode: 'table' | 'card';
  onChangeViewMode: (mode: 'table' | 'card') => void;
  activeColumns: string[];
  onChangeColumns: (cols: string[]) => void;
  search: string;
  onSearchChange: (s: string) => void;
  selectedCount: number;
};

export function InventoryGridToolbar({
  viewMode, onChangeViewMode, activeColumns, onChangeColumns, search, onSearchChange, selectedCount
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
        placeholder="Search inventory..."
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        className="flex-1 min-w-[200px] max-w-sm px-3 py-1.5 text-sm border border-silver-200 rounded-md focus:outline-none focus:border-navy-500"
      />

      <div className="ml-auto flex items-center gap-2">
        {selectedCount > 0 && (
          <span className="text-xs font-semibold text-orange-600 mr-2">{selectedCount} selected</span>
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
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-silver-200 rounded-lg shadow-elevation-2 z-50 p-2">
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
