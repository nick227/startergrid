import { useState } from 'react';
import { createCategoryItem } from '@/lib/api/sdk.ts';
import { SongItemFields, songFieldsToData, type SongFields } from './SongItemFields.tsx';

type Phase =
  | { step: 'idle' }
  | { step: 'creating' }
  | { step: 'created'; itemId: string; stockNumber: string };

type Props = {
  dealerId: string;
  onCreated?: (itemId: string, stockNumber: string) => void;
};

function emptyForm(): SongFields {
  return {
    title: '',
    artist: '',
    label: '',
    format: 'Digital Album',
    genre: '',
    trackCount: '',
    releaseYear: '',
    isrc: '',
  };
}

function priceToCents(price: string): number {
  const parsed = parseFloat(price.replace(/[^0-9.]/g, ''));
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

export function SongEntryPanel({ dealerId, onCreated }: Props) {
  const [phase, setPhase] = useState<Phase>({ step: 'idle' });
  const [form, setForm] = useState<SongFields>(emptyForm());
  const [price, setPrice] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const isCreating = phase.step === 'creating';
  const priceCents = priceToCents(price);
  const isFormValid = form.title.trim().length > 0 && form.artist.trim().length > 0 && priceCents >= 0;

  const handleCreate = async () => {
    setPhase({ step: 'creating' });
    setCreateError(null);
    try {
      const data = songFieldsToData(form);
      const result = await createCategoryItem(dealerId, {
        categoryId: 'SONGS',
        priceCents,
        data,
      });
      setPhase({ step: 'created', itemId: result.itemId, stockNumber: result.stockNumber });
      onCreated?.(result.itemId, result.stockNumber);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPhase({ step: 'idle' });
      setCreateError(msg);
    }
  };

  const handleReset = () => {
    setForm(emptyForm());
    setPrice('');
    setPhase({ step: 'idle' });
    setCreateError(null);
  };

  if (phase.step === 'created') {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
        <p className="text-xs text-green-700 font-medium">
          Release added — Stock #{phase.stockNumber}
        </p>
        <button type="button" onClick={handleReset} className="text-xs font-semibold text-navy-700 hover:underline">
          Add another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SongItemFields fields={form} onChange={setForm} readOnly={isCreating} />

      <div>
        <label className="block text-[11px] font-semibold text-ink-muted mb-1">
          Price <span className="text-red-500">*</span>
        </label>
        <div className="relative w-40">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">$</span>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            disabled={isCreating}
            placeholder="0.99"
            min={0}
            step={0.01}
            className="w-full text-sm pl-6 pr-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50"
          />
        </div>
      </div>

      {createError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {createError}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!isFormValid || isCreating}
          className="flex-1 px-4 py-2 bg-navy-900 text-white text-sm font-semibold rounded-lg disabled:opacity-40"
        >
          {isCreating ? 'Adding…' : 'Add release'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isCreating}
          className="px-4 py-2 text-sm text-ink-muted border border-silver-200 rounded-lg hover:bg-silver-100 disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
