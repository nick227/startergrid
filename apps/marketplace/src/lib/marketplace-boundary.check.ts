// Compile-time boundary assertions for marketplace public types.
// Each property is a TypeScript constraint that fails compilation if a forbidden
// field is ever added to MarketplaceVehicleCard — catching leakage at build time.
// Run via: tsc --noEmit  (or npm run typecheck inside apps/marketplace)

import type {
  MarketplaceFeedItem,
  MarketplaceVehicleCard,
  MarketplaceVehicleDetailResponse,
  VehicleCore,
} from '@dealer-marketplace/client';

type AbsentFrom<T, K extends string> = K extends keyof T ? 'FAIL' : 'ok';
type PresentIn<T, K extends string> = K extends keyof T ? 'ok' : 'FAIL';
type MustBeAbsent<_ok extends 'ok'> = _ok;
type MustBePresent<_ok extends 'ok'> = _ok;

export type MarketplaceVehicleCardBoundaryAssertions = {
  _no_vin:           MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'vin'>>;
  _no_syncEvents:    MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'syncEvents'>>;
  _no_publishQueue:  MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'publishQueue'>>;
  _no_subscription:  MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'subscription'>>;
  _no_applications:  MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'applications'>>;
  _no_performanceCache:  MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'performanceCache'>>;
  _no_movementSignal:    MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'movementSignal'>>;
  _no_platformAccounts:  MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'platformAccounts'>>;
  _no_credentialRefs:    MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'credentialRefs'>>;
  _no_readinessScore:    MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'readinessScore'>>;
  _no_billing:           MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'billing'>>;
  _no_syncPolicies:      MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'syncPolicies'>>;
  _no_leadCaptureUrl:    MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'leadCaptureUrl'>>;
  _no_notifications:     MustBeAbsent<AbsentFrom<MarketplaceVehicleCard, 'notifications'>>;
};

export type MarketplaceFeedItemBoundaryAssertions = {
  _no_vin:           MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'vin'>>;
  _no_syncEvents:    MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'syncEvents'>>;
  _no_publishQueue:  MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'publishQueue'>>;
  _no_subscription:  MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'subscription'>>;
  _no_applications:  MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'applications'>>;
  _no_performanceCache:  MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'performanceCache'>>;
  _no_movementSignal:    MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'movementSignal'>>;
  _no_platformAccounts:  MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'platformAccounts'>>;
  _no_credentialRefs:    MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'credentialRefs'>>;
  _no_readinessScore:    MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'readinessScore'>>;
  _no_billing:           MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'billing'>>;
  _no_syncPolicies:      MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'syncPolicies'>>;
  _no_leadCaptureUrl:    MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'leadCaptureUrl'>>;
  _no_notifications:     MustBeAbsent<AbsentFrom<MarketplaceFeedItem, 'notifications'>>;
};

/** Detail VIN lives under vehicle.core only — never on browse card types. */
export type VehicleCoreBoundaryAssertions = {
  _has_vin: MustBePresent<PresentIn<VehicleCore, 'vin'>>;
};

export type MarketplaceVehicleDetailBoundaryAssertions = {
  _detail_vehicle_has_core_vin: MustBePresent<PresentIn<MarketplaceVehicleDetailResponse['vehicle']['core'], 'vin'>>;
  _detail_root_no_flat_vin: MustBeAbsent<AbsentFrom<MarketplaceVehicleDetailResponse, 'vin'>>;
};
