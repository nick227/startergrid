import { platformProfiles } from '../../data/platformProfiles.js';
import { dealershipMissingCriticalFields } from '../../fixtures/dealers/negativeDealership.fixture.js';
import { vehicleMissingCriticalFields } from '../../fixtures/vehicles/negativeVehicles.fixture.js';
import { mockDealership } from '../../fixtures/dealers/dealership.fixture.js';
import { mockVehicles } from '../../fixtures/vehicles/vehicles.fixture.js';
import { stalePlatformProfiles } from '../../fixtures/platforms/stalePlatformProfiles.fixture.js';
import { boatsDealerVehicles } from '../../fixtures/scenarios/boatsDealer.fixture.js';
import { trailersDealerVehicles } from '../../fixtures/scenarios/trailersDealer.fixture.js';
import type {
  DealershipPayload,
  PlatformProfileSeed,
  ReadinessColor,
  ValidationScenarioKind,
  ValidationScenarioResult,
  VehiclePayload
} from '../../lib/types.js';
import { validatePlatformReadiness, validatePlatformReadinessStrict } from '../../validators/platform/platformReadinessValidator.js';

export function expectationPassed(actual: ReadinessColor, expected: ReadinessColor[]) {
  return expected.includes(actual);
}

export function whyGreenOrNot(result: ReturnType<typeof validatePlatformReadiness>): string[] {
  if (!result.issues.length) return [`${result.platformName} has required dealership fields, vehicle fields, media rules, and fresh profile metadata.`];
  return result.issues.slice(0, 5).map((issue) => `${issue.severity}: ${issue.message}`);
}

export function runRiskScenario(options: {
  scenario: ValidationScenarioKind;
  platforms: PlatformProfileSeed[];
  dealership: DealershipPayload;
  vehicles: VehiclePayload[];
  vehiclesForPlatform?: (platform: PlatformProfileSeed) => VehiclePayload[];
  expected: ReadinessColor[];
  strict?: boolean;
}): ValidationScenarioResult[] {
  return options.platforms.map((platform) => {
    const vehicles = options.vehiclesForPlatform?.(platform) ?? options.vehicles;
    const report = options.strict
      ? validatePlatformReadinessStrict(platform, options.dealership, vehicles)
      : validatePlatformReadiness(platform, options.dealership, vehicles);
    return {
      scenario: options.scenario,
      platformSlug: platform.slug,
      platformName: platform.name,
      expected: options.expected,
      actual: report.readiness,
      passedExpectation: expectationPassed(report.readiness, options.expected),
      issues: report.issues,
      why: whyGreenOrNot(report)
    };
  });
}

export function runRiskMatrix(): ValidationScenarioResult[] {
  const ebooksVehicles: VehiclePayload[] = mockVehicles.map((v, idx) => ({
    ...v,
    // For non-automotive categories, `vin` represents the category identifier (ISBN for EBOOKS).
    vin: idx === 0 ? '1234567890' : '9781234567897',
  }));

  const baselineVehiclesForPlatform = (platform: PlatformProfileSeed): VehiclePayload[] => {
    if (platform.supportedCategories.length !== 1) return mockVehicles;
    const category = platform.supportedCategories[0];
    if (category === 'BOATS') return boatsDealerVehicles;
    if (category === 'EBOOKS') return ebooksVehicles;
    if (category === 'TRAILERS_POWERSPORTS_RV') return trailersDealerVehicles;
    return mockVehicles;
  };

  return [
    ...runRiskScenario({
      scenario: 'BASELINE',
      platforms: platformProfiles,
      dealership: mockDealership,
      vehicles: mockVehicles,
      vehiclesForPlatform: baselineVehiclesForPlatform,
      expected: ['GREEN']
    }),
    ...runRiskScenario({
      scenario: 'STRICT_PROFILE',
      platforms: platformProfiles,
      dealership: mockDealership,
      vehicles: mockVehicles,
      vehiclesForPlatform: baselineVehiclesForPlatform,
      expected: ['GREEN', 'YELLOW'],
      strict: true
    }),
    ...runRiskScenario({
      scenario: 'NEGATIVE_DEALERSHIP',
      platforms: platformProfiles,
      dealership: dealershipMissingCriticalFields,
      vehicles: mockVehicles,
      expected: ['RED']
    }),
    ...runRiskScenario({
      scenario: 'NEGATIVE_VEHICLE',
      platforms: platformProfiles,
      dealership: mockDealership,
      vehicles: vehicleMissingCriticalFields,
      expected: ['RED']
    }),
    ...runRiskScenario({
      scenario: 'STALE_PROFILE',
      platforms: stalePlatformProfiles,
      dealership: mockDealership,
      vehicles: mockVehicles,
      expected: ['YELLOW', 'RED']
    })
  ];
}
