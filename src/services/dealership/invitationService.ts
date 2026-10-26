import { assertAssignableRole, type AccessActor } from './accessSafety.js';
import { randomBytes } from 'node:crypto';
import type { DealerAccessRole, Prisma, PrismaClient } from '@prisma/client';
import { hashSessionToken } from '../auth/sessionService.js';
import { hashPassword, verifyPassword } from '../auth/passwordService.js';
import { HttpError } from './httpError.js';
import { accountRoleForAccess } from './permissions.js';
import { refreshOnboarding } from './onboardingService.js';
import { recordDealershipActivity } from './activityService.js';

export const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

type Db = PrismaClient | Prisma.TransactionClient;

export function createInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export function signInBaseUrl(): string {
  const base = (process.env['APP_BASE_URL'] ?? 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/#/login`;
}

export function setupUrlForToken(token: string): string {
  const base = (process.env['APP_BASE_URL'] ?? 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/#/invite/${token}`;
}

export async function createInvitation(
  db: Db,
  input: {
    dealershipId: string;
    email: string;
    accessRole: DealerAccessRole;
    invitedBy: AccessActor;
  },
): Promise<{ inviteId: string; email: string; expiresAt: string; setupUrl: string; deliveryStatus: string }> {
  assertAssignableRole(input.invitedBy, input.accessRole);
  const email = input.email.trim().toLowerCase();
  if (input.accessRole === 'INTERNAL_SUPPORT' && !input.invitedBy.id) {
    throw new HttpError(400, 'Internal support assignment requires an actor');
  }

  await db.operatorInvitation.updateMany({
    where: {
      dealershipId: input.dealershipId,
      email,
      acceptedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date(), deliveryStatus: 'REVOKED' },
  });

  const token = createInviteToken();
  const invite = await db.operatorInvitation.create({
    data: {
      dealershipId: input.dealershipId,
      email,
      accessRole: input.accessRole,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + INVITE_LIFETIME_MS),
      invitedBy: input.invitedBy.id,
      deliveryStatus: 'PENDING',
    },
  });

  await recordDealershipActivity(db, {
    dealershipId: input.dealershipId,
    actorId: input.invitedBy.id,
    actorEmail: input.invitedBy.email,
    action: 'INVITE_CREATED',
    detail: { email, accessRole: input.accessRole },
  });
  await refreshOnboarding(db, input.dealershipId, input.invitedBy.id);

  return {
    inviteId: invite.id,
    email,
    expiresAt: invite.expiresAt.toISOString(),
    setupUrl: setupUrlForToken(token),
    deliveryStatus: invite.deliveryStatus,
  };
}

export async function resendInvitation(
  db: Db,
  dealershipId: string,
  inviteId: string,
  actor: AccessActor,
): Promise<{ inviteId: string; email: string; expiresAt: string; setupUrl: string; deliveryStatus: string }> {
  const existing = await db.operatorInvitation.findFirst({
    where: { id: inviteId, dealershipId },
  });
  if (!existing) throw new HttpError(404, 'Invitation not found');
  if (existing.acceptedAt) throw new HttpError(409, 'Invitation already accepted');

  await db.operatorInvitation.update({
    where: { id: inviteId },
    data: { revokedAt: new Date(), deliveryStatus: 'REVOKED' },
  });
  return createInvitation(db, {
    dealershipId,
    email: existing.email,
    accessRole: existing.accessRole,
    invitedBy: actor,
  });
}

export async function revokeInvitation(
  db: Db,
  dealershipId: string,
  inviteId: string,
  actor: AccessActor,
): Promise<void> {
  const existing = await db.operatorInvitation.findFirst({
    where: { id: inviteId, dealershipId },
  });
  if (!existing) throw new HttpError(404, 'Invitation not found');
  if (existing.acceptedAt) throw new HttpError(409, 'Invitation already accepted');

  await db.operatorInvitation.update({
    where: { id: inviteId },
    data: { revokedAt: new Date(), deliveryStatus: 'REVOKED' },
  });
  await recordDealershipActivity(db, {
    dealershipId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'INVITE_REVOKED',
    detail: { email: existing.email },
  });
}

export async function previewInvitation(db: Db, token: string) {
  const invite = await loadUsableInvite(db, token);
  const dealer = await db.dealershipProfile.findUnique({
    where: { id: invite.dealershipId },
    select: { id: true, legalName: true },
  });
  return {
    email: invite.email,
    accessRole: invite.accessRole,
    dealershipId: invite.dealershipId,
    dealershipName: dealer?.legalName ?? null,
    expiresAt: invite.expiresAt.toISOString(),
    signInUrl: signInBaseUrl(),
  };
}

export async function acceptInvitation(
  db: Db,
  token: string,
  password: string,
  name?: string,
): Promise<{ accountId: string; dealershipId: string; email: string }> {
  const invite = await loadUsableInvite(db, token);
  const existing = await db.operatorAccount.findUnique({ where: { email: invite.email } });

  let accountId: string;
  if (existing) {
    const matches = await verifyPassword(existing.passwordHash, password);
    if (!matches) throw new HttpError(401, 'Existing account password is required to accept this invitation');
    await db.operatorDealerAccess.upsert({
      where: {
        operatorAccountId_dealershipId: {
          operatorAccountId: existing.id,
          dealershipId: invite.dealershipId,
        },
      },
      create: {
        operatorAccountId: existing.id,
        dealershipId: invite.dealershipId,
        accessRole: invite.accessRole,
        grantedBy: invite.invitedBy,
      },
      update: { accessRole: invite.accessRole },
    });
    accountId = existing.id;
  } else {
    const created = await db.operatorAccount.create({
      data: {
        email: invite.email,
        passwordHash: await hashPassword(password),
        role: accountRoleForAccess(invite.accessRole),
        mustChangePassword: false,
        dealerAccess: {
          create: {
            dealershipId: invite.dealershipId,
            accessRole: invite.accessRole,
            grantedBy: invite.invitedBy,
          },
        },
      },
    });
    accountId = created.id;
  }

  await db.operatorInvitation.update({
    where: { id: invite.id },
    data: {
      acceptedAt: new Date(),
      acceptedByAccountId: accountId,
      deliveryStatus: 'ACCEPTED',
    },
  });
  await recordDealershipActivity(db, {
    dealershipId: invite.dealershipId,
    actorId: accountId,
    actorEmail: invite.email,
    action: 'INVITE_ACCEPTED',
    detail: { accessRole: invite.accessRole, name: name ?? null },
  });
  await refreshOnboarding(db, invite.dealershipId, accountId);
  return { accountId, dealershipId: invite.dealershipId, email: invite.email };
}

async function loadUsableInvite(db: Db, token: string) {
  const invite = await db.operatorInvitation.findUnique({
    where: { tokenHash: hashSessionToken(token) },
  });
  if (!invite || invite.revokedAt) throw new HttpError(404, 'Invitation not found');
  if (invite.acceptedAt) throw new HttpError(409, 'Invitation already accepted');
  if (invite.expiresAt <= new Date()) {
    await db.operatorInvitation.update({
      where: { id: invite.id },
      data: { deliveryStatus: 'EXPIRED' },
    });
    throw new HttpError(410, 'Invitation expired');
  }
  return invite;
}
