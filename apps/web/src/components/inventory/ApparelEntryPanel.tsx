import { useState } from 'react';
import { createCategoryItem } from '@/lib/api/sdk.ts';
import { ApparelItemFields, apparelFieldsToData, type ApparelFields } from './ApparelItemFields.tsx';

type Phase = { step: 'idle' } | { step: 'creating' } | { step: 'created'; stockNumber: string };

const empty = (): ApparelFields => ({
  title: '', brand: '', size: '', color: '', material: '', era: '', measurements: '', conditionNotes: '',
});

function priceToCents(price: string): number {
  const parsed = parseFloat(price.replace(/[^0-9.]/g, ''));
  return Number.isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

export function ApparelEntryPanel({ dealerId, onCreated }: { dealerId: string; onCreated?: (itemId: string, stockNumber: string) => void }) {
  const [phase, setPhase] = useState<Phase>({ step: 'idle' });
  const [fields, setFields] = useState<ApparelFields>(empty());
  const [condition, setCondition] = useState('VINTAGE');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const priceCents = priceToCents(price);
  const valid = fields.title.trim().length > 0 && fields.size.trim().length > 0 && priceCents > 0;

  const create = async () => {
    setPhase({ step: 'creating' });
    setError(null);
    try {
      const result = await createCategoryItem(dealerId, {
        categoryId: 'APPAREL',
        condition,
        priceCents,
        data: apparelFieldsToData(fields),
      });
      setPhase({ step: 'created', stockNumber: result.stockNumber });
      onCreated?.(result.itemId, result.stockNumber);
    } catch (err: unknown) {
      setPhase({ step: 'idle' });
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (phase.step === 'created') {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
        <p className="text-xs text-green-700 font-medium">Garment added — Stock #{phase.stockNumber}</p>
        <button type="button" onClick={() => { setFields(empty()); setPrice(''); setPhase({ step: 'idle' }); }} className="text-xs font-semibold text-navy-700 hover:underline">Add another</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ApparelItemFields fields={fields} onChange={setFields} />
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-[11px] font-semibold text-ink-muted">
          Condition
          <select value={condition} onChange={event => setCondition(event.target.value)} className="mt-1 w-full text-sm px-3 py-1.5 border border-silver-200 rounded-lg bg-white">
            <option value="NEW">New</option>
            <option value="USED">Used</option>
            <option value="VINTAGE">Vintage</option>
          </select>
        </label>
        <label className="block text-[11px] font-semibold text-ink-muted">
          Price ($)
          <input value={price} onChange={event => setPrice(event.target.value)} className="mt-1 w-full text-sm px-3 py-1.5 border border-silver-200 rounded-lg" />
        </label>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <button type="button" disabled={!valid || phase.step === 'creating'} onClick={() => void create()} className="btn-primary-operator text-xs disabled:opacity-40">
        {phase.step === 'creating' ? 'Adding…' : 'Add garment'}
      </button>
    </div>
  );
}
