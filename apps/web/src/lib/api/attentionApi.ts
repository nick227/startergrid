/**
 * Client for GET /api/dealers/:dealershipId/attention: one list of everything that needs a
 * person, built from recorded state. Map `action.kind` to a route in the UI; when
 * `unavailableAreas` is non-empty the list is incomplete and must not read as all clear.
 */
export type AttentionArea = 'VEHICLES' | 'REMOVALS' | 'CHANNELS' | 'LEADS';
export type AttentionOwner = 'DEALERSHIP' | 'INTERNAL_SUPPORT' | 'PARTNER' | 'SYSTEM';
export type AttentionSeverity = 'BLOCKING' | 'WARNING' | 'WAITING';
export type AttentionKind =
  | 'VEHICLE_INFORMATION_MISSING'
  | 'VEHICLE_PHOTOS_MISSING'
  | 'SOLD_LISTING_TAKE_DOWN_NEEDED'
  | 'SOLD_LISTING_EXTERNAL_REMOVAL'
  | 'SOLD_LISTING_REMOVAL_FAILED'
  | 'SOLD_LISTING_REMOVAL_IN_PROGRESS'
  | 'CHANNEL_SETUP_INCOMPLETE'
  | 'DISTRIBUTION_PROBLEM'
  | 'UNANSWERED_INQUIRY'
  | 'CRM_DELIVERY_FAILED';
export type AttentionActionKind =
  | 'FIX_VEHICLES'
  | 'ADD_PHOTOS'
  | 'REVIEW_REMOVALS'
  | 'END_EXTERNAL_LISTING'
  | 'COMPLETE_CHANNEL_SETUP'
  | 'OPEN_LEADS'
  | 'RETRY_CRM_DELIVERY'
  | 'CONTACT_SUPPORT'
  | 'NONE';

export interface AttentionRecord {
  type: 'VEHICLE' | 'LISTING' | 'CHANNEL' | 'LEAD';
  id: string;
  label: string;
  detail: string | null;
  channel: string | null;
  vehicleId: string | null;
}

export interface AttentionItem {
  key: string;
  area: AttentionArea;
  kind: AttentionKind;
  severity: AttentionSeverity;
  owner: AttentionOwner;
  ownerId: string | null;
  /** All affected records; `records` holds at most 50. */
  count: number;
  summary: string;
  nextAction: string;
  action: { kind: AttentionActionKind; enabled: boolean; disabledReason: string | null; channel: string | null };
  records: AttentionRecord[];
}

export interface AttentionResponse {
  dealershipId: string;
  generatedAt: string;
  counts: { total: number; blocking: number; dealershipActions: number; waiting: number };
  items: AttentionItem[];
  unavailableAreas: AttentionArea[];
}

export async function fetchAttention(dealerId: string): Promise<AttentionResponse> {
  const res = await fetch(`/api/dealers/${encodeURIComponent(dealerId)}/attention`, { credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load what needs attention');
  }
  return res.json();
}
