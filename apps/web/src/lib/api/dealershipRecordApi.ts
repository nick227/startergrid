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
  openDistributionIncidents?: number;
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
    status?: OnboardingStepStatus;
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
  waitingForStock?: boolean;
  createdAt: string;
  lastActivityAt: string;
  blockedStepCount: number;
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
  people: Array<DealershipPerson & { id: string }>;
  invitations: DealershipInvitation[];
  channelSetup: { status: 'READY' | 'NEEDS_ATTENTION'; missing: string[] };
};

export type ChannelSetupResult = { status: 'READY' | 'NEEDS_ATTENTION'; missing: string[]; message?: string | null };

/** Thrown when a create matches an existing dealership; carries its id when the caller can open it. */
export class DuplicateDealershipError extends Error {
  constructor(message: string, readonly existingDealershipId: string | null) {
    super(message);
    this.name = 'DuplicateDealershipError';
  }
}

export type DealershipPerson = {
  accountId: string;
  email: string;
  role: string;
  accessRole: DealerAccessRole;
  firstLoginAt: string | null;
  lastLoginAt: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  activationStatus?: string;
  isInternal: boolean;
};

export type DealershipInvitation = {
  id: string;
  email: string;
  accessRole: DealerAccessRole;
  deliveryStatus: string;
  deliveryError?: string | null;
  expiresAt: string;
  createdAt: string | null;
  acceptedAt?: string | null;
};

export type InviteDelivery = 'EMAIL_SENT' | 'EMAIL_FAILED' | 'LINK_ONLY';

export type InviteResult = {
  email: string;
  setupUrl: string;
  expiresAt?: string;
  delivery: InviteDelivery;
  deliveryError?: string | null;
};

export type PeopleResponse = {
  dealershipId?: string;
  signInUrl?: string;
  people: DealershipPerson[];
  invitations: DealershipInvitation[];
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    // Fastify rejects a JSON content type with an empty body, so only bodies get the header.
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(init?.headers ?? {}) },
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
  mine?: boolean;
  limit?: number;
} = {}): Promise<{ dealerships: DealershipRecordSummary[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.lifecycle) qs.set('lifecycle', params.lifecycle);
  if (params.needsAttention) qs.set('needsAttention', 'true');
  if (params.mine) qs.set('mine', 'true');
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
  return { ...adaptPeople(wire), dealershipId };
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

export type PersonInviteResponse = {
  invite: {
    id?: string;
    inviteId?: string;
    email: string;
    accessRole: DealerAccessRole;
    deliveryStatus?: 'SENT' | 'FAILED' | 'PENDING' | 'EXPIRED';
    delivery?: 'EMAIL_SENT' | 'EMAIL_FAILED' | 'LINK_ONLY';
    deliveryError?: string | null;
  };
  setupUrl?: string;
  delivery?: 'EMAIL_SENT' | 'EMAIL_FAILED' | 'LINK_ONLY';
};

export async function createPersonInvite(
  dealershipId: string,
  payload: { email: string; accessRole: DealerAccessRole; name?: string },
): Promise<PersonInviteResponse> {
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

function adaptInvite(wire: PersonInviteResponse & { invite: { setupUrl?: string; expiresAt?: string } }): InviteResult {
  return {
    email: wire.invite.email,
    setupUrl: wire.setupUrl ?? wire.invite.setupUrl ?? '',
    expiresAt: wire.invite.expiresAt,
    delivery: wire.delivery ?? wire.invite.delivery ?? 'LINK_ONLY',
    deliveryError: wire.invite.deliveryError ?? null,
  };
}

/** Add Person: creates the invitation and reports honestly whether anyone was emailed. */
export async function invitePerson(
  dealershipId: string,
  payload: { email: string; accessRole: DealerAccessRole; name?: string },
): Promise<InviteResult> {
  return adaptInvite(await createPersonInvite(dealershipId, payload));
}

/** Creates a replacement setup link; the previous link stops working. */
export async function replaceInviteLink(dealershipId: string, inviteId: string): Promise<InviteResult> {
  return adaptInvite(await apiFetch<PersonInviteResponse>(
    `/api/dealers/${encodeURIComponent(dealershipId)}/people/invites/${encodeURIComponent(inviteId)}/resend`,
    { method: 'POST' },
  ));
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
): Promise<{ person: { email: string }; temporaryPassword?: string }> {
  return apiFetch(`/api/dealers/${encodeURIComponent(dealershipId)}/people/${encodeURIComponent(accountId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Removes access to this dealership only; the login itself is kept. */
export async function removePerson(dealershipId: string, accountId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/dealers/${encodeURIComponent(dealershipId)}/people/${encodeURIComponent(accountId)}`, {
    method: 'DELETE',
  });
}

export type DealershipActivityEvent = {
  id: string;
  action: string;
  actorEmail: string;
  detail: unknown;
  createdAt: string;
};

export async function fetchDealershipActivity(
  dealershipId: string,
  params: { before?: string | null; limit?: number } = {},
): Promise<{ events: DealershipActivityEvent[]; nextBefore: string | null }> {
  const qs = new URLSearchParams();
  if (params.before) qs.set('before', params.before);
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiFetch(`/api/dealers/${encodeURIComponent(dealershipId)}/activity${query ? `?${query}` : ''}`);
}

export type CreateDealershipRecordInput = {
  legalName: string;
  businessCategory: string;
  ownerName?: string;
  ownerEmail: string;
};

export async function createDealershipRecord(input: CreateDealershipRecordInput): Promise<{
  dealerId: string;
  legalName: string;
  invite: InviteResult | null;
  channelSetup: ChannelSetupResult;
}> {
  const res = await fetch('/api/admin/dealerships', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createBody(input)),
  });
  const body = await res.json().catch(() => ({})) as {
    error?: string;
    existingDealershipId?: string;
    dealer?: { id: string; legalName: string };
    invite?: { inviteId: string; email: string; setupUrl: string; expiresAt?: string; delivery?: InviteDelivery; deliveryError?: string | null } | null;
    channelSetup?: ChannelSetupResult;
  };
  if (res.status === 409) throw new DuplicateDealershipError(body.error ?? 'This dealership already exists.', body.existingDealershipId ?? null);
  if (!res.ok || !body.dealer) throw new Error(body.error ?? `Request failed (${res.status})`);
  return {
    dealerId: body.dealer.id,
    legalName: body.dealer.legalName,
    invite: body.invite ? adaptInvite({ invite: { ...body.invite, accessRole: 'DEALER_OWNER' } }) : null,
    channelSetup: body.channelSetup ?? { status: 'READY', missing: [] },
  };
}

/** Re-runs default channel setup. Safe to repeat; it never duplicates anything. */
export async function retryChannelSetup(dealershipId: string): Promise<ChannelSetupResult> {
  const res = await apiFetch<{ channelSetup: ChannelSetupResult }>(
    `/api/admin/dealerships/${encodeURIComponent(dealershipId)}/channel-setup`,
    { method: 'POST' },
  );
  return res.channelSetup;
}

function createBody(input: CreateDealershipRecordInput) {
  return {
    legalName: input.legalName.trim(),
    businessCategory: input.businessCategory,
    primaryContact: { email: input.ownerEmail.trim(), ...(input.ownerName?.trim() ? { name: input.ownerName.trim() } : {}) },
    inviteOwnerEmail: input.ownerEmail.trim(),
  };
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
    signInUrl: wire.signInUrl,
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
      isInternal: p.isInternal ?? p.accessRole === 'INTERNAL_SUPPORT',
    })),
    invitations: wire.invitations.map(invite => ({
      id: invite.id,
      email: invite.email,
      accessRole: invite.accessRole,
      deliveryStatus: invite.deliveryStatus,
      deliveryError: invite.deliveryError ?? null,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt ?? null,
      acceptedAt: invite.acceptedAt ?? null,
    })),
  };
}
export function adaptSummary(wire: SummaryWire): DealershipRecordSummary {
  return { ...wire, dbaName: wire.dbaName ?? null, logoUrl: wire.logoUrl ?? null,
    primaryContactEmail: wire.primaryContactEmail ?? null, autopilotPreference: wire.autopilotPreference ?? 'OFF',
    internalOwner: wire.internalOwner ?? null,
    lastActivityAt: wire.lastActivityAt ?? wire.createdAt,
    blockedStepCount: wire.blockedStepCount ?? 0,
    nextStep: wire.nextStep?.stepKey ? { key: wire.nextStep.stepKey, status: wire.nextStep.status, label: STEP_LABELS[wire.nextStep.stepKey],
      ownerKind: wire.nextStep.ownerKind as TaskOwnerKind, nextAction: wire.nextStep.incompleteReason } : null };
}
export function adaptRecord(wire: RecordWire): DealershipRecordDetail {
  const steps = (wire.onboarding?.steps ?? []).map(step => ({ key: step.stepKey, label: STEP_LABELS[step.stepKey],
    status: step.status, ownerKind: step.ownerKind as TaskOwnerKind, blockingReason: step.incompleteReason,
    nextAction: step.incompleteReason, evidence: step.evidence, updatedAt: step.completedAt ?? wire.createdAt }));
  const people = wire.people ? adaptPeople(wire.people) : { people: [], invitations: [] };
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
    people: people.people.map((person) => ({ ...person, id: person.accountId })),
    invitations: people.invitations,
    channelSetup: {
      status: wire.channelSetup?.status === 'NEEDS_ATTENTION' ? 'NEEDS_ATTENTION' : 'READY',
      missing: wire.channelSetup?.missing ?? [],
    },
  };
}
