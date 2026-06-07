import type { BusinessCategoryId } from '../../packages/category-schemas/src/types.js';
import type { DealershipPayload, VehiclePayload } from './types.js';
import { boatsDealerPayload, boatsDealerVehicles } from '../fixtures/scenarios/boatsDealer.fixture.js';
import { NON_VEHICLE_FIXTURES } from '../fixtures/scenarios/nonVehicleFixtures.js';
import {
  pristineApiDealership,
  pristineApiVehicles,
} from '../fixtures/scenarios/pristineApiValidation.fixture.js';
import { trailersDealerPayload, trailersDealerVehicles } from '../fixtures/scenarios/trailersDealer.fixture.js';

export type PlatformCategoryFixture = {
  dealer: DealershipPayload;
  inventory: VehiclePayload[];
};

/** Categories with pristine dealer/inventory fixtures wired for platform readiness tests. */
export const PLATFORM_CATEGORY_FIXTURES: Partial<
  Record<BusinessCategoryId, PlatformCategoryFixture>
> = {
  AUTOMOTIVE: {
    dealer: pristineApiDealership,
    inventory: pristineApiVehicles,
  },
  TRAILERS_POWERSPORTS_RV: {
    dealer: trailersDealerPayload,
    inventory: trailersDealerVehicles,
  },
  BOATS: {
    dealer: boatsDealerPayload,
    inventory: boatsDealerVehicles,
  },
  ...NON_VEHICLE_FIXTURES,
};

export const PLATFORM_FIXTURE_CATEGORIES = Object.keys(
  PLATFORM_CATEGORY_FIXTURES,
) as BusinessCategoryId[];

export function platformFixtureForCategory(
  category: BusinessCategoryId,
): PlatformCategoryFixture | undefined {
  return PLATFORM_CATEGORY_FIXTURES[category];
}

export function categoriesWithPlatformFixtures(): BusinessCategoryId[] {
  return PLATFORM_FIXTURE_CATEGORIES;
}
