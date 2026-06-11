import { useState } from 'react';
import type { VehicleDetailDto, VehicleFieldPatch } from '@/lib/api/sdk.ts';
import { patchVehicleFields } from '@/lib/api/sdk.ts';

type Props = {
  vehicle: VehicleDetailDto;
  onSaved: () => void;
};

type FieldState = {
  stockNumber: string;
  priceCents: string;
  mileage: string;
  condition: string;
  exteriorColor: string;
  interiorColor: string;
  trim: string;
  bodyStyle: string;
  drivetrain: string;
  fuelType: string;
  transmission: string;
};

function vehicleToState(v: VehicleDetailDto): FieldState {
  return {
    stockNumber:  v.stockNumber,
    priceCents:   v.priceCents > 0 ? String(v.priceCents / 100) : '',
    mileage:      v.mileage > 0 ? String(v.mileage) : '',
    condition:    v.condition,
    exteriorColor: v.exteriorColor,
    interiorColor: v.interiorColor ?? '',
    trim:          v.trim ?? '',
    bodyStyle:     v.bodyStyle ?? '',
    drivetrain:    v.drivetrain ?? '',
    fuelType:      v.fuelType ?? '',
    transmission:  v.transmission ?? '',
  };
}

function stateChanged(a: FieldState, b: FieldState): boolean {
  return (Object.keys(a) as (keyof FieldState)[]).some(k => a[k] !== b[k]);
}

function buildPatch(original: VehicleDetailDto, state: FieldState): VehicleFieldPatch {
  const patch: VehicleFieldPatch = {};
  const origState = vehicleToState(original);

  if (state.stockNumber !== origState.stockNumber) patch.stockNumber = state.stockNumber;
  if (state.priceCents !== origState.priceCents) {
    const val = parseFloat(state.priceCents.replace(/[^0-9.]/g, ''));
    if (!isNaN(val)) patch.priceCents = Math.round(val * 100);
  }
  if (state.mileage !== origState.mileage) {
    const val = parseInt(state.mileage.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(val)) patch.mileage = val;
  }
  if (state.condition !== origState.condition) patch.condition = state.condition;
  if (state.exteriorColor !== origState.exteriorColor) patch.exteriorColor = state.exteriorColor;
  if (state.interiorColor !== origState.interiorColor) patch.interiorColor = state.interiorColor || null;
  if (state.trim !== origState.trim) patch.trim = state.trim || null;
  if (state.bodyStyle !== origState.bodyStyle) patch.bodyStyle = state.bodyStyle || null;
  if (state.drivetrain !== origState.drivetrain) patch.drivetrain = state.drivetrain || null;
  if (state.fuelType !== origState.fuelType) patch.fuelType = state.fuelType || null;
  if (state.transmission !== origState.transmission) patch.transmission = state.transmission || null;

  return patch;
}

const inputCls = 'w-full text-xs border border-silver-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-navy-400 bg-white';
const readonlyCls = 'w-full text-xs px-2 py-1.5 bg-silver-50 text-ink-muted rounded-md border border-silver-100 cursor-default';

type FieldRowProps = { label: string; children: React.ReactNode };
function FieldRow({ label, children }: FieldRowProps) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
      <label className="text-[11px] text-ink-muted font-medium text-right pr-2">{label}</label>
      {children}
    </div>
  );
}

export function VehicleFieldGroups({ vehicle, onSaved }: Props) {
  const [state, setState] = useState<FieldState>(() => vehicleToState(vehicle));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const origState = vehicleToState(vehicle);
  const isDirty = stateChanged(state, origState);

  const set = (key: keyof FieldState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setState(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    const patch = buildPatch(vehicle, state);
    if (Object.keys(patch).length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await patchVehicleFields(vehicle.dealershipId, vehicle.id, patch);
      onSaved();
    } catch (e) {
      setSaveError((e as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setState(vehicleToState(vehicle));

  return (
    <div className="space-y-5">
      {/* ── Protected identity ─────────────────────────────────────────────── */}
      <section>
        <h3 className="text-[10px] font-bold text-ink-faint uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <span>🔒</span> Identity (protected)
        </h3>
        <div className="space-y-1.5">
          <FieldRow label="VIN">
            <div className={readonlyCls}>{vehicle.vin}</div>
          </FieldRow>
          <FieldRow label="Year">
            <div className={readonlyCls}>{vehicle.year}</div>
          </FieldRow>
          <FieldRow label="Make">
            <div className={readonlyCls}>{vehicle.make}</div>
          </FieldRow>
          <FieldRow label="Model">
            <div className={readonlyCls}>{vehicle.model}</div>
          </FieldRow>
        </div>
        <p className="text-[10px] text-ink-faint mt-2 pl-[128px]">VIN, year, make, and model are set from VIN decode. Contact support to correct a VIN error.</p>
      </section>

      {/* ── Listing fields ─────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-[10px] font-bold text-ink-faint uppercase tracking-widest mb-3">Listing</h3>
        <div className="space-y-1.5">
          <FieldRow label="Stock #">
            <input className={inputCls} value={state.stockNumber} onChange={set('stockNumber')} maxLength={80} />
          </FieldRow>
          <FieldRow label="Price ($)">
            <input className={inputCls} type="text" value={state.priceCents} onChange={set('priceCents')} placeholder="e.g. 24995" />
          </FieldRow>
          <FieldRow label="Mileage">
            <input className={inputCls} type="text" value={state.mileage} onChange={set('mileage')} placeholder="e.g. 42000" />
          </FieldRow>
          <FieldRow label="Condition">
            <select className={inputCls} value={state.condition} onChange={set('condition')}>
              <option value="NEW">New</option>
              <option value="USED">Used</option>
              <option value="CPO">CPO</option>
            </select>
          </FieldRow>
          <FieldRow label="Ext. Color">
            <input className={inputCls} value={state.exteriorColor} onChange={set('exteriorColor')} maxLength={80} />
          </FieldRow>
          <FieldRow label="Int. Color">
            <input className={inputCls} value={state.interiorColor} onChange={set('interiorColor')} maxLength={80} placeholder="Optional" />
          </FieldRow>
        </div>
      </section>

      {/* ── Vehicle specs ─────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-[10px] font-bold text-ink-faint uppercase tracking-widest mb-3">Specs</h3>
        <div className="space-y-1.5">
          <FieldRow label="Trim">
            <input className={inputCls} value={state.trim} onChange={set('trim')} maxLength={120} placeholder="Optional" />
          </FieldRow>
          <FieldRow label="Body Style">
            <input className={inputCls} value={state.bodyStyle} onChange={set('bodyStyle')} placeholder="Sedan, SUV, Truck…" />
          </FieldRow>
          <FieldRow label="Drivetrain">
            <input className={inputCls} value={state.drivetrain} onChange={set('drivetrain')} placeholder="AWD, FWD, RWD…" />
          </FieldRow>
          <FieldRow label="Fuel Type">
            <input className={inputCls} value={state.fuelType} onChange={set('fuelType')} placeholder="Gas, Electric, Hybrid…" />
          </FieldRow>
          <FieldRow label="Transmission">
            <input className={inputCls} value={state.transmission} onChange={set('transmission')} placeholder="Automatic, Manual…" />
          </FieldRow>
        </div>
        <p className="text-[10px] text-ink-faint mt-2 pl-[128px]">Specs are auto-filled from VIN decode where available.</p>
      </section>

      {/* ── Price history ─────────────────────────────────────────────────── */}
      {vehicle.priceLastChangedAt && (
        <p className="text-[11px] text-ink-muted pl-[128px]">
          Price last changed: {new Date(vehicle.priceLastChangedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          {vehicle.originalPriceCents && vehicle.originalPriceCents !== vehicle.priceCents && (
            <> · was ${(vehicle.originalPriceCents / 100).toLocaleString()}</>
          )}
        </p>
      )}

      {/* ── Save bar ─────────────────────────────────────────────────────────── */}
      {isDirty && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 p-3 bg-white border-t border-silver-200 -mx-4 px-4">
          {saveError && <span className="text-[11px] text-red-600 flex-1">{saveError}</span>}
          {!saveError && <span className="text-[11px] text-ink-muted flex-1">Unsaved changes</span>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-semibold border border-silver-200 rounded-lg text-ink-muted hover:bg-silver-50 disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-semibold bg-navy-900 text-white rounded-lg hover:bg-navy-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
