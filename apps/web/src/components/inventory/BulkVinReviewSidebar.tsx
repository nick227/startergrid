import { useState } from 'react';
import type { BulkVinPreviewRow } from '@/lib/api/sdk.ts';

type ValidRowState = {
  vin: string;
  decoded: NonNullable<BulkVinPreviewRow['decoded']>;
  stockNumber: string;
  priceDollars: string;
  condition: 'NEW' | 'USED' | 'CPO';
};

type Props = {
  dealerId: string;
  previewRows: BulkVinPreviewRow[];
  onClose: () => void;
  onCommit: (commits: { vin: string; stockNumber: string; priceCents?: number; condition: string }[]) => void;
  isCommitting: boolean;
};

export function BulkVinReviewSidebar({ dealerId, previewRows, onClose, onCommit, isCommitting }: Props) {
  const validRows = previewRows.filter(r => r.status === 'OK' && r.decoded);
  const invalidRows = previewRows.filter(r => r.status !== 'OK');

  const [rowStates, setRowStates] = useState<Record<string, ValidRowState>>(() => {
    const init: Record<string, ValidRowState> = {};
    for (const r of validRows) {
      if (r.decoded) {
        init[r.vin] = {
          vin: r.vin,
          decoded: r.decoded,
          stockNumber: '',
          priceDollars: '',
          condition: 'USED',
        };
      }
    }
    return init;
  });

  const [currentIndex, setCurrentIndex] = useState(0);

  if (validRows.length === 0) {
    return (
      <div className="fixed inset-y-0 right-0 w-[480px] bg-white border-l border-silver-200 shadow-elevation-4 z-50 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-silver-200">
          <h2 className="text-lg font-bold text-ink-heading">Review Bulk VINs</h2>
          <button onClick={onClose} className="text-silver-400 hover:text-ink-body transition-colors">
            ✕
          </button>
        </div>
        <div className="p-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            No valid new VINs found. {invalidRows.length} VIN(s) were skipped (duplicates or invalid).
          </div>
          <button onClick={onClose} className="mt-4 w-full py-2 bg-navy-900 text-white rounded-lg text-sm font-semibold">
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentVin = validRows[currentIndex]?.vin;
  const currentState = currentVin ? rowStates[currentVin] : null;

  const handleUpdateCurrent = (updates: Partial<ValidRowState>) => {
    if (!currentVin) return;
    setRowStates(prev => ({
      ...prev,
      [currentVin]: { ...prev[currentVin], ...updates },
    }));
  };

  const handleNext = () => {
    if (currentIndex < validRows.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmitAll = () => {
    const commits = validRows.map(r => {
      const state = rowStates[r.vin];
      let priceCents: number | undefined;
      if (state.priceDollars.trim()) {
        const cents = Math.round(parseFloat(state.priceDollars.replace(/[^0-9.]/g, '')) * 100);
        if (cents > 0) priceCents = cents;
      }
      return {
        vin: r.vin,
        stockNumber: state.stockNumber.trim(),
        priceCents,
        condition: state.condition,
      };
    });
    onCommit(commits);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-silver-200 shadow-elevation-4 z-50 flex flex-col transform transition-transform duration-300">
      <div className="flex items-center justify-between p-5 border-b border-silver-200 bg-surface-inset">
        <div>
          <h2 className="text-base font-bold text-ink-heading">Review & Add Vehicles</h2>
          <p className="text-xs text-ink-muted mt-1">{validRows.length} vehicle(s) ready to add</p>
        </div>
        <button type="button" onClick={onClose} className="p-2 text-silver-400 hover:text-ink-body bg-white rounded-md border border-silver-200 shadow-sm transition-colors">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Progress header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm font-semibold text-ink-body">
            Vehicle {currentIndex + 1} of {validRows.length}
          </div>
          <div className="flex gap-1">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1 rounded bg-silver-100 text-ink-muted hover:text-ink-body disabled:opacity-30 disabled:hover:text-ink-muted"
            >
              ◀
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === validRows.length - 1}
              className="p-1 rounded bg-silver-100 text-ink-muted hover:text-ink-body disabled:opacity-30 disabled:hover:text-ink-muted"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Decoder result card */}
        {currentState && (
          <div className="space-y-6">
            <div className="p-4 bg-surface-raised border border-silver-200 rounded-xl">
              <h3 className="text-xs font-bold text-ink-body mb-3 uppercase tracking-wider">Decoded Specs</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="col-span-2 mb-2">
                  <dt className="text-xs text-ink-muted">VIN</dt>
                  <dd className="font-mono text-ink-heading">{currentState.vin}</dd>
                </div>
                {currentState.decoded.year && <><dt className="text-ink-muted">Year</dt><dd className="font-medium text-ink-body">{currentState.decoded.year}</dd></>}
                {currentState.decoded.make && <><dt className="text-ink-muted">Make</dt><dd className="font-medium text-ink-body">{currentState.decoded.make}</dd></>}
                {currentState.decoded.model && <><dt className="text-ink-muted">Model</dt><dd className="font-medium text-ink-body">{currentState.decoded.model}</dd></>}
                {currentState.decoded.trim && <><dt className="text-ink-muted">Trim</dt><dd className="font-medium text-ink-body">{currentState.decoded.trim}</dd></>}
                {currentState.decoded.bodyStyle && <><dt className="text-ink-muted">Body</dt><dd className="font-medium text-ink-body">{currentState.decoded.bodyStyle}</dd></>}
                {currentState.decoded.fuelType && <><dt className="text-ink-muted">Fuel</dt><dd className="font-medium text-ink-body">{currentState.decoded.fuelType}</dd></>}
              </dl>
              {!currentState.decoded.decoded && (
                <p className="mt-3 text-[11px] text-amber-600 bg-amber-50 p-2 rounded">
                  VIN not found in decoder — will be created with VIN only.
                </p>
              )}
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-body mb-1">Stock Number</label>
                <input
                  type="text"
                  value={currentState.stockNumber}
                  onChange={e => handleUpdateCurrent({ stockNumber: e.target.value })}
                  placeholder="Auto-generated if blank"
                  className="w-full text-sm px-3 py-2 border border-silver-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-body mb-1">List Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">$</span>
                  <input
                    type="text"
                    value={currentState.priceDollars}
                    onChange={e => handleUpdateCurrent({ priceDollars: e.target.value })}
                    placeholder="0.00"
                    className="w-full text-sm pl-6 pr-3 py-2 border border-silver-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-body mb-1">Condition</label>
                <div className="flex gap-2">
                  {(['USED', 'NEW', 'CPO'] as const).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleUpdateCurrent({ condition: c })}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        currentState.condition === c
                          ? 'bg-navy-900 text-white border-navy-900'
                          : 'bg-white text-ink-body border-silver-200 hover:border-navy-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Skipped VINs info block at the bottom */}
        {invalidRows.length > 0 && (
          <div className="mt-8 pt-6 border-t border-silver-200">
            <h4 className="text-xs font-semibold text-ink-body mb-2">Skipped VINs</h4>
            <div className="bg-surface-raised border border-silver-200 rounded-lg max-h-32 overflow-y-auto">
              {invalidRows.map(r => (
                <div key={r.vin} className="px-3 py-2 border-b border-silver-100 last:border-0 text-[11px] flex items-center justify-between">
                  <span className="font-mono text-ink-muted">{r.vin}</span>
                  <span className={r.status === 'DUPLICATE' ? 'text-amber-600' : 'text-red-600'}>
                    {r.error ?? r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-5 border-t border-silver-200 bg-white">
        {currentIndex < validRows.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="w-full py-2.5 bg-surface-raised border border-silver-300 text-ink-body text-sm font-semibold rounded-lg hover:bg-silver-100 transition-colors"
          >
            Next Vehicle
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmitAll}
            disabled={isCommitting}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {isCommitting ? 'Importing...' : `Import ${validRows.length} Vehicles`}
          </button>
        )}
      </div>
    </div>
  );
}
