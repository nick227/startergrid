import type { PrismaClient, DealershipProfile, Prisma } from '@prisma/client';
import type {
  DealershipAddress,
  DealershipContact,
  DealershipPayload,
  JsonRecord,
  PlatformReadinessReport,
  ReadinessColor
} from '../lib/types.js';
import { platformProfiles } from '../data/platformProfiles.js';
import { validatePlatformReadiness, validatePlatformReadinessStrict } from '../validators/platformReadinessValidator.js';
import { captureInventorySnapshot } from './inventorySnapshotService.js';

const VALIDATOR_VERSION = '4.0.0';

export type DbDealership = DealershipProfile;

export function dbDealershipToPayload(dealership: DbDealership): DealershipPayload {
  return {
    legalName: dealership.legalName,
    dbaName: dealership.dbaName,
    dealerLicense: dealership.dealerLicense,
    rooftopAddress: dealership.rooftopAddress as unknown as DealershipAddress,
    websiteUrl: dealership.websiteUrl,
    primaryContact: dealership.primaryContact as unknown as DealershipContact,
    inventorySize: dealership.inventorySize,
    desiredChannels: dealership.desiredChannels as unknown as string[],
    documents: dealership.documents != null ? (dealership.documents as unknown as JsonRecord) : null
  };
}

export async function runAndPersistReadiness(
  prisma: PrismaClient,
  dealershipId: string,
  options?: { environment?: 'MOCK' | 'SANDBOX' | 'PRODUCTION'; validatorVersion?: string }
): Promise<{
  runId: string;
  baselineResults: PlatformReadinessReport[];
  strictResults: PlatformReadinessReport[];
  overallStatus: ReadinessColor;
}> {
  const { snapshotId, vehicles } = await captureInventorySnapshot(prisma, dealershipId);

  const dbDealership = await prisma.dealershipProfile.findUniqueOrThrow({
    where: { id: dealershipId }
  });
  const dealership = dbDealershipToPayload(dbDealership);

  const baselineResults: PlatformReadinessReport[] = platformProfiles.map(p =>
    validatePlatformReadiness(p, dealership, vehicles)
  );
  const strictResults: PlatformReadinessReport[] = platformProfiles.map(p =>
    validatePlatformReadinessStrict(p, dealership, vehicles)
  );

  const overallStatus: ReadinessColor =
    baselineResults.some(r => r.readiness === 'RED') ? 'RED' :
    baselineResults.some(r => r.readiness === 'YELLOW') ? 'YELLOW' : 'GREEN';

  const greenCount = baselineResults.filter(r => r.readiness === 'GREEN').length;
  const yellowCount = baselineResults.filter(r => r.readiness === 'YELLOW').length;
  const redCount = baselineResults.filter(r => r.readiness === 'RED').length;

  const run = await prisma.readinessRun.create({
    data: {
      dealershipId,
      inventorySnapshotId: snapshotId,
      environment: options?.environment ?? 'MOCK',
      runMode: 'BOTH',
      overallStatus,
      greenCount,
      yellowCount,
      redCount,
      validatorVersion: options?.validatorVersion ?? VALIDATOR_VERSION,
      resultsJson: { baseline: baselineResults, strict: strictResults } as unknown as Prisma.InputJsonValue
    }
  });

  return { runId: run.id, baselineResults, strictResults, overallStatus };
}
