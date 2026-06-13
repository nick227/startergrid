import { useState } from 'react';
import {
  decodeCategoryIdentifier,
  createCategoryItem,
} from '@/lib/api/sdk.ts';

const ISBN_PATTERN = /^97[89]\d{10}$/;
const EBOOK_FORMATS = ['EPUB', 'PDF', 'MOBI', 'AUDIOBOOK', 'PRINT'] as const;

type FormState = {
  sku: string;
  title: string;
  author: string;
  /** Dollar string, e.g. "9.99". Converted to cents on submit. */
  price: string;
  format: string;
  publisher: string;
  language: string;
  pageCount: string;
  isbn: string;
  asin: string;
};

type Phase =
  | { step: 'idle' }
  | { step: 'decoding' }
  | { step: 'invalid'; error: string }
  | { step: 'duplicate'; existingItemId: string; existingStockNumber: string | null }
  | { step: 'form'; decodedMetadata: boolean }
  | { step: 'creating' }
  | { step: 'created'; itemId: string; stockNumber: string };

type Props = {
  dealerId: string;
  onCreated?: (itemId: string, stockNumber: string) => void;
};

function emptyForm(prefill: Partial<FormState> = {}): FormState {
  return {
    sku: '',
    title: '',
    author: '',
    price: '',
    format: 'EPUB',
    publisher: '',
    language: 'English',
    pageCount: '',
    isbn: '',
    asin: '',
    ...prefill,
  };
}

function priceToCents(price: string): number {
  const parsed = parseFloat(price.replace(/[^0-9.]/g, ''));
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

export function EbookEntryPanel({ dealerId, onCreated }: Props) {
  const [isbnInput, setIsbnInput] = useState('');
  const [phase, setPhase] = useState<Phase>({ step: 'idle' });
  const [form, setForm] = useState<FormState>(emptyForm());
  const [createError, setCreateError] = useState<string | null>(null);

  const handleLookup = async () => {
    const normalized = isbnInput.replace(/[-\s]/g, '');
    if (!ISBN_PATTERN.test(normalized)) {
      setPhase({ step: 'invalid', error: 'ISBN must be 13 digits starting with 978 or 979.' });
      return;
    }
    setPhase({ step: 'decoding' });
    try {
      const result = await decodeCategoryIdentifier(dealerId, 'EBOOKS', normalized);
      if (result.duplicate && result.existingItemId) {
        setPhase({
          step: 'duplicate',
          existingItemId: result.existingItemId,
          existingStockNumber: result.existingStockNumber,
        });
        return;
      }
      const fields = result.fields as Record<string, unknown>;
      setForm(emptyForm({
        isbn:      normalized,
        title:     typeof fields['title']     === 'string' ? fields['title']     : '',
        author:    typeof fields['author']     === 'string' ? fields['author']     : '',
        publisher: typeof fields['publisher'] === 'string' ? fields['publisher'] : '',
      }));
      setPhase({ step: 'form', decodedMetadata: result.decoded });
    } catch (err: unknown) {
      setPhase({ step: 'invalid', error: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleSkipToForm = () => {
    setForm(emptyForm({ isbn: isbnInput.replace(/[-\s]/g, '') }));
    setPhase({ step: 'form', decodedMetadata: false });
  };

  const handleCreate = async () => {
    const priceCents = priceToCents(form.price);
    if (!form.title.trim() || priceCents < 1) return;

    setPhase({ step: 'creating' });
    setCreateError(null);
    try {
      const data: Record<string, unknown> = { title: form.title.trim(), format: form.format };
      if (form.author.trim())    data['author']    = form.author.trim();
      if (form.publisher.trim()) data['publisher'] = form.publisher.trim();
      if (form.language.trim())  data['language']  = form.language.trim();
      if (form.pageCount)        data['pageCount'] = parseInt(form.pageCount, 10);
      if (form.isbn.trim())      data['isbn']      = form.isbn.trim();
      if (form.asin.trim())      data['asin']      = form.asin.trim();

      const result = await createCategoryItem(dealerId, {
        categoryId: 'EBOOKS',
        primaryIdentifier: form.sku.trim() || undefined,
        priceCents,
        data,
      });
      setPhase({ step: 'created', itemId: result.itemId, stockNumber: result.stockNumber });
      onCreated?.(result.itemId, result.stockNumber);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('already exists')) {
        setPhase({ step: 'duplicate', existingItemId: '', existingStockNumber: null });
      } else {
        setPhase({ step: 'form', decodedMetadata: false });
        setCreateError(msg);
      }
    }
  };

  const handleReset = () => {
    setIsbnInput('');
    setForm(emptyForm());
    setPhase({ step: 'idle' });
    setCreateError(null);
  };

  const setField = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const isFormValid = form.title.trim().length > 0 && priceToCents(form.price) >= 1;
  const isCreating = phase.step === 'creating';

  return (
    <div className="space-y-4">
      {/* ── ISBN lookup ── */}
      {(phase.step === 'idle' || phase.step === 'invalid' || phase.step === 'decoding') && (
        <div>
          <label className="block text-xs font-semibold text-ink-body mb-1.5">
            ISBN Lookup <span className="font-normal text-ink-muted">(optional — pre-fills title and author)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={isbnInput}
              onChange={e => setIsbnInput(e.target.value)}
              placeholder="978-XXXXXXXXXX (13 digits)"
              maxLength={17}
              disabled={phase.step === 'decoding'}
              className="flex-1 font-mono text-sm px-3 py-2 border border-silver-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50"
              onKeyDown={e => e.key === 'Enter' && phase.step !== 'decoding' && isbnInput.trim() && handleLookup()}
            />
            <button
              type="button"
              onClick={handleLookup}
              disabled={phase.step === 'decoding' || !isbnInput.trim()}
              className="px-3 py-2 bg-navy-900 text-white text-sm font-semibold rounded-lg disabled:opacity-40"
            >
              {phase.step === 'decoding' ? 'Looking up…' : 'Look up'}
            </button>
          </div>
          <button
            type="button"
            onClick={handleSkipToForm}
            className="mt-2 text-xs text-navy-700 hover:underline"
          >
            Skip — enter details manually
          </button>

          {phase.step === 'invalid' && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {phase.error}
            </div>
          )}
        </div>
      )}

      {phase.step === 'duplicate' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 space-y-1">
          <p className="font-medium">This item is already in your inventory.</p>
          {phase.existingStockNumber && (
            <p className="text-ink-muted">Stock #{phase.existingStockNumber}</p>
          )}
          <button type="button" onClick={handleReset} className="mt-1 text-xs font-semibold text-navy-700 hover:underline">
            Start over
          </button>
        </div>
      )}

      {/* ── Entry form ── */}
      {(phase.step === 'form' || isCreating) && (
        <div className="space-y-3">
          {phase.step === 'form' && !phase.decodedMetadata && form.isbn && (
            <div className="p-2.5 bg-silver-50 border border-silver-200 rounded-lg text-[11px] text-ink-muted">
              ISBN recognized — no metadata available. Fill in details below.
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">
              SKU / Work ID <span className="text-ink-faint">(auto-generated if blank)</span>
            </label>
            <input
              type="text"
              value={form.sku}
              onChange={setField('sku')}
              disabled={isCreating}
              placeholder="Leave blank to auto-generate"
              className="w-full text-sm px-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={setField('title')}
              disabled={isCreating}
              placeholder="Book title"
              className="w-full text-sm px-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">Author</label>
              <input
                type="text"
                value={form.author}
                onChange={setField('author')}
                disabled={isCreating}
                placeholder="Author name"
                className="w-full text-sm px-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50"
              />
            </div>
            <div className="w-36">
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">Format</label>
              <select
                value={form.format}
                onChange={setField('format')}
                disabled={isCreating}
                className="w-full text-sm px-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white disabled:opacity-50"
              >
                {EBOOK_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="w-40">
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">$</span>
                <input
                  type="number"
                  value={form.price}
                  onChange={setField('price')}
                  disabled={isCreating}
                  placeholder="9.99"
                  min={0.01}
                  step={0.01}
                  className="w-full text-sm pl-6 pr-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">Publisher</label>
              <input
                type="text"
                value={form.publisher}
                onChange={setField('publisher')}
                disabled={isCreating}
                placeholder="Publisher name"
                className="w-full text-sm px-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">ISBN</label>
              <input
                type="text"
                value={form.isbn}
                onChange={setField('isbn')}
                disabled={isCreating}
                placeholder="978XXXXXXXXXX"
                maxLength={13}
                className="w-full font-mono text-sm px-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">ASIN</label>
              <input
                type="text"
                value={form.asin}
                onChange={setField('asin')}
                disabled={isCreating}
                placeholder="Amazon ASIN"
                className="w-full font-mono text-sm px-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50"
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
              {isCreating ? 'Adding…' : 'Add to inventory'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isCreating}
              className="px-4 py-2 text-sm text-ink-muted border border-silver-200 rounded-lg hover:bg-silver-100 disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase.step === 'created' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <p className="text-xs text-green-700 font-medium">
            Ebook added — Stock #{phase.stockNumber}
          </p>
          <button type="button" onClick={handleReset} className="text-xs font-semibold text-navy-700 hover:underline">
            Add another
          </button>
        </div>
      )}
    </div>
  );
}
