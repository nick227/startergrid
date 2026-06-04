import type { DealershipPayload, PlatformProfileSeed, PlatformValidationReport, VehiclePayload } from '../lib/types.js';
import { validateMediaRules, validateRequiredPaths } from './pathValidator.js';
import { generateMockOutputNames } from '../services/outputGenerator.js';

export function validatePlatformProfile(
  platform: PlatformProfileSeed,
  dealership: DealershipPayload,
  vehicles: VehiclePayload[]
): PlatformValidationReport {
  const issues = [
    ...validateRequiredPaths(dealership, platform.requiredDealershipFields, 'Dealership profile'),
    ...vehicles.flatMap((vehicle) => validateRequiredPaths(vehicle, platform.requiredVehicleFields, `Vehicle ${vehicle.stockNumber}`)),
    ...validateMediaRules(vehicles, platform.requiredMediaRules)
  ];

  const status = issues.some((issue) => issue.severity === 'FAIL') ? 'FAIL' : issues.length ? 'WARN' : 'PASS';

  return {
    platformSlug: platform.slug,
    platformName: platform.name,
    status,
    issues,
    generatedOutputs: generateMockOutputNames(platform)
  };
}
