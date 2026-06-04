import type { PrismaClient, PlatformAccountState, Prisma } from '@prisma/client';
import { platformProfiles } from '../../data/platformProfiles.js';

// ── State classification helpers ─────────────────────────────────────────────

export const VALID_ACCOUNT_STATES: PlatformAccountState[] = [
  'ACCOUNT_NEEDED', 'CREDENTIALS_NEEDED', 'PENDING_REVIEW',
  'ACTIVE', 'BLOCKED', 'PARTNER_REQUIRED', 'SUSPENDED'
];

export const NEXT_ACTION_OWNERS = ['DEALER', 'OPERATOR', 'PLATFORM'] as const;
export type NextActionOwner = typeof NEXT_ACTION_OWNERS[number];

export function isBlockingAccountState(state: string): boolean {
  return state === 'BLOCKED' || state === 'SUSPENDED';
}

export function isPartnerRequiredAccountState(state: string): boolean {
  return state === 'PARTNER_REQUIRED';
}

export function needsSetupAccountState(state: string): boolean {
  return state === 'ACCOUNT_NEEDED' || state === 'CREDENTIALS_NEEDED';
}

export function validateAccountUpdatePayload(payload: AccountUpdatePayload): string | null {
  if (payload.state !== undefined && !VALID_ACCOUNT_STATES.includes(payload.state as PlatformAccountState)) {
    return `Invalid state: ${payload.state}`;
  }
  if (
    payload.nextActionOwner !== undefined &&
    payload.nextActionOwner !== null &&
    payload.nextActionOwner !== '' &&
    !NEXT_ACTION_OWNERS.includes(payload.nextActionOwner as NextActionOwner)
  ) {
    return `Invalid nextActionOwner: ${payload.nextActionOwner}`;
  }
  return null;
}

// ── Readiness score ──────────────────────────────────────────────────────────

export type ReadinessScore = {
  score: number;       // 0–100
  missing: string[];   // unfilled fields that would improve the score
};

export const STATE_BASE_SCORE: Record<string, number> = {
  ACTIVE:             60,
  PENDING_REVIEW:     40,
  CREDENTIALS_NEEDED: 25,
  ACCOUNT_NEEDED:     10,
  PARTNER_REQUIRED:   15,
  BLOCKED:             0,
  SUSPENDED:           0,
};

export function computeReadinessScore(
  account: Pick<PlatformAccountDetail, 'state' | 'accountId' | 'platformRepName' | 'platformRepEmail' | 'nextAction' | 'membershipStatus'>
): ReadinessScore {
  const base = STATE_BASE_SCORE[account.state] ?? 10;
  const missing: string[] = [];
  let bonus = 0;

  if (account.accountId)                                   bonus += 10;
  else                                                     missing.push('Account ID');

  if (account.platformRepName || account.platformRepEmail) bonus += 10;
  else                                                     missing.push('Platform rep contact');

  if (account.nextAction)                                  bonus += 10;
  else                                                     missing.push('Next action');

  if (account.membershipStatus)                            bonus += 10;
  else                                                     missing.push('Membership status');

  return { score: Math.min(100, base + bonus), missing };
}

// ── Public types ─────────────────────────────────────────────────────────────

export type AccountUpdatePayload = {
  state?: string;
  notes?: string;
  accountId?: string;
  platformRepName?: string;
  platformRepEmail?: string;
  membershipStatus?: string;
  nextAction?: string;
  nextActionOwner?: string | null;
};

export type PlatformAccountDetail = {
  id: string;
  platformSlug: string;
  platformName: string;
  integrationClass: string;
  state: string;
  accountId: string | null;
  platformRepName: string | null;
  platformRepEmail: string | null;
  membershipStatus: string | null;
  nextAction: string | null;
  nextActionOwner: string | null;
  notes: string | null;
  lastChecked: string | null;
  createdAt: string;
  updatedAt: string;
  readinessScore: number;
};

// ── DB functions ─────────────────────────────────────────────────────────────

async function ensureAccountRows(prisma: PrismaClient, dealershipId: string): Promise<void> {
  const existing = await prisma.platformAccount.findMany({
    where: { dealershipId }, select: { platformSlug: true }
  });
  const existingSlugs = new Set(existing.map(a => a.platformSlug));
  const missing = platformProfiles.filter(p => !existingSlugs.has(p.slug));
  if (!missing.length) return;
  await prisma.platformAccount.createMany({
    data: missing.map(p => ({
      dealershipId, platformSlug: p.slug, state: 'ACCOUNT_NEEDED' as PlatformAccountState
    })),
    skipDuplicates: true
  });
}

export async function listPlatformAccounts(
  prisma: PrismaClient,
  dealershipId: string
): Promise<{ accounts: PlatformAccountDetail[]; summary: AccountStateSummary }> {
  await ensureAccountRows(prisma, dealershipId);

  const rows = await prisma.platformAccount.findMany({ where: { dealershipId } });
  const bySlug = new Map(rows.map(r => [r.platformSlug, r]));

  const accounts: PlatformAccountDetail[] = platformProfiles.map(p => {
    const r = bySlug.get(p.slug);
    const base: Omit<PlatformAccountDetail, 'readinessScore'> = {
      id:                r?.id ?? p.slug,
      platformSlug:      p.slug,
      platformName:      p.name,
      integrationClass:  p.integrationClass,
      state:             r?.state ?? 'ACCOUNT_NEEDED',
      accountId:         r?.accountId ?? null,
      platformRepName:   r?.platformRepName ?? null,
      platformRepEmail:  r?.platformRepEmail ?? null,
      membershipStatus:  r?.membershipStatus ?? null,
      nextAction:        r?.nextAction ?? null,
      nextActionOwner:   r?.nextActionOwner ?? null,
      notes:             r?.notes ?? null,
      lastChecked:       r?.lastChecked?.toISOString() ?? null,
      createdAt:         r?.createdAt.toISOString() ?? new Date().toISOString(),
      updatedAt:         r?.updatedAt.toISOString() ?? new Date().toISOString(),
    };
    return { ...base, readinessScore: computeReadinessScore(base).score };
  });

  const summary = buildSummary(accounts);
  return { accounts, summary };
}

export type AccountStateSummary = {
  total: number;
  active: number;
  needsSetup: number;
  pendingReview: number;
  blocked: number;
  partnerRequired: number;
};

export function buildSummary(accounts: Pick<PlatformAccountDetail, 'state'>[]): AccountStateSummary {
  return {
    total:          accounts.length,
    active:         accounts.filter(a => a.state === 'ACTIVE').length,
    needsSetup:     accounts.filter(a => needsSetupAccountState(a.state)).length,
    pendingReview:  accounts.filter(a => a.state === 'PENDING_REVIEW').length,
    blocked:        accounts.filter(a => isBlockingAccountState(a.state)).length,
    partnerRequired: accounts.filter(a => isPartnerRequiredAccountState(a.state)).length,
  };
}

export async function updatePlatformAccount(
  prisma: PrismaClient,
  dealershipId: string,
  platformSlug: string,
  payload: AccountUpdatePayload
): Promise<PlatformAccountDetail> {
  const current = await prisma.platformAccount.findUnique({
    where: { dealershipId_platformSlug: { dealershipId, platformSlug } }
  });

  const update: Prisma.PlatformAccountUpdateInput = { lastChecked: new Date() };
  if (payload.state !== undefined)            update.state = payload.state as PlatformAccountState;
  if (payload.notes !== undefined)            update.notes = payload.notes;
  if (payload.accountId !== undefined)        update.accountId = payload.accountId;
  if (payload.platformRepName !== undefined)  update.platformRepName = payload.platformRepName;
  if (payload.platformRepEmail !== undefined) update.platformRepEmail = payload.platformRepEmail;
  if (payload.membershipStatus !== undefined) update.membershipStatus = payload.membershipStatus;
  if (payload.nextAction !== undefined)       update.nextAction = payload.nextAction;
  if (payload.nextActionOwner !== undefined)  update.nextActionOwner = payload.nextActionOwner ?? null;

  const updated = await prisma.platformAccount.upsert({
    where: { dealershipId_platformSlug: { dealershipId, platformSlug } },
    update,
    create: {
      dealershipId,
      platformSlug,
      state: (payload.state ?? 'ACCOUNT_NEEDED') as PlatformAccountState,
      notes: payload.notes,
      accountId: payload.accountId,
      platformRepName: payload.platformRepName,
      platformRepEmail: payload.platformRepEmail,
      membershipStatus: payload.membershipStatus,
      nextAction: payload.nextAction,
      nextActionOwner: payload.nextActionOwner,
      lastChecked: new Date(),
    }
  });

  // Write ACCOUNT_UPDATED SyncEvent only when state actually changes
  const stateChanged = payload.state !== undefined && current?.state !== payload.state;
  if (stateChanged) {
    await prisma.syncEvent.create({
      data: {
        dealershipId,
        platformSlug,
        kind: 'ACCOUNT_UPDATED',
        payload: {
          previousState: current?.state ?? null,
          newState: payload.state,
          platformSlug,
        } as unknown as Prisma.InputJsonValue,
      }
    });
  }

  const platform = platformProfiles.find(p => p.slug === platformSlug);
  const base: Omit<PlatformAccountDetail, 'readinessScore'> = {
    id:               updated.id,
    platformSlug,
    platformName:     platform?.name ?? platformSlug,
    integrationClass: platform?.integrationClass ?? 'ASSISTED',
    state:            updated.state,
    accountId:        updated.accountId,
    platformRepName:  updated.platformRepName,
    platformRepEmail: updated.platformRepEmail,
    membershipStatus: updated.membershipStatus,
    nextAction:       updated.nextAction,
    nextActionOwner:  updated.nextActionOwner,
    notes:            updated.notes,
    lastChecked:      updated.lastChecked?.toISOString() ?? null,
    createdAt:        updated.createdAt.toISOString(),
    updatedAt:        updated.updatedAt.toISOString(),
  };
  return { ...base, readinessScore: computeReadinessScore(base).score };
}
