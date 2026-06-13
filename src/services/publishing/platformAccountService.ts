import type { PrismaClient, Prisma, PlatformAccountState } from '@prisma/client';
import { platformProfiles } from '../../data/platformProfiles.js';
import { platformsForCategory, isPlatformAllowedForCategory } from '../../data/platformCategoryMap.js';
import type { PlatformProfileSeed, ConnectionField } from '../../lib/types.js';

type ProfileConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export const VALID_ACCOUNT_STATES: PlatformAccountState[] = [
  'ACCOUNT_NEEDED', 'CREDENTIALS_NEEDED', 'READY', 'FAILED', 'ACTIVE', 'BLOCKED', 'PARTNER_REQUIRED', 'SUSPENDED', 'PENDING_REVIEW', 'NEEDS_INFO', 'WAITING_ON_PARTNER'
];

export const NEXT_ACTION_OWNERS = ['DEALER', 'PARTNER', 'PLATFORM', 'SYSTEM', 'SUPPORT'] as const;

export const STATE_BASE_SCORE: Record<PlatformAccountState, number> = {
  ACTIVE: 60,
  READY: 60,
  PENDING_REVIEW: 40,
  CREDENTIALS_NEEDED: 25,
  PARTNER_REQUIRED: 15,
  ACCOUNT_NEEDED: 10,
  FAILED: 0,
  BLOCKED: 0,
  SUSPENDED: 0,
  NEEDS_INFO: 0,
  WAITING_ON_PARTNER: 0,
};

export type ReadinessScore = {
  score: number;
  issues: string[];
};

export type PlatformAccountDetail = {
  id: string;
  platformSlug: string;
  platformName: string;
  integrationClass: string;
  state: PlatformAccountState;
  accountId: string | null;
  platformRepName: string | null;
  platformRepEmail: string | null;
  membershipStatus: string | null;
  nextAction: string | null;
  nextActionOwner: string | null;
  notes: string | null;
  connectionConfig: Record<string, unknown> | null;
  lastChecked: string | null;
  createdAt: string;
  updatedAt: string;
  connectionFields?: ConnectionField[];
  oauthProvider: string | null;
  oauthConnected: boolean;
  oauthExpired: boolean;
  tier: number | null;
  partnerSignup: any | null;
  socialPosting: boolean;
  catalogSync: boolean;
  marketplaceListing: boolean;
  partnerFeed: boolean;
  leadSync: boolean;
  connectionType: string | null;
  integrationMaturity: string | null;
  liveValidationNote: string | null;
  integrationUrls: any | null;
  requirementsConfidence: string | null;
  sourceNote: string | null;
  requiredDealershipFields: string[];
  requiredVehicleFields: string[];
  profileConfidence: string | null;
  readinessScore: number;
  lastValidationStatus: string | null;
  lastValidationNote: string | null;
  lastValidatedAt: string | null;
  highestConfirmedLevel: string | null;
};

export type AccountUpdatePayload = {
  state?: PlatformAccountState;
  notes?: string | null;
  accountId?: string | null;
  platformRepName?: string | null;
  platformRepEmail?: string | null;
  membershipStatus?: string | null;
  nextAction?: string | null;
  nextActionOwner?: string | null;
  connectionConfig?: Record<string, unknown>;
};

export function needsSetupAccountState(s: string) {
  return s === 'ACCOUNT_NEEDED' || s === 'CREDENTIALS_NEEDED';
}

export function isBlockingAccountState(s: string) {
  return s === 'FAILED' || s === 'BLOCKED' || s === 'SUSPENDED';
}

export function isPartnerRequiredAccountState(s: string) {
  return s === 'PARTNER_REQUIRED';
}

export function validateAccountUpdatePayload(payload: AccountUpdatePayload): string | null {
  if (payload.state && !VALID_ACCOUNT_STATES.includes(payload.state)) {
    return `Invalid state: ${payload.state}`;
  }
  if (payload.nextActionOwner && payload.nextActionOwner !== '' && !NEXT_ACTION_OWNERS.includes(payload.nextActionOwner as any)) {
    return `Invalid nextActionOwner: ${payload.nextActionOwner}`;
  }
  return null;
}

export function profilesForCategory(category: string | null | undefined): PlatformProfileSeed[] {
  return platformsForCategory(category);
}

async function ensureAccountRows(prisma: PrismaClient, dealershipId: string, profiles: PlatformProfileSeed[]) {
  const existing = await prisma.platformAccount.findMany({
    where: { dealershipId },
    select: { platformSlug: true }
  });
  const existingSlugs = new Set(existing.map(r => r.platformSlug));

  const missing = profiles.filter(p => !existingSlugs.has(p.slug));
  if (missing.length === 0) return;

  await prisma.platformAccount.createMany({
    data: missing.map(p => ({
      dealershipId,
      platformSlug: p.slug,
      state: 'ACCOUNT_NEEDED' as PlatformAccountState,
      notes: null,
      connectionConfig: {},
      lastChecked: new Date(),
    })),
    skipDuplicates: true,
  });
}

export function computeReadinessScore(
  account: Pick<PlatformAccountDetail, 'state' | 'accountId' | 'platformRepName' | 'platformRepEmail' | 'nextAction' | 'membershipStatus'>
): ReadinessScore {
  const issues: string[] = [];
  let score = STATE_BASE_SCORE[account.state] || 0;

  if (account.state === 'FAILED' || account.state === 'BLOCKED' || account.state === 'SUSPENDED') {
    issues.push(`Account state is ${account.state}`);
  } else if (score < 40) {
    issues.push('Account setup not started');
  }

  if (account.accountId) {
    score += 10;
  } else {
    issues.push('Missing Account ID');
  }

  if (account.platformRepName || account.platformRepEmail) {
    score += 10;
  } else {
    issues.push('Missing Partner Contact Info');
  }

  if (account.membershipStatus) {
    score += 10;
  } else {
    issues.push('Missing Membership Status');
  }

  const isHardBlocked = account.state === 'FAILED' || account.state === 'BLOCKED' || account.state === 'SUSPENDED';
  if (account.nextAction) {
    score += 10;
  } else if (!isHardBlocked) {
    issues.push('Missing Next Action');
  }

  return { score: Math.min(100, score), issues };
}

export async function listPlatformAccounts(
  prisma: PrismaClient,
  dealershipId: string
): Promise<{ accounts: PlatformAccountDetail[]; summary: AccountStateSummary }> {
  const dealer = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: { businessCategory: true },
  });
  // Fail closed: an unknown dealer (or one with no category) gets zero platforms,
  // never an AUTOMOTIVE default that would leak car platforms into the account list.
  const profiles = profilesForCategory(dealer?.businessCategory ?? null);

  await ensureAccountRows(prisma, dealershipId, profiles);

  const [rows, tokenRows, secretRows] = await Promise.all([
    prisma.platformAccount.findMany({ where: { dealershipId } }),
    prisma.platformOAuthToken.findMany({ where: { dealershipId }, select: { provider: true, expiresAt: true } }),
    (prisma as any).platformSecret.findMany({ where: { dealershipId } }),
  ]);
  const secretsBySlug = new Map<string, any[]>();
  for (const s of secretRows as any[]) {
    if (!secretsBySlug.has(s.platformSlug)) secretsBySlug.set(s.platformSlug, []);
    secretsBySlug.get(s.platformSlug)!.push(s);
  }
  const bySlug = new Map(rows.map(r => [r.platformSlug, r]));
  // 60 s buffer: treat tokens expiring within the next minute as already expired
  const EXPIRY_BUFFER_MS = 60_000;
  const isExpired = (exp: Date | null) => exp !== null && exp.getTime() - EXPIRY_BUFFER_MS <= Date.now();
  const liveProviders = new Set(tokenRows.filter(t => !isExpired(t.expiresAt)).map(t => t.provider));
  const anyProviders  = new Set(tokenRows.map(t => t.provider));

  const accounts: PlatformAccountDetail[] = profiles.map(p => {
    const r = bySlug.get(p.slug);
      let connectionConfig = (r as any)?.connectionConfig as Record<string, unknown> | null ?? null;
      const secrets = secretsBySlug.get(p.slug);
      if (secrets && secrets.length > 0) {
        connectionConfig = connectionConfig ? { ...connectionConfig } : {};
        for (const s of secrets) {
          connectionConfig[s.fieldKey] = s.maskedValue;
        }
      }

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
        connectionConfig,
        lastChecked:       r?.lastChecked?.toISOString() ?? null,
        createdAt:         r?.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt:         r?.updatedAt?.toISOString() ?? new Date().toISOString(),
        connectionFields:  p.connectionFields,
        oauthProvider:     p.oauthProvider ?? null,
        oauthConnected:    p.oauthProvider ? liveProviders.has(p.oauthProvider) : false,
        oauthExpired:      p.oauthProvider
          ? anyProviders.has(p.oauthProvider) && !liveProviders.has(p.oauthProvider)
          : false,
        tier:              p.tier ?? null,
        partnerSignup:     p.partnerSignup ?? null,
        socialPosting:     p.socialPosting ?? false,
        catalogSync:       p.catalogSync ?? false,
        marketplaceListing: p.marketplaceListing ?? false,
        partnerFeed:       p.partnerFeed ?? false,
        leadSync:          p.leadSync ?? false,
        connectionType:    p.connectionType ?? null,
        integrationMaturity: p.integrationMaturity ?? null,
        liveValidationNote: p.liveValidationNote ?? null,
        integrationUrls:   p.integrationUrls ?? null,
        requirementsConfidence: p.requirementsConfidence ?? null,
        sourceNote:        p.sourceNote ?? null,
        requiredDealershipFields: p.requiredDealershipFields ?? [],
        requiredVehicleFields: p.requiredVehicleFields ?? [],
        profileConfidence: p.profileConfidence ?? null,
        lastValidationStatus: (r as any)?.lastValidationStatus ?? null,
        lastValidationNote: (r as any)?.lastValidationNote ?? null,
        lastValidatedAt: (r as any)?.lastValidatedAt?.toISOString() ?? null,
        highestConfirmedLevel: (r as any)?.highestConfirmedLevel ?? null,
      };

      if (!r) return { ...base, readinessScore: computeReadinessScore(base).score };
      return { ...base, readinessScore: (r as any).readinessScore ?? computeReadinessScore(base).score };
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
  payload: AccountUpdatePayload,
  actor?: { id: string; email: string }
): Promise<PlatformAccountDetail> {
  const dealer = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: { businessCategory: true },
  });
  if (!isPlatformAllowedForCategory(platformSlug, dealer?.businessCategory ?? null)) {
    throw new Error(
      `Cross-category write rejected: platform '${platformSlug}' is not permitted for category '${dealer?.businessCategory ?? 'unknown'}'`,
    );
  }
  const current = await prisma.platformAccount.findUnique({
    where: { dealershipId_platformSlug: { dealershipId, platformSlug } }
  });

  let configToSave = payload.connectionConfig ? { ...payload.connectionConfig } : undefined;
  const updatedSecrets: string[] = [];

  const platform = platformProfiles.find(p => p.slug === platformSlug);
  if (configToSave && platform?.connectionFields) {
    for (const field of platform.connectionFields) {
      if (field.isSecret && configToSave[field.field] !== undefined) {
        const rawValue = String(configToSave[field.field]);
        delete configToSave[field.field]; // Never store raw in generic config

        if (rawValue && rawValue !== '********') {
          const { encryptSecret, maskSecretValue } = await import('../../lib/secrets.js');
          const encryptedValue = encryptSecret(rawValue);
          const maskedValue = maskSecretValue(rawValue);

          await (prisma as any).platformSecret.upsert({
            where: { dealershipId_platformSlug_fieldKey: { dealershipId, platformSlug, fieldKey: field.field } },
            update: { encryptedValue, maskedValue },
            create: { dealershipId, platformSlug, fieldKey: field.field, encryptedValue, maskedValue }
          });
          updatedSecrets.push(field.field);
        } else if (rawValue === '') {
          await (prisma as any).platformSecret.deleteMany({
            where: { dealershipId, platformSlug, fieldKey: field.field }
          });
          updatedSecrets.push(field.field);
        }
      }
    }
  }

  if (updatedSecrets.length > 0 && actor) {
    await prisma.adminAuditLog.create({
      data: {
        action: 'SECRET_UPDATED',
        actorId: actor.id,
        actorEmail: actor.email,
        detail: { platformSlug, fields: updatedSecrets } as any
      }
    });
  }

  const update: Prisma.PlatformAccountUpdateInput = { lastChecked: new Date() };
  if (payload.state !== undefined)            update.state = payload.state as PlatformAccountState;
  if (payload.notes !== undefined)            update.notes = payload.notes;
  if (payload.accountId !== undefined)        update.accountId = payload.accountId;
  if (payload.platformRepName !== undefined)  update.platformRepName = payload.platformRepName;
  if (payload.platformRepEmail !== undefined) update.platformRepEmail = payload.platformRepEmail;
  if (payload.membershipStatus !== undefined) update.membershipStatus = payload.membershipStatus;
  if (payload.nextAction !== undefined)       update.nextAction = payload.nextAction;
  if (payload.nextActionOwner !== undefined)  update.nextActionOwner = payload.nextActionOwner ?? null;
  if (configToSave !== undefined)             (update as any).connectionConfig = configToSave;

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
      connectionConfig: configToSave as any,
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

  const { accounts } = await listPlatformAccounts(prisma, dealershipId);
  const result = accounts.find(a => a.platformSlug === platformSlug);
  if (!result) throw new Error('Account missing after update');
  return result;
}

export async function recordValidationAttempt(
  prisma: PrismaClient,
  dealershipId: string,
  platformSlug: string,
  success: boolean,
  safeReason: string | undefined,
  code: string,
  durationMs: number,
  actor?: { id: string; email: string }
) {
  const update: Prisma.PlatformAccountUpdateInput = {
    lastChecked: new Date(),
    lastValidatedAt: new Date(),
    lastValidationStatus: code,
    lastValidationNote: safeReason || null,
  };

  if (success) {
    update.state = 'READY';
    update.highestConfirmedLevel = 'CONNECTION_TESTED';
  } else {
    update.state = 'FAILED';
  }

  const updated = await prisma.platformAccount.update({
    where: { dealershipId_platformSlug: { dealershipId, platformSlug } },
    data: update
  });

  if (actor) {
    await prisma.adminAuditLog.create({
      data: {
        action: 'PARTNER_CONNECTION_VALIDATED',
        actorId: actor.id,
        actorEmail: actor.email,
        detail: {
          platformSlug,
          success,
          code,
          safeReason,
          durationMs
        } as any
      }
    });
  }

  return updated;
}
