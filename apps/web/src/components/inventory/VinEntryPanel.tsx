import { useState } from 'react';
import {
  decodeVin,
  createVehicleFromVin,
  type VinDecodeResponse,
  type CreateVehicleFromVinPayload,
} from '@/lib/api/sdk.ts';

type Phase =
  | { step: 'idle' }
  | { step: 'validating' }
  | { step: 'decoded'; decoded: VinDecodeResponse }
  | { step: 'invalid'; error: string }
  | { step: 'duplicate' }
  | { step: 'creating' }
  | { step: 'created'; vehicleId: string; stockNumber: string };

type Props = {
  dealerId: string;
  onCreated?: (vehicleId: string, stockNumber: string) => void;
};

export function VinEntryPanel({ dealerId, onCreated }: Props) {
  const [vin, setVin] = useState('');
  const [phase, setPhase] = useState<Phase>({ step: 'idle' });
  const [priceDollars, setPriceDollars] = useState('');
  const [stockNumber, setStockNumber] = useState('');
  const [condition, setCondition] = useState<'NEW' | 'USED' | 'CPO'>('USED');

  const handleDecode = async () => {
    const normalized = vin.trim().toUpperCase().replace(/[\s-]/g, '');
    if (normalized.length !== 17) {
      setPhase({ step: 'invalid', error: 'VIN must be exactly 17 characters.' });
      return;
    }
    setPhase({ step: 'validating' });
    try {
      const result = await decodeVin(dealerId, normalized);
      setPhase({ step: 'decoded', decoded: result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('409') || msg.toLowerCase().includes('duplicate')) {
        setPhase({ step: 'duplicate' });
      } else {
        setPhase({ step: 'invalid', error: msg });
      }
    }
  };

  const handleConfirm = async () => {
    const normalized = vin.trim().toUpperCase().replace(/[\s-]/g, '');
    setPhase({ step: 'creating' });
    const payload: CreateVehicleFromVinPayload = {
      vin: normalized,
      condition,
    };
    if (stockNumber.trim()) payload.stockNumber = stockNumber.trim();
    if (priceDollars.trim()) {
      const cents = Math.round(parseFloat(priceDollars.replace(/[^0-9.]/g, '')) * 100);
      if (cents > 0) payload.priceCents = cents;
    }
    try {
      const result = await createVehicleFromVin(dealerId, payload);
      setPhase({ step: 'created', vehicleId: result.vehicleId, stockNumber: result.stockNumber });
      onCreated?.(result.vehicleId, result.stockNumber);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create vehicle.';
      setPhase({ step: 'invalid', error: msg });
    }
  };

  const handleReset = () => {
    setVin('');
    setPhase({ step: 'idle' });
    setPriceDollars('');
    setStockNumber('');
    setCondition('USED');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-ink-body mb-1.5">
          Vehicle Identification Number (VIN)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={vin}
            onChange={e => setVin(e.target.value.toUpperCase())}
            placeholder="e.g. 1HGBH41JXMN109186"
            maxLength={17}
            disabled={phase.step === 'validating' || phase.step === 'creating' || phase.step === 'created'}
            className="flex-1 font-mono text-sm px-3 py-2 border border-silver-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50"
            onKeyDown={e => e.key === 'Enter' && phase.step === 'idle' && handleDecode()}
          />
          {(phase.step === 'idle' || phase.step === 'invalid') && (
            <button
              type="button"
              onClick={handleDecode}
              disabled={vin.trim().length < 5}
              className="px-4 py-2 bg-navy-900 text-white text-sm font-semibold rounded-lg disabled:opacity-40"
            >
              Decode
            </button>
          )}
          {(phase.step === 'decoded' || phase.step === 'duplicate') && (
            <button type="button" onClick={handleReset} className="px-4 py-2 text-sm text-ink-muted border border-silver-200 rounded-lg">
              Clear
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] text-ink-muted">17-character VIN — letters and digits, no I/O/Q</p>
      </div>

      {phase.step === 'validating' && (
        <div className="text-xs text-ink-muted animate-pulse">Decoding VIN…</div>
      )}

      {phase.step === 'invalid' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {phase.error}
        </div>
      )}

      {phase.step === 'duplicate' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          This VIN is already in your inventory.
        </div>
      )}

      {phase.step === 'decoded' && (
        <div className="space-y-4">
          <div className="p-3 bg-surface-raised border border-silver-200 rounded-lg">
            <p className="text-xs font-semibold text-ink-body mb-2">Decoded from NHTSA</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {phase.decoded.year && <><dt className="text-ink-muted">Year</dt><dd className="font-medium">{phase.decoded.year}</dd></>}
              {phase.decoded.make && <><dt className="text-ink-muted">Make</dt><dd className="font-medium">{phase.decoded.make}</dd></>}
              {phase.decoded.model && <><dt className="text-ink-muted">Model</dt><dd className="font-medium">{phase.decoded.model}</dd></>}
              {phase.decoded.trim && <><dt className="text-ink-muted">Trim</dt><dd className="font-medium">{phase.decoded.trim}</dd></>}
              {phase.decoded.bodyStyle && <><dt className="text-ink-muted">Body</dt><dd className="font-medium">{phase.decoded.bodyStyle}</dd></>}
              {phase.decoded.fuelType && <><dt className="text-ink-muted">Fuel</dt><dd className="font-medium">{phase.decoded.fuelType}</dd></>}
            </dl>
            {!phase.decoded.decoded && (
              <p className="mt-2 text-[11px] text-amber-600">VIN not found in decoder — vehicle will be created with VIN only.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-body mb-1">Stock Number</label>
              <input
                type="text"
                value={stockNumber}
                onChange={e => setStockNumber(e.target.value)}
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
                  value={priceDollars}
                  onChange={e => setPriceDollars(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-sm pl-6 pr-3 py-2 border border-silver-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-body mb-1">Condition</label>
            <div className="flex gap-2">
              {(['USED', 'NEW', 'CPO'] as const).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    condition === c
                      ? 'bg-navy-900 text-white border-navy-900'
                      : 'bg-white text-ink-body border-silver-200 hover:border-navy-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-lg"
          >
            Add to Inventory
          </button>
        </div>
      )}

      {phase.step === 'creating' && (
        <div className="text-xs text-ink-muted animate-pulse">Creating vehicle record…</div>
      )}

      {phase.step === 'created' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <p className="text-xs text-green-700 font-medium">
            Vehicle created — Stock #{phase.stockNumber}
          </p>
          <button type="button" onClick={handleReset} className="text-xs font-semibold text-navy-700">
            Add another
          </button>
        </div>
      )}
    </div>
  );
}
