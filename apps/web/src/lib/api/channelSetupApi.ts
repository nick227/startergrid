/**
 * Client for per-channel setup plans. Render the plan as-is: `headline`, then the steps, with
 * a button only on the current step. Owners: DEALERSHIP = "You", INTERNAL_SUPPORT =
 * "StarterGrid", PARTNER = the channel. When `viewerCanAct` is false, say the dealership owner
 * completes "You" steps. READY means set up, not that listings are live.
 */
export type SetupOwner = 'DEALERSHIP' | 'INTERNAL_SUPPORT' | 'PARTNER';
export type SetupStepState = 'DONE' | 'TODO' | 'WAITING' | 'BLOCKED';
export type SetupActionKind = 'CONNECT_ACCOUNT' | 'ENTER_DETAILS' | 'OPEN_PROVIDER_SITE' | 'CONTACT_SUPPORT' | 'NONE';
export type SetupPlanStatus = 'READY' | 'NEEDS_YOU' | 'WAITING' | 'BLOCKED';

export interface SetupField {
  key: string;
  label: string;
  hint: string | null;
  placeholder: string | null;
  pattern: string | null;
  validationHint: string | null;
  /** accountId → top-level `accountId`; connectionConfig → `connectionConfig[key]` in PATCH /accounts/:channel. */
  saveAs: 'accountId' | 'connectionConfig';
  filled: boolean;
}

export interface SetupStep {
  id: string;
  title: string;
  instruction: string;
  owner: SetupOwner;
  state: SetupStepState;
  /** OBSERVED: StarterGrid saw it (token, saved details, passed check). REPORTED: someone said so. */
  doneBasis: 'OBSERVED' | 'REPORTED' | null;
  action: {
    kind: SetupActionKind;
    label: string | null;
    /** OPEN_PROVIDER_SITE: their site. CONTACT_SUPPORT: a mailto: link to StarterGrid support. */
    url: string | null;
    fields: SetupField[];
    /** "I've done this" for steps StarterGrid cannot see; send `patch` to PATCH /accounts/:channel. */
    markDone: { label: string; patch: { state: 'PENDING_REVIEW' | 'ACTIVE' } } | null;
  };
}

export interface ChannelSetupPlan {
  channel: string;
  name: string;
  status: SetupPlanStatus;
  headline: string;
  currentStepId: string | null;
  progress: { done: number; total: number };
  postingNote: string | null;
  providerEstimate: string | null;
  steps: SetupStep[];
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load channel setup');
  }
  return res.json();
}

export const fetchChannelSetupPlans = (dealerId: string) =>
  get<{ viewerCanAct: boolean; plans: ChannelSetupPlan[] }>(`/api/dealers/${encodeURIComponent(dealerId)}/channels/setup`);
export const fetchChannelSetupPlan = (dealerId: string, channel: string) =>
  get<{ viewerCanAct: boolean; plan: ChannelSetupPlan }>(`/api/dealers/${encodeURIComponent(dealerId)}/channels/${encodeURIComponent(channel)}/setup`);
