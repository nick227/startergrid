import type { BusinessCategory, Prisma, PrismaClient } from '@prisma/client';
import { OperatorRole } from '@prisma/client';
import type { CreateDealershipBody } from '../../server/requestValidation.js';
import { upsertDefaultPlatformAccounts, upsertDefaultSyncPolicies } from '../publishing/syncPolicyService.js';
import { hashPassword } from '../auth/passwordService.js';
import { seedOnboardingSteps } from '../dealership/onboardingSteps.js';
import { refreshOnboarding } from '../dealership/onboardingService.js';
import { createInvitation } from '../dealership/invitationService.js';
import { assignInternalOwner } from '../dealership/peopleAccessService.js';
import { HttpError } from '../dealership/httpError.js';
import { recordDealershipActivity } from '../dealership/activityService.js';

type CreateDealershipOptions = {
  createdByOperatorId?: string | null;
  grantAccessToOperatorId?: string | null;
  internalOwnerId?: string | null;
  inviteOwnerEmail?: string | null;
  actorEmail?: string | null;
};

export type CreatedDealershipSummary = {
  id: string;
  legalName: string;
  dbaName: string | null;
  logoUrl: string | null;
  businessCategory: string;
  createdAt: string;
};

export type CreateDealershipResult = {
  dealer: CreatedDealershipSummary;
  duplicate: false;
  createdOperatorAccountId?: string;
  invite?: { inviteId: string; setupUrl: string; email: string; expiresAt: string };
};

function cleanOptional(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createDealership(
  prisma: PrismaClient,
  body: CreateDealershipBody,
  options: CreateDealershipOptions = {},
): Promise<CreateDealershipResult> {
  const legalName = body.legalName.trim();
  const dbaName = cleanOptional(body.dbaName);
  const dealerLicense = cleanOptional(body.dealerLicense);
  const websiteUrl = cleanOptional(body.websiteUrl);
  const contactEmail = body.primaryContact.email.trim().toLowerCase();

  const duplicate = await prisma.dealershipProfile.findFirst({
    where: {
      OR: [
        { legalName },
        ...(dealerLicense ? [{ dealerLicense }] : []),
        ...(websiteUrl ? [{ websiteUrl }] : []),
      ],
    },
    select: { id: true },
  });
  if (duplicate) throw new HttpError(409, 'A dealership with matching business details already exists');

  let passwordHash: string | null = null;
  if (body.password) {
    const existingAccount = await prisma.operatorAccount.findUnique({ where: { email: contactEmail } });
    if (existingAccount) throw new HttpError(409, 'An account with this email already exists');
    passwordHash = await hashPassword(body.password);
  }

  const created = await prisma.$transaction(async (tx) => {
    let createdOperatorAccountId: string | undefined;
    if (passwordHash) {
      const account = await tx.operatorAccount.create({
        data: {
          email: contactEmail,
          passwordHash,
          role: OperatorRole.DEALER_OWNER,
        },
      });
      createdOperatorAccountId = account.id;
    }

    const dealer = await tx.dealershipProfile.create({
      data: {
        legalName,
        dbaName,
        businessCategory: body.businessCategory as BusinessCategory,
        dealerLicense,
        websiteUrl,
        primaryContactEmail: contactEmail,
        lifecycleStatus: 'SETTING_UP',
        internalOwnerId: options.internalOwnerId ?? options.createdByOperatorId ?? null,
        rooftopAddress: {
          ...(body.rooftopAddress ?? {}),
          country: cleanOptional(body.rooftopAddress?.country) ?? 'US',
        } as Prisma.InputJsonValue,
        primaryContact: {
          ...body.primaryContact,
          name: cleanOptional(body.primaryContact.name),
          email: contactEmail,
          phone: cleanOptional(body.primaryContact.phone),
          role: cleanOptional(body.primaryContact.role),
        } as Prisma.InputJsonValue,
        inventorySize: body.inventorySize ?? null,
        desiredChannels: (body.desiredChannels ?? []) as unknown as Prisma.InputJsonValue,
        documents: body.documents && body.documents.length > 0
          ? body.documents as unknown as Prisma.InputJsonValue
          : undefined,
      },
      select: { id: true, legalName: true, dbaName: true, logoUrl: true, businessCategory: true, createdAt: true },
    });

    if (createdOperatorAccountId) {
      await tx.operatorDealerAccess.create({
        data: {
          operatorAccountId: createdOperatorAccountId,
          dealershipId: dealer.id,
          accessRole: 'DEALER_OWNER',
          grantedBy: options.createdByOperatorId ?? createdOperatorAccountId,
        },
      });
    }

    const staffId = options.grantAccessToOperatorId;
    if (staffId && staffId !== createdOperatorAccountId) {
      await tx.operatorDealerAccess.create({
        data: {
          operatorAccountId: staffId,
          dealershipId: dealer.id,
          accessRole: 'INTERNAL_SUPPORT',
          grantedBy: staffId,
        },
      });
    }

    const actorId = options.createdByOperatorId ?? createdOperatorAccountId ?? null;
    await seedOnboardingSteps(tx, dealer.id, actorId);

    if (options.internalOwnerId && actorId) {
      await assignInternalOwner(tx, dealer.id, options.internalOwnerId, {
        id: actorId,
        email: options.actorEmail ?? 'system',
      });
    }

    if (actorId) {
      await recordDealershipActivity(tx, {
        dealershipId: dealer.id,
        actorId,
        actorEmail: options.actorEmail ?? contactEmail,
        action: 'DEALERSHIP_CREATED',
        detail: { legalName, businessCategory: body.businessCategory },
      });
    }

    // The owner invitation is created with the dealership so a failure leaves neither behind.
    let invite: (CreateDealershipResult['invite'] & { inviteId: string }) | undefined;
    if (options.inviteOwnerEmail && actorId) {
      const createdInvite = await createInvitation(tx, {
        dealershipId: dealer.id,
        email: options.inviteOwnerEmail,
        accessRole: 'DEALER_OWNER',
        invitedBy: { id: actorId, email: options.actorEmail ?? options.inviteOwnerEmail },
      });
      invite = {
        inviteId: createdInvite.inviteId,
        setupUrl: createdInvite.setupUrl,
        email: createdInvite.email,
        expiresAt: createdInvite.expiresAt,
      };
    } else {
      await refreshOnboarding(tx, dealer.id, actorId);
    }
    return { dealer, createdOperatorAccountId, invite };
  });

  // Default channel accounts and sync policies are idempotent distribution setup.
  await upsertDefaultSyncPolicies(prisma, created.dealer.id);
  await upsertDefaultPlatformAccounts(prisma, created.dealer.id);
  const invite = created.invite;

  return {
    dealer: {
      id: created.dealer.id,
      legalName: created.dealer.legalName,
      dbaName: created.dealer.dbaName,
      logoUrl: created.dealer.logoUrl,
      businessCategory: created.dealer.businessCategory,
      createdAt: created.dealer.createdAt.toISOString(),
    },
    duplicate: false,
    createdOperatorAccountId: created.createdOperatorAccountId,
    invite,
  };
}
