import { useState } from 'react';
import {
  decodeVin,
  createVehicleFromVin,
} from '@/lib/api/sdk.ts';

type Phase =
  | { step: 'idle' }
  | { step: 'validating' }
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

  const handleDecode = async () => {
    const normalized = vin.trim().toUpperCase().replace(/[\s-]/g, '');
    if (normalized.length !== 17) {
      setPhase({ step: 'invalid', error: 'VIN must be exactly 17 characters.' });
      return;
    }
    setPhase({ step: 'validating' });
    try {
      const result = await decodeVin(dealerId, normalized);
      
      if (!result.decoded) {
        setPhase({ step: 'invalid', error: 'VIN not found in decoder. Cannot proceed without a valid Make and Model.' });
        return;
      }
      
      // Auto-create vehicle shell if it successfully decoded
      setPhase({ step: 'creating' });
      const createRes = await createVehicleFromVin(dealerId, { vin: normalized });
      
      setPhase({ step: 'created', vehicleId: createRes.vehicleId, stockNumber: createRes.stockNumber });
      onCreated?.(createRes.vehicleId, createRes.stockNumber);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('409') || msg.toLowerCase().includes('duplicate')) {
        setPhase({ step: 'duplicate' });
      } else {
        setPhase({ step: 'invalid', error: msg });
      }
    }
  };

  const handleReset = () => {
    setVin('');
    setPhase({ step: 'idle' });
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
          {(phase.step === 'duplicate' || phase.step === 'created') && (
            <button type="button" onClick={handleReset} className="px-4 py-2 text-sm text-ink-muted border border-silver-200 rounded-lg hover:bg-silver-100">
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

      {phase.step === 'creating' && (
        <div className="text-xs text-ink-muted animate-pulse">Creating vehicle record…</div>
      )}

      {phase.step === 'created' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <p className="text-xs text-green-700 font-medium">
            Vehicle created — Stock #{phase.stockNumber}
          </p>
          <button type="button" onClick={handleReset} className="text-xs font-semibold text-navy-700 hover:underline">
            Add another
          </button>
        </div>
      )}
    </div>
  );
}
