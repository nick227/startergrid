// Compile-time boundary assertions for marketplace public types.
// Each property is a TypeScript constraint that fails compilation if a forbidden
// field is ever added to MarketplaceVehicleCard — catching leakage at build time.
// Run via: tsc --noEmit  (or npm run typecheck inside apps/marketplace)

import type { MarketplaceVehicleCard } from '@dealer-marketplace/client';

type AbsentFrom<T, K extends string> = K extends keyof T ? 'FAIL' : 'ok';
type MustBeAbsent<_ok extends 'ok'> = _ok;

// If any property type resolves to 'FAIL' (field present in card),
// TypeScript reports: Type '"FAIL"' does not satisfy the constraint '"ok"'.
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
