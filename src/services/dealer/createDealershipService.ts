import type { BusinessCategory, Prisma, PrismaClient } from '@prisma/client';
import type { CreateDealershipBody } from '../../server/requestValidation.js';
import { upsertDefaultPlatformAccounts, upsertDefaultSyncPolicies } from '../publishing/syncPolicyService.js';

type CreateDealershipOptions = {
  createdByOperatorId?: string | null;
  // The operator ID to grant explicit dealership access to. Only set this when
  // the operator.id is a real OperatorAccount PK (not a dev bypass header value).
  // If null/undefined, no operatorAccess row is created.
  grantAccessToOperatorId?: string | null;
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
};

function cleanOptional(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeWebsite(value: string | undefined): string | null {
  const trimmed = cleanOptional(value);
  if (!trimmed) return null;
  return trimmed;
}

function toSummary(dealer: {
  id: string;
  legalName: string;
  dbaName: string | null;
  logoUrl: string | null;
  businessCategory: BusinessCategory;
  createdAt: Date;
}): CreatedDealershipSummary {
  return {
    id: dealer.id,
    legalName: dealer.legalName,
    dbaName: dealer.dbaName,
    logoUrl: dealer.logoUrl,
    businessCategory: dealer.businessCategory,
    createdAt: dealer.createdAt.toISOString(),
  };
}

export async function createDealership(
  prisma: PrismaClient,
  body: CreateDealershipBody,
  options: CreateDealershipOptions = {},
): Promise<CreateDealershipResult> {
  const legalName = body.legalName.trim();
  const dbaName = cleanOptional(body.dbaName);
  const dealerLicense = cleanOptional(body.dealerLicense);
  const websiteUrl = normalizeWebsite(body.websiteUrl);

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

  if (duplicate) {
    const err = new Error('A dealership with matching business details already exists');
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }

  const dealer = await prisma.dealershipProfile.create({
    data: {
      legalName,
      dbaName,
      businessCategory: body.businessCategory as BusinessCategory,
      dealerLicense,
      websiteUrl,
      rooftopAddress: {
        ...body.rooftopAddress,
        country: cleanOptional(body.rooftopAddress.country) ?? 'US',
      } as Prisma.InputJsonValue,
      primaryContact: {
        ...body.primaryContact,
        phone: cleanOptional(body.primaryContact.phone),
        role: cleanOptional(body.primaryContact.role),
      } as Prisma.InputJsonValue,
      inventorySize: body.inventorySize ?? null,
      desiredChannels: (body.desiredChannels ?? []) as unknown as Prisma.InputJsonValue,
      documents: body.documents && body.documents.length > 0
        ? body.documents as unknown as Prisma.InputJsonValue
        : undefined,
      operatorAccess: options.grantAccessToOperatorId
        ? {
            create: {
              operatorAccountId: options.grantAccessToOperatorId,
              grantedBy: options.grantAccessToOperatorId,
            },
          }
        : undefined,
    },
    select: {
      id: true,
      legalName: true,
      dbaName: true,
      logoUrl: true,
      businessCategory: true,
      createdAt: true,
    },
  });

  await upsertDefaultSyncPolicies(prisma, dealer.id);
  await upsertDefaultPlatformAccounts(prisma, dealer.id);

  return { dealer: toSummary(dealer), duplicate: false };
}
