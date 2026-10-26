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
    liveVehicles: number;
    autopilotEnabled: boolean;
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
  limit?: number;
} = {}): Promise<{ dealerships: DealershipRecordSummary[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.lifecycle) qs.set('lifecycle', params.lifecycle);
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiFetch<{ dealerships: DealershipRecordSummary[]; total: number }>(
    `/api/admin/dealerships${query ? `?${query}` : ''}`,
  );
}

export async function fetchAdminDealershipRecord(dealershipId: string): Promise<DealershipRecordDetail> {
  return apiFetch<DealershipRecordDetail>(`/api/admin/dealerships/${dealershipId}`);
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
  return apiFetch<DealershipRecordDetail>(`/api/admin/dealerships/${dealershipId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ── Onboarding ───────────────────────────────────────────────────────────────

export async function fetchOnboarding(dealershipId: string): Promise<{
  dealershipId: string;
  steps: OnboardingStepDto[];
  nextStep: OnboardingStepDto | null;
  overallStatus: string;
}> {
  return apiFetch(`/api/admin/dealerships/${dealershipId}/onboarding`);
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
  const data = await apiFetch<PeopleResponse>(`/api/dealers/${encodeURIComponent(dealershipId)}/people`);
  const invitesList = data.invitations ?? data.invites ?? [];
  return {
    ...data,
    dealershipId,
    invitations: invitesList,
    invites: invitesList,
  };
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
): Promise<{ invite: { id: string; email: string } }> {
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
): Promise<{ person: { id: string; email: string }; temporaryPassword: string; message: string }> {
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
