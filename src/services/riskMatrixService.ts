import { platformProfiles } from '../data/platformProfiles.js';
import { dealershipMissingCriticalFields } from '../fixtures/negativeDealership.fixture.js';
import { vehicleMissingCriticalFields } from '../fixtures/negativeVehicles.fixture.js';
import { mockDealership } from '../fixtures/dealership.fixture.js';
import { mockVehicles } from '../fixtures/vehicles.fixture.js';
import { stalePlatformProfiles } from '../fixtures/stalePlatformProfiles.fixture.js';
import type {
  DealershipPayload,
  PlatformProfileSeed,
  ReadinessColor,
  ValidationScenarioKind,
  ValidationScenarioResult,
  VehiclePayload
} from '../lib/types.js';
import { validatePlatformReadiness, validatePlatformReadinessStrict } from '../validators/platformReadinessValidator.js';

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
  expected: ReadinessColor[];
  strict?: boolean;
}): ValidationScenarioResult[] {
  return options.platforms.map((platform) => {
    const report = options.strict
      ? validatePlatformReadinessStrict(platform, options.dealership, options.vehicles)
      : validatePlatformReadiness(platform, options.dealership, options.vehicles);
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
  return [
    ...runRiskScenario({
      scenario: 'BASELINE',
      platforms: platformProfiles,
      dealership: mockDealership,
      vehicles: mockVehicles,
      expected: ['GREEN']
    }),
    ...runRiskScenario({
      scenario: 'STRICT_PROFILE',
      platforms: platformProfiles,
      dealership: mockDealership,
      vehicles: mockVehicles,
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
