/**
 * Client for spreadsheet-style bulk vehicle correction. Flow: preview (writes nothing) →
 * apply with each row's `updatedAt` as `expectedUpdatedAt` → optional undo by batchId.
 * Every response is per vehicle; show each row's status and reason rather than one total.
 */
export type BulkEditFields = Partial<{
  priceCents: number;
  mileage: number;
  condition: 'NEW' | 'USED' | 'CPO';
  exteriorColor: string;
  trim: string | null;
  interiorColor: string | null;
  bodyStyle: string | null;
  drivetrain: string | null;
  fuelType: string | null;
  transmission: string | null;
}>;
export type BulkEdit = { vehicleId: string; fields: BulkEditFields; expectedUpdatedAt?: string };

export type BulkFieldChange = { field: keyof BulkEditFields; from: string | number | null; to: string | number | null };
/** Preview: WILL_CHANGE | NO_CHANGE | REJECTED. Apply adds APPLIED, CONFLICT (changed since preview), HELD (safeguard), FAILED. */
export type BulkEditRowStatus = 'WILL_CHANGE' | 'NO_CHANGE' | 'REJECTED' | 'APPLIED' | 'CONFLICT' | 'HELD' | 'FAILED';
export interface BulkEditRow {
  vehicleId: string;
  stockNumber: string | null;
  label: string | null;
  status: BulkEditRowStatus;
  changes: BulkFieldChange[];
  reason: string | null;
  incidentId: string | null;
  updatedAt: string | null;
}
export interface BulkEditPreview { rows: BulkEditRow[]; counts: Partial<Record<BulkEditRowStatus, number>> }
export interface BulkEditResult extends BulkEditPreview { batchId: string | null; undoAvailable: boolean }

export type BulkUndoRowStatus = 'RESTORED' | 'SKIPPED' | 'HELD' | 'FAILED';
export interface BulkUndoResult {
  batchId: string;
  rows: Array<{ vehicleId: string; stockNumber: string | null; status: BulkUndoRowStatus; changes: BulkFieldChange[]; reason: string | null; incidentId: string | null }>;
  counts: Partial<Record<BulkUndoRowStatus, number>>;
  /** Undo saves values in StarterGrid; channels get them on their next update. */
  note: string;
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const base = (dealerId: string) => `/api/dealers/${encodeURIComponent(dealerId)}/inventory/bulk-edits`;

export const previewBulkEdit = (dealerId: string, edits: BulkEdit[]) =>
  post<BulkEditPreview>(`${base(dealerId)}/preview`, { edits });
export const applyBulkEdit = (dealerId: string, edits: BulkEdit[]) =>
  post<BulkEditResult>(base(dealerId), { edits });
export const undoBulkEdit = (dealerId: string, batchId: string) =>
  post<BulkUndoResult>(`${base(dealerId)}/${encodeURIComponent(batchId)}/undo`);
