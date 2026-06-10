import type { PlatformProfileSeed } from '../lib/types.js';
import { CORE_NON_VEHICLE_STUB_DEFINITIONS } from './nonVehiclePlatformStubDefinitions.js';
import { EXTENDED_NON_VEHICLE_STUB_DEFINITIONS } from './nonVehiclePlatformStubDefinitionsExtended.js';
import { PROPERTY_NON_VEHICLE_STUB_DEFINITIONS } from './nonVehiclePlatformStubDefinitionsProperty.js';
import {
  NON_VEHICLE_PLATFORM_CATEGORIES,
  type NonVehiclePlatformCategory,
  type NonVehicleStubInput,
} from './nonVehiclePlatformStubTypes.js';

export { NON_VEHICLE_PLATFORM_CATEGORIES, type NonVehiclePlatformCategory };

export const NON_VEHICLE_PLATFORM_COUNT = CORE_NON_VEHICLE_STUB_DEFINITIONS.length
  + EXTENDED_NON_VEHICLE_STUB_DEFINITIONS.length
  + PROPERTY_NON_VEHICLE_STUB_DEFINITIONS.length;

function buildStub(input: NonVehicleStubInput): PlatformProfileSeed {
  const integrationClass = input.integrationClass ?? 'ASSISTED';
  return {
    slug: input.slug,
    name: input.name,
    kind: 'MARKETPLACE',
    integrationClass,
    schemaVersion: `stub-2026.06-${input.categories[0]?.toLowerCase() ?? 'unknown'}-${input.slug}`,
    lastVerifiedAt: '2026-06-07T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: `Stub profile for ${input.name}. Category-specific identifiers stored in stockNumber/vin columns for validation.`,
    mockEndpoint: `mock://platform/${input.slug}`,
    integrationUrls: {
      partnerPortalUrl: input.partnerPortalUrl,
      developerDocsUrl: input.developerDocsUrl,
      notes: input.notes,
    },
    outputFormat: input.outputFormat,
    submissionMethods: integrationClass === 'FEEDABLE'
      ? ['FEED_URL', 'MOCK_API']
      : ['MANUAL_REP', 'MOCK_API'],
    sourceUrls: input.sourceUrls ?? [input.developerDocsUrl],
    requiredDealershipFields: [
      'legalName', 'rooftopAddress.city', 'rooftopAddress.state', 'primaryContact.email',
    ],
    supportedCategories: input.categories,
    requiredVehicleFields: input.requiredVehicleFields,
    requiredMediaRules: { minImages: 1 },
    testFixtures: { validatesNonVehicleChannelStub: true, requiresDealerAccount: true },
    marketplaceListing: true,
    connectionType: integrationClass === 'FEEDABLE' ? 'PARTNER_FEED' : 'MANUAL_PORTAL',
    integrationMaturity: 'SETUP_GUIDE',
    requirementsConfidence: 'LIKELY',
    partnerFeed: integrationClass === 'FEEDABLE',
  };
}

const STUB_DEFINITIONS = [
  ...CORE_NON_VEHICLE_STUB_DEFINITIONS,
  ...EXTENDED_NON_VEHICLE_STUB_DEFINITIONS,
  ...PROPERTY_NON_VEHICLE_STUB_DEFINITIONS,
];

export const nonVehiclePlatformStubs: PlatformProfileSeed[] = STUB_DEFINITIONS.map(buildStub);

export function nonVehiclePlatformsForCategory(
  category: NonVehiclePlatformCategory,
): PlatformProfileSeed[] {
  return nonVehiclePlatformStubs.filter(p => p.supportedCategories.includes(category));
}

export function nonVehiclePlatformSlugsForCategory(category: NonVehiclePlatformCategory): string[] {
  return nonVehiclePlatformsForCategory(category).map(p => p.slug);
}

