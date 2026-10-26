import type { DealershipRecordDetail as RecordWire, DealershipRecordSummary as SummaryWire,
  DealershipPeopleResponse, OnboardingSnapshot, TemporaryLoginResponse } from '@auto-dealer/api-client';
/**
 * API client for V5 Dealership Record, Guided Onboarding, People & Access, and Leads.
 */

export type DealershipLifecycle =
  | 'DRAFT'
  | 'SETTING_UP'
  | 'READY_TO_LAUNCH'
  | 'ACTIVE'
  | 'PAUSED'
  | 'ARCHIVED';

export type OnboardingStepKey = 'CREATE' | 'ACCESS' | 'VEHICLES' | 'CHANNELS' | 'HANDOFF';
export type OnboardingStepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'BLOCKED' | 'NEEDS_RECHECK';
export type TaskOwnerKind = 'YOU' | 'OUR_TEAM' | 'SYSTEM' | 'PARTNER' | 'DEALER';
export type DealerAccessRole = 'DEALER_OWNER' | 'DEALER_STAFF' | 'INTERNAL_SUPPORT';

export type OnboardingStepDto = {
  key: OnboardingStepKey;
  label: string;
  status: OnboardingStepStatus;
  ownerKind: TaskOwnerKind;
  ownerName?: string | null;
  blockingReason?: string | null;
  nextAction?: string | null;
  evidence?: Record<string, unknown> | null;
  updatedAt: string;
};

export type DealershipRecordSummary = {
  id: string;
  legalName: string;
  dbaName: string | null;
  logoUrl: string | null;
  businessCategory: string;
  lifecycleStatus: DealershipLifecycle;
  primaryContactEmail: string | null;
  internalOwnerId?: string | null;
  internalOwner?: { id: string; email: string; name?: string | null } | null;
  nextStep?: {
    key: OnboardingStepKey;
    label: string;
    ownerKind: TaskOwnerKind;
    ownerName?: string | null;
    nextAction?: string | null;
  } | null;
  counts?: {
    vehicles: number;
    invitations: number;
    people: number;
  };
  autopilotPreference: 'OFF' | 'ON' | 'PAUSED';
  createdAt: string;
};

export type DealershipRecordDetail = DealershipRecordSummary & {
  websiteUrl: string | null;
  dealerLicense: string | null;
  rooftopAddress: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;
  primaryContact: {
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  waitingForStock: boolean;
  launchCompletedAt: string | null;
  handoffCompletedAt: string | null;
  handoffCompletedBy: string | null;
  onboardingSteps: OnboardingStepDto[];
  inventory: {
    total: number;
    ready: number;
    needsAttention: number;
    sold: number;
  };
  channels: Array<{
    slug: string;
    name: string;
    status: 'ACTIVE' | 'NEEDS_LOGIN' | 'SETUP_NEEDED' | 'PAUSED' | 'NOT_CONFIGURED';
    eligibleVehicles: number;
    liveVehicles?: number;
    autopilotEnabled?: boolean;
  }>;
  people: Array<{
    id: string;
    email: string;
    role: string;
    accessRole: DealerAccessRole;
    firstLoginAt: string | null;
    lastLoginAt: string | null;
    isActive: boolean;
    mustChangePassword?: boolean;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    accessRole: DealerAccessRole;
    deliveryStatus: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'ACCEPTED' | 'REVOKED';
    expiresAt: string;
    createdAt: string;
  }>;
};

export type PeopleResponse = {
  dealershipId?: string;
  signInUrl?: string;
  people: Array<{
    accountId: string;
    email: string;
    role: string;
    accessRole: DealerAccessRole;
    firstLoginAt: string | null;
    lastLoginAt: string | null;
    isActive: boolean;
    mustChangePassword: boolean;
    activationStatus?: string;
  }>;
  invitations?: Array<{
    id: string;
    email: string;
    accessRole: DealerAccessRole;
    deliveryStatus: string;
    expiresAt: string;
    createdAt?: string;
    acceptedAt?: string | null;
  }>;
  invites?: Array<{
    id: string;
    email: string;
    accessRole: DealerAccessRole;
    deliveryStatus: string;
    expiresAt: string;
    createdAt?: string;
    acceptedAt?: string | null;
  }>;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ── Dealership Records ────────────────────────────────────────────────────────

export async function fetchAdminDealerships(params: {
  q?: string;
  lifecycle?: string;
  needsAttention?: boolean;
  limit?: number;
} = {}): Promise<{ dealerships: DealershipRecordSummary[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.lifecycle) qs.set('lifecycle', params.lifecycle);
  if (params.needsAttention) qs.set('needsAttention', 'true');
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const result = await apiFetch<{ dealerships: SummaryWire[] }>(`/api/admin/dealerships${query ? `?${query}` : ''}`);
  return { dealerships: result.dealerships.map(adaptSummary), total: result.dealerships.length };
}

export async function fetchAdminDealershipRecord(dealershipId: string): Promise<DealershipRecordDetail> {
  return adaptRecord(await apiFetch<RecordWire>(`/api/admin/dealerships/${dealershipId}`));
}

export async function patchAdminDealershipRecord(
  dealershipId: string,
  data: {
    lifecycleStatus?: DealershipLifecycle;
    internalOwnerId?: string | null;
    waitingForStock?: boolean;
    autopilotPreference?: 'OFF' | 'ON' | 'PAUSED';
    stepKey?: OnboardingStepKey;
    status?: OnboardingStepStatus;
  },
): Promise<DealershipRecordDetail> {
  await apiFetch<RecordWire>(`/api/admin/dealerships/${dealershipId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return fetchAdminDealershipRecord(dealershipId);
}

// ── Onboarding ───────────────────────────────────────────────────────────────

export async function fetchOnboarding(dealershipId: string): Promise<{
  dealershipId: string;
  steps: OnboardingStepDto[];
  nextStep: OnboardingStepDto | null;
  overallStatus: string;
}> {
  const wire = await apiFetch<OnboardingSnapshot>(`/api/admin/dealerships/${dealershipId}/onboarding`);
  const steps = wire.steps.map(s => ({ key: s.stepKey, label: STEP_LABELS[s.stepKey], status: s.status,
    ownerKind: s.ownerKind as TaskOwnerKind, blockingReason: s.incompleteReason, updatedAt: s.completedAt ?? '' }));
  return { dealershipId, steps, nextStep: steps.find(s => s.status !== 'COMPLETE') ?? null, overallStatus: wire.lifecycleStatus ?? 'SETTING_UP' };
}

export async function patchOnboarding(
  dealershipId: string,
  data: {
    stepKey: OnboardingStepKey;
    status?: OnboardingStepStatus;
    waitingForStock?: boolean;
    autopilotPreference?: 'OFF' | 'ON' | 'PAUSED';
    evidence?: Record<string, unknown>;
  },
): Promise<{ steps: OnboardingStepDto[]; nextStep: OnboardingStepDto | null }> {
  return apiFetch(`/api/admin/dealerships/${dealershipId}/onboarding`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function completeHandoff(dealershipId: string): Promise<{ ok: boolean; handoffCompletedAt: string }> {
  return apiFetch(`/api/admin/dealerships/${dealershipId}/handoff`, {
    method: 'POST',
  });
}

// ── People & Access ─────────────────────────────────────────────────────────

export async function fetchDealershipPeople(dealershipId: string): Promise<PeopleResponse> {
  const wire = await apiFetch<DealershipPeopleResponse>(`/api/dealers/${encodeURIComponent(dealershipId)}/people`);
  const data = adaptPeople(wire);
  const invitesList = data.invitations ?? [];
  return {
    ...data,
    dealershipId,
    invitations: invitesList,
    invites: invitesList,
  };
}

export type InviteEmailPreview = {
  dealershipName: string;
  recipientEmail: string;
  recipientName?: string | null;
  accessRole: DealerAccessRole;
  roleLabel: string;
  supportEmail: string;
  subject: string;
  previewBody: string;
};

export type AutopilotSimulationResult = {
  dealershipId: string;
  dealerName: string;
  evaluatedAt: string;
  simulatedMode: 'ON' | 'OFF' | 'PAUSED';
  currentMode: 'ON' | 'OFF' | 'PAUSED';
  summary: {
    totalInventory: number;
    qualifiedCount: number;
    heldCount: number;
    needsAttentionCount: number;
    scheduledOperations: {
      upsert: number;
      withdraw: number;
    };
  };
  channels: Array<{
    channel: string;
    name: string;
    connected: boolean;
    qualification: string;
    eligibleCount: number;
    blockedCount: number;
    scheduledUpserts: number;
    scheduledWithdraws: number;
    blockers: Array<{
      reasonCode: string;
      message: string;
      owner: 'DEALERSHIP' | 'INTERNAL_SUPPORT' | 'SYSTEM' | 'PARTNER';
      vehicleCount: number;
      sampleStockNumbers: string[];
    }>;
  }>;
  heldVehicles: Array<{
    vehicleId: string;
    stockNumber: string;
    year: number;
    make: string;
    model: string;
    reasonCode: string;
    nextAction: string;
    owner: string;
    channel: string;
  }>;
};

export async function preparePersonInvite(
  dealershipId: string,
  payload: { email: string; accessRole: DealerAccessRole; name?: string },
): Promise<InviteEmailPreview> {
  return apiFetch(`/api/dealers/${encodeURIComponent(dealershipId)}/people/invites/prepare`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAutopilotPreview(
  dealershipId: string,
  opts?: { mode?: 'ON' | 'OFF' | 'PAUSED'; includedChannels?: string[] },
): Promise<AutopilotSimulationResult> {
  return apiFetch(`/api/dealers/${encodeURIComponent(dealershipId)}/autopilot/preview`, {
    method: 'POST',
    body: JSON.stringify(opts ?? {}),
  });
}

export async function createPersonInvite(
  dealershipId: string,
  payload: { email: string; accessRole: DealerAccessRole; name?: string },
): Promise<{ invite: { id: string; email: string; accessRole: DealerAccessRole }; setupUrl?: string }> {
  return apiFetch(`/api/dealers/${dealershipId}/people/invites`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resendPersonInvite(
  dealershipId: string,
  inviteId: string,
): Promise<{ setupUrl: string }> {
  return apiFetch(`/api/dealers/${dealershipId}/people/invites/${inviteId}/resend`, {
    method: 'POST',
  });
}

export async function revokePersonInvite(dealershipId: string, inviteId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/dealers/${dealershipId}/people/invites/${inviteId}/revoke`, {
    method: 'POST',
  });
}

export async function createTemporaryLogin(
  dealershipId: string,
  payload: { email: string; accessRole: DealerAccessRole; name?: string },
): Promise<TemporaryLoginResponse> {
  return apiFetch(`/api/dealers/${dealershipId}/people/temporary-login`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function patchPersonAccess(
  dealershipId: string,
  accountId: string,
  payload: { accessRole?: DealerAccessRole; isActive?: boolean; resetPassword?: boolean },
): Promise<unknown> {
  return apiFetch(`/api/dealers/${dealershipId}/people/${accountId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ── Leads API ───────────────────────────────────────────────────────────────

export async function updateLeadWorkflow(
  dealershipId: string,
  leadId: string,
  payload: {
    workflowStatus?: 'NEW' | 'CONTACTED' | 'APPOINTMENT' | 'SOLD' | 'LOST';
    assigneeOperatorId?: string | null;
    notes?: string | null;
    version?: number;
  },
): Promise<{ id: string; workflowStatus: string; assigneeOperatorId: string | null; notes: string | null }> {
  return apiFetch(`/api/dealers/${dealershipId}/leads/${leadId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

const STEP_LABELS: Record<OnboardingStepKey, string> = { CREATE: 'Create dealership', ACCESS: 'Owner access',
  VEHICLES: 'Prepare inventory', CHANNELS: 'Choose destinations', HANDOFF: 'Complete handoff' };
export function adaptPeople(wire: DealershipPeopleResponse): PeopleResponse {
  return {
    dealershipId: '',
    people: wire.people.map(p => ({
      accountId: p.accountId,
      email: p.email,
      role: p.role ?? '',
      accessRole: p.accessRole,
      isActive: p.isActive,
      mustChangePassword: p.mustChangePassword ?? false,
      firstLoginAt: p.firstLoginAt ?? null,
      lastLoginAt: p.lastLoginAt ?? null,
      activationStatus: p.activationStatus,
    })),
    invitations: wire.invitations,
    invites: wire.invitations,
  };
}
export function adaptSummary(wire: SummaryWire): DealershipRecordSummary {
  return { ...wire, dbaName: wire.dbaName ?? null, logoUrl: wire.logoUrl ?? null,
    primaryContactEmail: wire.primaryContactEmail ?? null, autopilotPreference: wire.autopilotPreference ?? 'OFF',
    nextStep: wire.nextStep?.stepKey ? { key: wire.nextStep.stepKey, label: STEP_LABELS[wire.nextStep.stepKey],
      ownerKind: wire.nextStep.ownerKind as TaskOwnerKind, nextAction: wire.nextStep.incompleteReason } : null };
}
export function adaptRecord(wire: RecordWire): DealershipRecordDetail {
  const steps = (wire.onboarding?.steps ?? []).map(step => ({ key: step.stepKey, label: STEP_LABELS[step.stepKey],
    status: step.status, ownerKind: step.ownerKind as TaskOwnerKind, blockingReason: step.incompleteReason,
    nextAction: step.incompleteReason, evidence: step.evidence, updatedAt: step.completedAt ?? wire.createdAt }));
  return { ...adaptSummary(wire), internalOwner: wire.internalOwner?.id && wire.internalOwner.email ? { id: wire.internalOwner.id, email: wire.internalOwner.email } : null,
    websiteUrl: wire.websiteUrl ?? null, dealerLicense: null, rooftopAddress: wire.rooftopAddress ?? null,
    primaryContact: wire.primaryContact ?? null, waitingForStock: wire.waitingForStock ?? false,
    launchCompletedAt: wire.launchCompletedAt ?? null, handoffCompletedAt: wire.handoffCompletedAt ?? null, handoffCompletedBy: null,
    onboardingSteps: steps, nextStep: steps.find(s => s.status !== 'COMPLETE') ?? null,
    inventory: { total: wire.inventory?.vehicleCount ?? 0, ready: wire.inventory?.ready ?? 0,
      needsAttention: wire.inventory?.needsAttention ?? 0, sold: wire.inventory?.sold ?? 0 },
    channels: (wire.channels?.items ?? []).map((channel) => ({
      ...channel,
      eligibleVehicles: 0,
    })),
    people: wire.people
      ? adaptPeople(wire.people).people.map((person) => ({ ...person, id: person.accountId }))
      : [],
    invitations: (wire.people?.invitations ?? []).map((invite) => ({
      id: invite.id,
      email: invite.email,
      accessRole: invite.accessRole,
      deliveryStatus: invite.deliveryStatus as DealershipRecordDetail['invitations'][number]['deliveryStatus'],
      expiresAt: invite.expiresAt,
      createdAt: invite.expiresAt,
    })),
  };
}
