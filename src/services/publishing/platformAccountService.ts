import type { PrismaClient, PlatformAccountState, Prisma } from '@prisma/client';
import { platformProfiles } from '../../data/platformProfiles.js';
import type { PlatformProfileSeed, ConnectionField, PartnerSignupInfo } from '../../lib/types.js';

// ── State classification helpers ─────────────────────────────────────────────

export const VALID_ACCOUNT_STATES: PlatformAccountState[] = [
  'ACCOUNT_NEEDED', 'CREDENTIALS_NEEDED', 'PENDING_REVIEW',
  'ACTIVE', 'BLOCKED', 'PARTNER_REQUIRED', 'SUSPENDED'
];

export const NEXT_ACTION_OWNERS = ['DEALER', 'OPERATOR', 'PLATFORM'] as const;
export type NextActionOwner = typeof NEXT_ACTION_OWNERS[number];

const ACCOUNT_FIELD_LIMITS: Partial<Record<keyof AccountUpdatePayload, number>> = {
  notes: 5000,
  accountId: 120,
  platformRepName: 160,
  platformRepEmail: 255,
  membershipStatus: 80,
  nextAction: 255,
};

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
  for (const [field, max] of Object.entries(ACCOUNT_FIELD_LIMITS)) {
    const value = payload[field as keyof AccountUpdatePayload];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      return `${field} must be a string`;
    }
    if (typeof value === 'string' && value.length > max) {
      return `${field} must be ${max} characters or less`;
    }
  }
  if (
    payload.platformRepEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.platformRepEmail)
  ) {
    return 'platformRepEmail must be a valid email address';
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
  connectionFields?: ConnectionField[];
  oauthProvider: string | null;
  oauthConnected: boolean;
  oauthExpired: boolean;
  tier: number | null;
  partnerSignup: PartnerSignupInfo | null;
};

// ── DB functions ─────────────────────────────────────────────────────────────

function profilesForCategory(category: string): PlatformProfileSeed[] {
  return platformProfiles.filter(p => p.supportedCategories.includes(category));
}

async function ensureAccountRows(
  prisma: PrismaClient,
  dealershipId: string,
  profiles: PlatformProfileSeed[]
): Promise<void> {
  const existing = await prisma.platformAccount.findMany({
    where: { dealershipId }, select: { platformSlug: true }
  });
  const existingSlugs = new Set(existing.map(a => a.platformSlug));
  const missing = profiles.filter(p => !existingSlugs.has(p.slug));
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
  const dealer = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: { businessCategory: true },
  });
  const category = dealer?.businessCategory ?? 'AUTOMOTIVE';
  const profiles = profilesForCategory(category);

  await ensureAccountRows(prisma, dealershipId, profiles);

  const [rows, tokenRows] = await Promise.all([
    prisma.platformAccount.findMany({ where: { dealershipId } }),
    prisma.platformOAuthToken.findMany({ where: { dealershipId }, select: { provider: true, expiresAt: true } }),
  ]);
  const bySlug = new Map(rows.map(r => [r.platformSlug, r]));
  // 60 s buffer: treat tokens expiring within the next minute as already expired
  const EXPIRY_BUFFER_MS = 60_000;
  const isExpired = (exp: Date | null) => exp !== null && exp.getTime() - EXPIRY_BUFFER_MS <= Date.now();
  const liveProviders = new Set(tokenRows.filter(t => !isExpired(t.expiresAt)).map(t => t.provider));
  const anyProviders  = new Set(tokenRows.map(t => t.provider));

  const accounts: PlatformAccountDetail[] = profiles.map(p => {
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
      connectionFields:  p.connectionFields,
      oauthProvider:     p.oauthProvider ?? null,
      oauthConnected:    p.oauthProvider ? liveProviders.has(p.oauthProvider) : false,
      oauthExpired:      p.oauthProvider
        ? anyProviders.has(p.oauthProvider) && !liveProviders.has(p.oauthProvider)
        : false,
      tier:              p.tier ?? null,
      partnerSignup:     p.partnerSignup ?? null,
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
  const tokenRow = platform?.oauthProvider
    ? await prisma.platformOAuthToken.findUnique({
        where: { dealershipId_provider: { dealershipId, provider: platform.oauthProvider } },
        select: { expiresAt: true },
      })
    : null;

  const EXPIRY_BUFFER_MS = 60_000;
  const tokenExpired = tokenRow?.expiresAt !== undefined && tokenRow.expiresAt !== null
    && tokenRow.expiresAt.getTime() - EXPIRY_BUFFER_MS <= Date.now();

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
    connectionFields: platform?.connectionFields,
    oauthProvider:    platform?.oauthProvider ?? null,
    oauthConnected:   tokenRow !== null && !tokenExpired,
    oauthExpired:     tokenRow !== null && tokenExpired,
    tier:             platform?.tier ?? null,
    partnerSignup:    platform?.partnerSignup ?? null,
  };
  return { ...base, readinessScore: computeReadinessScore(base).score };
}
