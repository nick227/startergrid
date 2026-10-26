import { assertAssignableRole, assertManageableAccount, type AccessActor } from './accessSafety.js';
import type { DealerAccessRole, Prisma, PrismaClient } from '@prisma/client';
import { generateSecurePassword, hashPassword } from '../auth/passwordService.js';
import { HttpError } from './httpError.js';
import { accountRoleForAccess } from './permissions.js';
import { refreshOnboarding } from './onboardingService.js';
import { recordDealershipActivity } from './activityService.js';
import { signInBaseUrl } from './invitationService.js';

type Db = PrismaClient | Prisma.TransactionClient;

export async function listPeople(db: Db, dealershipId: string) {
  const [accessRows, invites] = await Promise.all([
    db.operatorDealerAccess.findMany({
      where: { dealershipId },
      include: {
        operator: {
          select: {
            id: true, email: true, role: true, isActive: true,
            mustChangePassword: true, firstLoginAt: true, lastLoginAt: true, suspendedAt: true,
          },
        },
      },
      orderBy: { grantedAt: 'asc' },
    }),
    db.operatorInvitation.findMany({
      where: { dealershipId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    signInUrl: signInBaseUrl(),
    people: accessRows.map((row) => ({
      accountId: row.operator.id,
      email: row.operator.email,
      role: row.operator.role,
      accessRole: row.accessRole,
      isActive: row.operator.isActive,
      mustChangePassword: row.operator.mustChangePassword,
      firstLoginAt: row.operator.firstLoginAt?.toISOString() ?? null,
      lastLoginAt: row.operator.lastLoginAt?.toISOString() ?? null,
      activationStatus: activationStatus(row.operator),
    })),
    invitations: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      accessRole: invite.accessRole,
      deliveryStatus: invite.expiresAt <= new Date() && !invite.acceptedAt ? 'EXPIRED' : invite.deliveryStatus,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      invitedBy: invite.invitedBy,
    })),
  };
}

function activationStatus(account: {
  isActive: boolean;
  mustChangePassword: boolean;
  firstLoginAt: Date | null;
  lastLoginAt: Date | null;
}): 'ACTIVE' | 'INVITED' | 'MUST_CHANGE_PASSWORD' | 'SUSPENDED' | 'NOT_SIGNED_IN' {
  if (!account.isActive) return 'SUSPENDED';
  if (account.mustChangePassword) return 'MUST_CHANGE_PASSWORD';
  if (account.firstLoginAt || account.lastLoginAt) return 'ACTIVE';
  return 'NOT_SIGNED_IN';
}

export async function issueTemporaryLogin(
  db: Db,
  input: {
    dealershipId: string;
    email: string;
    accessRole: DealerAccessRole;
    actor: AccessActor;
  },
): Promise<{ accountId: string; email: string; accessRole: DealerAccessRole; temporaryPassword: string }> {
  assertAssignableRole(input.actor, input.accessRole);
  const email = input.email.trim().toLowerCase();
  const existing = await db.operatorAccount.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, 'This account already exists. Invite it using its current password, or use authorized account recovery.');
  const temporaryPassword = generateSecurePassword();
  const passwordHash = await hashPassword(temporaryPassword);
  let accountId: string;
  {
    const created = await db.operatorAccount.create({
      data: {
        email,
        passwordHash,
        role: accountRoleForAccess(input.accessRole),
        mustChangePassword: true,
        dealerAccess: {
          create: {
            dealershipId: input.dealershipId,
            accessRole: input.accessRole,
            grantedBy: input.actor.id,
          },
        },
      },
    });
    accountId = created.id;
  }

  await recordDealershipActivity(db, {
    dealershipId: input.dealershipId,
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    action: 'TEMPORARY_LOGIN_ISSUED',
    detail: { email, accessRole: input.accessRole },
  });
  await refreshOnboarding(db, input.dealershipId, input.actor.id);
  return { accountId, email, accessRole: input.accessRole, temporaryPassword };
}

export async function patchPerson(
  db: Db,
  input: {
    dealershipId: string;
    accountId: string;
    actor: AccessActor;
    accessRole?: DealerAccessRole;
    isActive?: boolean;
    resetPassword?: boolean;
  },
): Promise<{ person: Awaited<ReturnType<typeof listPeople>>['people'][number]; temporaryPassword?: string }> {
  const access = await db.operatorDealerAccess.findFirst({
    where: { dealershipId: input.dealershipId, operatorAccountId: input.accountId },
    include: { operator: true },
  });
  if (!access) throw new HttpError(404, 'Person not found on this dealership');
  assertAssignableRole(input.actor, input.accessRole);
  assertManageableAccount(input.actor, access.operator.role);
  if ((input.resetPassword || input.isActive !== undefined) && input.actor.role !== 'SUPER_ADMIN' && !input.actor.devHeader) {
    const memberships = await db.operatorDealerAccess.findMany({ where: { operatorAccountId: input.accountId }, select: { dealershipId: true } });
    if (memberships.some(m => m.dealershipId !== input.dealershipId))
      throw new HttpError(403, 'This account has access to other dealerships. Ask a site administrator to manage its login.');
  }
  if (input.accountId === input.actor.id && input.isActive === false) {
    throw new HttpError(400, 'You cannot suspend your own account');
  }

  let temporaryPassword: string | undefined;
  const data: Prisma.OperatorAccountUpdateInput = {};
  if (input.resetPassword) {
    temporaryPassword = generateSecurePassword();
    data.passwordHash = await hashPassword(temporaryPassword);
    data.mustChangePassword = true;
  }
  if (typeof input.isActive === 'boolean') {
    data.isActive = input.isActive;
    data.suspendedAt = input.isActive ? null : new Date();
  }
  if (Object.keys(data).length > 0) {
    await db.operatorAccount.update({ where: { id: input.accountId }, data });
  }
  if (input.resetPassword || input.isActive === false) {
    await db.operatorSession.updateMany({
      where: { operatorAccountId: input.accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  if (input.accessRole) {
    await db.operatorDealerAccess.update({
      where: { id: access.id },
      data: { accessRole: input.accessRole },
    });
  }

  await recordDealershipActivity(db, {
    dealershipId: input.dealershipId,
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    action: input.resetPassword ? 'PASSWORD_RESET' : input.isActive === false ? 'USER_SUSPENDED' : 'PERSON_UPDATED',
    detail: { email: access.operator.email, accessRole: input.accessRole ?? access.accessRole },
  });

  const listed = await listPeople(db, input.dealershipId);
  const person = listed.people.find((row) => row.accountId === input.accountId);
  if (!person) throw new HttpError(404, 'Person not found on this dealership');
  return { person, temporaryPassword };
}

export async function assignInternalOwner(
  db: Db,
  dealershipId: string,
  ownerId: string,
  actor: AccessActor,
): Promise<void> {
  const owner = await db.operatorAccount.findUnique({ where: { id: ownerId } });
  if (!owner) throw new HttpError(400, 'Internal owner account does not exist');
  if (!owner.isActive || !['SUPER_ADMIN', 'INTERNAL_SUPPORT', 'OPERATOR'].includes(owner.role))
    throw new HttpError(400, 'Select an active internal staff account.');

  await db.dealershipProfile.update({
    where: { id: dealershipId },
    data: { internalOwnerId: ownerId },
  });
  await db.operatorDealerAccess.upsert({
    where: {
      operatorAccountId_dealershipId: { operatorAccountId: ownerId, dealershipId },
    },
    create: {
      operatorAccountId: ownerId,
      dealershipId,
      accessRole: 'INTERNAL_SUPPORT',
      grantedBy: actor.id,
    },
    update: { accessRole: 'INTERNAL_SUPPORT' },
  });
  await recordDealershipActivity(db, {
    dealershipId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'INTERNAL_OWNER_ASSIGNED',
    detail: { internalOwnerId: ownerId },
  });
}
