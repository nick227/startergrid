import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { mockDealership } from '../fixtures/dealership.fixture.js';
import { mockVehicles } from '../fixtures/vehicles.fixture.js';

async function main() {
  const dealership = await prisma.dealershipProfile.create({
    data: {
      legalName: mockDealership.legalName,
      dbaName: mockDealership.dbaName,
      dealerLicense: mockDealership.dealerLicense,
      rooftopAddress: mockDealership.rooftopAddress,
      websiteUrl: mockDealership.websiteUrl,
      primaryContact: mockDealership.primaryContact,
      inventorySize: mockDealership.inventorySize,
      desiredChannels: mockDealership.desiredChannels,
      documents: mockDealership.documents != null ? (mockDealership.documents as unknown as Prisma.InputJsonValue) : undefined,
      vehicles: {
        create: mockVehicles.map((vehicle) => ({
          vin: vehicle.vin!,
          stockNumber: vehicle.stockNumber,
          year: vehicle.year!,
          make: vehicle.make!,
          model: vehicle.model!,
          trim: vehicle.trim,
          mileage: vehicle.mileage!,
          priceCents: vehicle.priceCents!,
          condition: vehicle.condition!,
          exteriorColor: vehicle.exteriorColor!,
          interiorColor: vehicle.interiorColor,
          bodyStyle: vehicle.bodyStyle,
          drivetrain: vehicle.drivetrain,
          fuelType: vehicle.fuelType,
          transmission: vehicle.transmission,
          options: vehicle.options as unknown as Prisma.InputJsonValue,
          starCore: vehicle.starCore as unknown as Prisma.InputJsonValue,
          media: { create: vehicle.media?.map(m => ({ url: m.url!, kind: m.kind, sortOrder: m.sortOrder ?? 0, width: m.width, height: m.height, mimeType: m.mimeType })) }
        }))
      }
    },
    include: { vehicles: true }
  });

  const platforms = await prisma.platformProfile.findMany();
  for (const platform of platforms) {
    await prisma.platformApplication.upsert({
      where: { dealershipId_platformId: { dealershipId: dealership.id, platformId: platform.id } },
      update: { status: 'READY_TO_SUBMIT', nextAction: 'Generate authorization packet and mock submission.' },
      create: {
        dealershipId: dealership.id,
        platformId: platform.id,
        status: 'READY_TO_SUBMIT',
        referralCode: `REF-${platform.slug.toUpperCase()}-${dealership.id.slice(-6)}`,
        nextAction: 'Generate authorization packet and mock submission.'
      }
    });
  }

  console.log(`Created fake dealership ${dealership.legalName} with ${platforms.length} platform applications.`);
}

main().finally(async () => prisma.$disconnect());
