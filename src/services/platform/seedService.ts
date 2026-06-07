import { createHash } from 'node:crypto';
import type { PrismaClient, Prisma } from '@prisma/client';
import { platformProfiles } from '../../data/platformProfiles.js';
import { pristineApiDealership, pristineApiVehicles } from '../../fixtures/scenarios/pristineApiValidation.fixture.js';
import { trailersDealerPayload, trailersDealerVehicles } from '../../fixtures/scenarios/trailersDealer.fixture.js';

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function seedPlatformProfileVersions(prisma: PrismaClient): Promise<void> {
  for (const profile of platformProfiles) {
    const serialized = JSON.stringify(profile);
    const checksum = sha256(serialized);

    const existing = await prisma.platformProfileVersion.findFirst({
      where: { platformSlug: profile.slug, schemaVersion: profile.schemaVersion }
    });

    if (existing) {
      await prisma.platformProfileVersion.update({
        where: { id: existing.id },
        data: {
          profileJson: profile as unknown as Prisma.InputJsonValue,
          checksum
        }
      });
    } else {
      await prisma.platformProfileVersion.create({
        data: {
          platformSlug: profile.slug,
          schemaVersion: profile.schemaVersion,
          profileJson: profile as unknown as Prisma.InputJsonValue,
          checksum
        }
      });
    }

    console.log(`seeded ${profile.slug} @ ${profile.schemaVersion}`);
  }
}

export async function seedPristineDealer(prisma: PrismaClient): Promise<string> {
  const existing = await prisma.dealershipProfile.findFirst({
    where: { legalName: pristineApiDealership.legalName }
  });
  if (existing) return existing.id;

  const dealership = await prisma.dealershipProfile.create({
    data: {
      legalName: pristineApiDealership.legalName,
      dbaName: pristineApiDealership.dbaName,
      dealerLicense: pristineApiDealership.dealerLicense,
      rooftopAddress: pristineApiDealership.rooftopAddress as unknown as Prisma.InputJsonValue,
      websiteUrl: pristineApiDealership.websiteUrl,
      primaryContact: pristineApiDealership.primaryContact as unknown as Prisma.InputJsonValue,
      inventorySize: pristineApiDealership.inventorySize,
      desiredChannels: pristineApiDealership.desiredChannels as unknown as Prisma.InputJsonValue,
      documents: pristineApiDealership.documents != null
        ? (pristineApiDealership.documents as unknown as Prisma.InputJsonValue)
        : undefined,
      vehicles: {
        create: pristineApiVehicles.map(v => ({
          vin: v.vin!,
          stockNumber: v.stockNumber,
          year: v.year!,
          make: v.make!,
          model: v.model!,
          trim: v.trim,
          mileage: v.mileage!,
          priceCents: v.priceCents!,
          condition: v.condition!,
          exteriorColor: v.exteriorColor!,
          interiorColor: v.interiorColor,
          bodyStyle: v.bodyStyle,
          drivetrain: v.drivetrain,
          fuelType: v.fuelType,
          transmission: v.transmission,
          options: v.options as unknown as Prisma.InputJsonValue,
          starCore: v.starCore as unknown as Prisma.InputJsonValue,
          media: {
            create: v.media?.map(m => ({
              url: m.url!,
              kind: m.kind,
              sortOrder: m.sortOrder ?? 0,
              width: m.width,
              height: m.height,
              mimeType: m.mimeType
            })) ?? []
          }
        }))
      }
    }
  });

  console.log(`seeded pristine dealer: ${dealership.legalName} (${dealership.id})`);
  return dealership.id;
}

export async function seedTrailersDealer(prisma: PrismaClient): Promise<string> {
  const existing = await prisma.dealershipProfile.findFirst({
    where: { legalName: trailersDealerPayload.legalName },
  });
  if (existing) return existing.id;

  const dealership = await prisma.dealershipProfile.create({
    data: {
      legalName: trailersDealerPayload.legalName,
      dbaName: trailersDealerPayload.dbaName,
      dealerLicense: trailersDealerPayload.dealerLicense,
      businessCategory: 'TRAILERS_POWERSPORTS_RV',
      rooftopAddress: trailersDealerPayload.rooftopAddress as unknown as Prisma.InputJsonValue,
      websiteUrl: trailersDealerPayload.websiteUrl,
      primaryContact: trailersDealerPayload.primaryContact as unknown as Prisma.InputJsonValue,
      inventorySize: trailersDealerPayload.inventorySize,
      desiredChannels: trailersDealerPayload.desiredChannels as unknown as Prisma.InputJsonValue,
      vehicles: {
        create: trailersDealerVehicles.map(v => ({
          vin: v.vin!,
          stockNumber: v.stockNumber,
          year: v.year!,
          make: v.make!,
          model: v.model!,
          trim: v.trim,
          mileage: v.mileage!,
          priceCents: v.priceCents!,
          condition: v.condition!,
          exteriorColor: v.exteriorColor!,
          interiorColor: v.interiorColor,
          bodyStyle: v.bodyStyle,
          drivetrain: v.drivetrain,
          fuelType: v.fuelType,
          transmission: v.transmission,
          options: v.options as unknown as Prisma.InputJsonValue,
          starCore: v.starCore as unknown as Prisma.InputJsonValue,
          categoryPayload: v.categoryPayload != null
            ? (v.categoryPayload as unknown as Prisma.InputJsonValue)
            : undefined,
          media: {
            create: v.media?.map(m => ({
              url: m.url!,
              kind: m.kind,
              sortOrder: m.sortOrder ?? 0,
              width: m.width,
              height: m.height,
              mimeType: m.mimeType,
            })) ?? [],
          },
        })),
      },
    },
  });

  console.log(`seeded trailers dealer: ${dealership.legalName} (${dealership.id})`);
  return dealership.id;
}
