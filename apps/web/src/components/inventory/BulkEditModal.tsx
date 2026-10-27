import { useState } from 'react';
import {
  previewBulkEdit,
  applyBulkEdit,
  undoBulkEdit,
  type BulkEdit,
  type BulkEditFields,
  type BulkEditPreview,
  type BulkEditResult,
  type BulkUndoResult,
  type BulkFieldChange,
} from '@/lib/api/bulkEditApi.ts';
import type { PrintableVehicle } from './WindowStickerModal.tsx';

type Props = {
  dealerId: string;
  isOpen: boolean;
  onClose: () => void;
  vehicles: PrintableVehicle[];
  onSuccess: () => void;
};

type Step = 'form' | 'preview' | 'result';

export function BulkEditModal({ dealerId, isOpen, onClose, vehicles, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('form');
  
  // Field toggles
  const [enabledFields, setEnabledFields] = useState<{ [K in keyof BulkEditFields]?: boolean }>({});
  
  // Field values
  const [priceDollars, setPriceDollars] = useState('');
  const [mileageStr, setMileageStr] = useState('');
  const [condition, setCondition] = useState<'NEW' | 'USED' | 'CPO'>('USED');
  const [exteriorColor, setExteriorColor] = useState('');
  const [interiorColor, setInteriorColor] = useState('');
  const [trim, setTrim] = useState('');
  const [bodyStyle, setBodyStyle] = useState('');
  const [drivetrain, setDrivetrain] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState('');

  // Async states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BulkEditPreview | null>(null);
  const [result, setResult] = useState<BulkEditResult | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [undoResult, setUndoResult] = useState<BulkUndoResult | null>(null);

  if (!isOpen) return null;

  const toggleField = (field: keyof BulkEditFields) => {
    setEnabledFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const buildFieldsPayload = (): BulkEditFields => {
    const fields: BulkEditFields = {};
    if (enabledFields.priceCents && priceDollars.trim()) {
      const num = parseFloat(priceDollars.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) fields.priceCents = Math.round(num * 100);
    }
    if (enabledFields.mileage && mileageStr.trim()) {
      const num = parseInt(mileageStr.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num)) fields.mileage = num;
    }
    if (enabledFields.condition) fields.condition = condition;
    if (enabledFields.exteriorColor) fields.exteriorColor = exteriorColor.trim();
    if (enabledFields.interiorColor) fields.interiorColor = interiorColor.trim() || null;
    if (enabledFields.trim) fields.trim = trim.trim() || null;
    if (enabledFields.bodyStyle) fields.bodyStyle = bodyStyle.trim() || null;
    if (enabledFields.drivetrain) fields.drivetrain = drivetrain.trim() || null;
    if (enabledFields.fuelType) fields.fuelType = fuelType.trim() || null;
    if (enabledFields.transmission) fields.transmission = transmission.trim() || null;
    return fields;
  };

  const handlePreview = async () => {
    const fields = buildFieldsPayload();
    if (Object.keys(fields).length === 0) {
      setError('Select and configure at least one field to update.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const edits: BulkEdit[] = vehicles.map(v => ({
        vehicleId: v.id,
        fields,
      }));
      const previewData = await previewBulkEdit(dealerId, edits);
      setPreview(previewData);
      setStep('preview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to preview bulk corrections');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    setError(null);
    setLoading(true);
    try {
      const fields = buildFieldsPayload();
      // Send each row's preview updatedAt as expectedUpdatedAt
      const edits: BulkEdit[] = preview.rows
        .filter(r => r.status === 'WILL_CHANGE')
        .map(r => ({
          vehicleId: r.vehicleId,
          fields,
          expectedUpdatedAt: r.updatedAt ?? undefined,
        }));

      if (edits.length === 0) {
        setError('No vehicles have changes to apply.');
        setLoading(false);
        return;
      }

      const applyData = await applyBulkEdit(dealerId, edits);
      setResult(applyData);
      setStep('result');
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to apply bulk corrections');
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!result?.batchId) return;
    setError(null);
    setUndoing(true);
    try {
      const data = await undoBulkEdit(dealerId, result.batchId);
      setUndoResult(data);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to undo bulk edits');
    } finally {
      setUndoing(false);
    }
  };

  const formatFieldValue = (field: string, val: string | number | null) => {
    if (val === null || val === undefined || val === '') return <span className="text-silver-400 italic">None</span>;
    if (field === 'priceCents' && typeof val === 'number') {
      return `$${(val / 100).toLocaleString()}`;
    }
    if (field === 'mileage' && typeof val === 'number') {
      return `${val.toLocaleString()} mi`;
    }
    return String(val);
  };

  const formatFieldName = (field: string) => {
    switch (field) {
      case 'priceCents': return 'Price';
      case 'mileage': return 'Mileage';
      case 'condition': return 'Condition';
      case 'exteriorColor': return 'Exterior Color';
      case 'interiorColor': return 'Interior Color';
      case 'trim': return 'Trim';
      case 'bodyStyle': return 'Body Style';
      case 'drivetrain': return 'Drivetrain';
      case 'fuelType': return 'Fuel Type';
      case 'transmission': return 'Transmission';
      default: return field;
    }
  };

  const willChangeCount = preview?.counts?.WILL_CHANGE ?? 0;
  const noChangeCount = preview?.counts?.NO_CHANGE ?? 0;
  const rejectedCount = preview?.counts?.REJECTED ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden border border-silver-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-silver-200 bg-silver-50">
          <div>
            <h3 className="text-base font-bold text-ink-heading">
              Bulk Vehicle Correction ({vehicles.length} Vehicles Selected)
            </h3>
            <p className="text-xs text-ink-muted">
              {step === 'form' && 'Select fields to update across all selected vehicles. All edits are previewed prior to saving.'}
              {step === 'preview' && 'Review per-vehicle calculated changes before applying. Each vehicle commits independently.'}
              {step === 'result' && 'Bulk vehicle correction results. Review individual vehicle outcomes below.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink-heading hover:bg-silver-200 rounded-lg text-lg leading-none transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* STEP 1: Form Selection */}
          {step === 'form' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950">
                Check the box next to any field you wish to update across the <strong>{vehicles.length}</strong> selected vehicles. Unchecked fields will remain untouched.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Price */}
                <div className={`p-3.5 rounded-xl border transition-colors ${enabledFields.priceCents ? 'border-indigo-400 bg-indigo-50/20' : 'border-silver-200 bg-white'}`}>
                  <label className="flex items-center gap-2 text-xs font-bold text-ink-heading cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={!!enabledFields.priceCents}
                      onChange={() => toggleField('priceCents')}
                      className="rounded border-silver-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Listing Price ($)</span>
                  </label>
                  {enabledFields.priceCents && (
                    <input
                      type="text"
                      placeholder="e.g. 24,995"
                      value={priceDollars}
                      onChange={e => setPriceDollars(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-silver-300 rounded-lg bg-white font-mono focus:ring-1 focus:ring-indigo-500"
                    />
                  )}
                </div>

                {/* Mileage */}
                <div className={`p-3.5 rounded-xl border transition-colors ${enabledFields.mileage ? 'border-indigo-400 bg-indigo-50/20' : 'border-silver-200 bg-white'}`}>
                  <label className="flex items-center gap-2 text-xs font-bold text-ink-heading cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={!!enabledFields.mileage}
                      onChange={() => toggleField('mileage')}
                      className="rounded border-silver-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Mileage</span>
                  </label>
                  {enabledFields.mileage && (
                    <input
                      type="text"
                      placeholder="e.g. 45,000"
                      value={mileageStr}
                      onChange={e => setMileageStr(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-silver-300 rounded-lg bg-white font-mono focus:ring-1 focus:ring-indigo-500"
                    />
                  )}
                </div>

                {/* Condition */}
                <div className={`p-3.5 rounded-xl border transition-colors ${enabledFields.condition ? 'border-indigo-400 bg-indigo-50/20' : 'border-silver-200 bg-white'}`}>
                  <label className="flex items-center gap-2 text-xs font-bold text-ink-heading cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={!!enabledFields.condition}
                      onChange={() => toggleField('condition')}
                      className="rounded border-silver-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Vehicle Condition</span>
                  </label>
                  {enabledFields.condition && (
                    <select
                      value={condition}
                      onChange={e => setCondition(e.target.value as 'NEW' | 'USED' | 'CPO')}
                      className="w-full px-3 py-1.5 text-xs border border-silver-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="USED">USED</option>
                      <option value="NEW">NEW</option>
                      <option value="CPO">CPO (Certified Pre-Owned)</option>
                    </select>
                  )}
                </div>

                {/* Exterior Color */}
                <div className={`p-3.5 rounded-xl border transition-colors ${enabledFields.exteriorColor ? 'border-indigo-400 bg-indigo-50/20' : 'border-silver-200 bg-white'}`}>
                  <label className="flex items-center gap-2 text-xs font-bold text-ink-heading cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={!!enabledFields.exteriorColor}
                      onChange={() => toggleField('exteriorColor')}
                      className="rounded border-silver-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Exterior Color</span>
                  </label>
                  {enabledFields.exteriorColor && (
                    <input
                      type="text"
                      placeholder="e.g. Black, Silver, Pearl White"
                      value={exteriorColor}
                      onChange={e => setExteriorColor(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-silver-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  )}
                </div>

                {/* Interior Color */}
                <div className={`p-3.5 rounded-xl border transition-colors ${enabledFields.interiorColor ? 'border-indigo-400 bg-indigo-50/20' : 'border-silver-200 bg-white'}`}>
                  <label className="flex items-center gap-2 text-xs font-bold text-ink-heading cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={!!enabledFields.interiorColor}
                      onChange={() => toggleField('interiorColor')}
                      className="rounded border-silver-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Interior Color</span>
                  </label>
                  {enabledFields.interiorColor && (
                    <input
                      type="text"
                      placeholder="e.g. Black Leather, Gray Cloth"
                      value={interiorColor}
                      onChange={e => setInteriorColor(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-silver-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  )}
                </div>

                {/* Trim */}
                <div className={`p-3.5 rounded-xl border transition-colors ${enabledFields.trim ? 'border-indigo-400 bg-indigo-50/20' : 'border-silver-200 bg-white'}`}>
                  <label className="flex items-center gap-2 text-xs font-bold text-ink-heading cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={!!enabledFields.trim}
                      onChange={() => toggleField('trim')}
                      className="rounded border-silver-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Trim</span>
                  </label>
                  {enabledFields.trim && (
                    <input
                      type="text"
                      placeholder="e.g. XLE, Limited, Sport"
                      value={trim}
                      onChange={e => setTrim(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-silver-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  )}
                </div>

                {/* Body Style */}
                <div className={`p-3.5 rounded-xl border transition-colors ${enabledFields.bodyStyle ? 'border-indigo-400 bg-indigo-50/20' : 'border-silver-200 bg-white'}`}>
                  <label className="flex items-center gap-2 text-xs font-bold text-ink-heading cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={!!enabledFields.bodyStyle}
                      onChange={() => toggleField('bodyStyle')}
                      className="rounded border-silver-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Body Style</span>
                  </label>
                  {enabledFields.bodyStyle && (
                    <select
                      value={bodyStyle}
                      onChange={e => setBodyStyle(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-silver-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select body style…</option>
                      <option value="SUV">SUV</option>
                      <option value="Sedan">Sedan</option>
                      <option value="Truck">Truck</option>
                      <option value="Coupe">Coupe</option>
                      <option value="Van">Van</option>
                      <option value="Wagon">Wagon</option>
                      <option value="Convertible">Convertible</option>
                      <option value="Hatchback">Hatchback</option>
                    </select>
                  )}
                </div>

                {/* Drivetrain */}
                <div className={`p-3.5 rounded-xl border transition-colors ${enabledFields.drivetrain ? 'border-indigo-400 bg-indigo-50/20' : 'border-silver-200 bg-white'}`}>
                  <label className="flex items-center gap-2 text-xs font-bold text-ink-heading cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={!!enabledFields.drivetrain}
                      onChange={() => toggleField('drivetrain')}
                      className="rounded border-silver-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Drivetrain</span>
                  </label>
                  {enabledFields.drivetrain && (
                    <select
                      value={drivetrain}
                      onChange={e => setDrivetrain(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-silver-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select drivetrain…</option>
                      <option value="FWD">FWD</option>
                      <option value="AWD">AWD</option>
                      <option value="4WD">4WD</option>
                      <option value="RWD">RWD</option>
                    </select>
                  )}
                </div>

                {/* Fuel Type */}
                <div className={`p-3.5 rounded-xl border transition-colors ${enabledFields.fuelType ? 'border-indigo-400 bg-indigo-50/20' : 'border-silver-200 bg-white'}`}>
                  <label className="flex items-center gap-2 text-xs font-bold text-ink-heading cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={!!enabledFields.fuelType}
                      onChange={() => toggleField('fuelType')}
                      className="rounded border-silver-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Fuel Type</span>
                  </label>
                  {enabledFields.fuelType && (
                    <select
                      value={fuelType}
                      onChange={e => setFuelType(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-silver-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select fuel type…</option>
                      <option value="Gasoline">Gasoline</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Electric">Electric</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Plug-in Hybrid">Plug-in Hybrid</option>
                    </select>
                  )}
                </div>

                {/* Transmission */}
                <div className={`p-3.5 rounded-xl border transition-colors ${enabledFields.transmission ? 'border-indigo-400 bg-indigo-50/20' : 'border-silver-200 bg-white'}`}>
                  <label className="flex items-center gap-2 text-xs font-bold text-ink-heading cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={!!enabledFields.transmission}
                      onChange={() => toggleField('transmission')}
                      className="rounded border-silver-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Transmission</span>
                  </label>
                  {enabledFields.transmission && (
                    <select
                      value={transmission}
                      onChange={e => setTransmission(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-silver-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select transmission…</option>
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preview Differences */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {`${willChangeCount} will update`}
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-bold bg-silver-100 text-ink-muted border border-silver-200">
                  {`${noChangeCount} unchanged`}
                </span>
                {rejectedCount > 0 && (
                  <span className="px-3 py-1 rounded-md text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                    {`${rejectedCount} rejected`}
                  </span>
                )}
              </div>

              <div className="border border-silver-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-silver-50 border-b border-silver-200 text-ink-muted uppercase font-bold text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Planned Changes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-silver-100">
                    {preview.rows.map(row => (
                      <tr key={row.vehicleId} className="hover:bg-silver-50/50">
                        <td className="px-4 py-3 font-medium text-ink-heading">
                          <span className="block font-bold">{row.label || `Vehicle #${row.vehicleId.slice(-6)}`}</span>
                          <span className="text-[10px] text-ink-muted font-mono">Stock #{row.stockNumber || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {row.status === 'WILL_CHANGE' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Will update
                            </span>
                          )}
                          {row.status === 'NO_CHANGE' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-silver-100 text-ink-muted border border-silver-200">
                              No change
                            </span>
                          )}
                          {row.status === 'REJECTED' && (
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                Rejected
                              </span>
                              {row.reason && <p className="text-[10px] text-red-700">{row.reason}</p>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.changes && row.changes.length > 0 ? (
                            <div className="space-y-1">
                              {row.changes.map((c: BulkFieldChange, i: number) => (
                                <div key={i} className="flex items-center gap-1.5 font-mono text-[11px]">
                                  <span className="font-sans font-semibold text-ink-muted">{formatFieldName(c.field)}:</span>
                                  <span className="text-red-700 line-through opacity-80">{formatFieldValue(c.field, c.from)}</span>
                                  <span className="text-ink-muted">➔</span>
                                  <span className="text-emerald-700 font-bold">{formatFieldValue(c.field, c.to)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-ink-muted italic">Values already match</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Results & Safe Undo */}
          {step === 'result' && result && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-950 font-medium">
                Bulk correction complete. All vehicle updates were processed independently.
              </div>

              {/* Undo action banner */}
              {result.undoAvailable && result.batchId && !undoResult && (
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">Safe Batch Undo Available</h4>
                      <p className="text-[11px] text-amber-900 leading-snug">
                        Batch ID: <span className="font-mono font-semibold">{result.batchId}</span>. You can restore previous values for vehicles that have not been modified since this update.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={undoing}
                      onClick={handleUndo}
                      className="px-3.5 py-1.5 text-xs font-bold bg-white text-amber-950 border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors shadow-2xs shrink-0 disabled:opacity-50"
                    >
                      {undoing ? 'Restoring…' : 'Undo this bulk update'}
                    </button>
                  </div>
                  <div className="pt-2 border-t border-amber-200/80 text-[10px] text-amber-900 space-y-0.5">
                    <p>
                      <strong>Scope of undo:</strong> Reverts values in StarterGrid inventory database immediately.
                    </p>
                    <p className="text-amber-800">
                      Restored values reach channels on their next update. StarterGrid cannot recall what a channel already showed.
                    </p>
                  </div>
                </div>
              )}

              {undoResult && (
                <div className="rounded-xl border border-silver-300 bg-white shadow-xs overflow-hidden text-xs">
                  <div className="p-4 bg-indigo-50/80 border-b border-indigo-100 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-indigo-950 text-sm">Batch Restored</h4>
                        <p className="text-indigo-900 text-xs mt-0.5">
                          {undoResult.note || 'Restored values reach channels on their next update. StarterGrid cannot recall what a channel already showed.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {undoResult.counts.RESTORED ?? 0} restored
                        </span>
                        {(undoResult.counts.SKIPPED ?? 0) > 0 && (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {undoResult.counts.SKIPPED} skipped (modified since batch)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dual breakdown: Internal Database vs External Channels */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-silver-50/50">
                    <div className="p-3.5 rounded-lg border border-emerald-200 bg-white space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" aria-hidden="true" />
                          <span>StarterGrid Lot Inventory</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold">
                          Restored in Database
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted leading-relaxed">
                        Internal records have been reverted to their previous values. Vehicle details, window stickers, and lot management reflect the restored values immediately.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg border border-amber-200 bg-white space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                          <span>Connected Marketplaces</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-bold">
                          Sync Pending
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted leading-relaxed">
                        External channels do not revert instantaneously. Restored values are queued and will update during each marketplace's next scheduled feed cycle.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Results table */}
              <div className="border border-silver-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-silver-50 border-b border-silver-200 text-ink-muted uppercase font-bold text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Outcome</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-silver-100">
                    {result.rows.map(row => (
                      <tr key={row.vehicleId} className="hover:bg-silver-50/50">
                        <td className="px-4 py-3 font-medium text-ink-heading">
                          <span className="block font-bold">{row.label || `Vehicle #${row.vehicleId.slice(-6)}`}</span>
                          <span className="text-[10px] text-ink-muted font-mono">Stock #{row.stockNumber || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {row.status === 'APPLIED' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ Applied
                            </span>
                          )}
                          {row.status === 'NO_CHANGE' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-silver-100 text-ink-muted border border-silver-200">
                              No change
                            </span>
                          )}
                          {row.status === 'CONFLICT' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ⚠️ Conflict (modified)
                            </span>
                          )}
                          {row.status === 'HELD' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              🛡️ Held for review
                            </span>
                          )}
                          {row.status === 'REJECTED' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                              Rejected
                            </span>
                          )}
                          {row.status === 'FAILED' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-body">
                          {row.reason && <p className="text-[11px] text-ink-muted">{row.reason}</p>}
                          {row.incidentId && (
                            <p className="text-[11px] text-amber-900 font-mono">Incident #{row.incidentId}</p>
                          )}
                          {row.changes && row.changes.length > 0 && (
                            <div className="space-y-0.5 mt-1 font-mono text-[10px] text-ink-muted">
                              {row.changes.map((c, i) => (
                                <span key={i} className="inline-block mr-2">
                                  {formatFieldName(c.field)}: {formatFieldValue(c.field, c.to)}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-silver-200 bg-silver-50 flex items-center justify-between">
          <div>
            {step === 'preview' && (
              <button
                type="button"
                onClick={() => setStep('form')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-silver-300 bg-white hover:bg-silver-100 text-ink-heading transition-colors"
              >
                ← Back to Edit
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step !== 'result' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-silver-300 bg-white hover:bg-silver-100 text-ink-heading transition-colors"
                >
                  Cancel
                </button>
                {step === 'form' && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handlePreview}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Previewing…' : `Preview Changes (${vehicles.length} Vehicles)`}
                  </button>
                )}
                {step === 'preview' && (
                  <button
                    type="button"
                    disabled={loading || willChangeCount === 0}
                    onClick={handleApply}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Applying…' : `Apply Changes (${willChangeCount} Vehicles)`}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-1.5 text-xs font-bold rounded-lg bg-navy-900 hover:bg-navy-800 text-white transition-colors shadow-sm"
              >
                Done
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
