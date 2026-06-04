import { nanoid } from 'nanoid';
import type { DealershipPayload, PlatformProfileSeed, VehiclePayload } from '../lib/types.js';
import { toCatalogRows } from './outputGenerator.js';

export function createAuthorizationPacket(platform: PlatformProfileSeed, dealership: DealershipPayload, vehicles: VehiclePayload[]) {
  const key = `AUTH-${platform.slug.toUpperCase()}-${nanoid(10)}`;
  return {
    authorizationKey: key,
    verificationUrl: `https://app.example.com/verify/${key}`,
    revocationUrl: `https://app.example.com/revoke/${key}`,
    scope: {
      platform: platform.slug,
      allowedActions: ['prepare_application', 'submit_application_packet', 'send_feed_sample', 'track_status'],
      excludedActions: ['sign_paid_platform_contract', 'store_platform_password']
    },
    dealershipSnapshot: dealership,
    platformSnapshot: {
      slug: platform.slug,
      name: platform.name,
      outputFormat: platform.outputFormat,
      schemaVersion: platform.schemaVersion,
      requiredDealershipFields: platform.requiredDealershipFields,
      requiredVehicleFields: platform.requiredVehicleFields
    },
    inventorySnapshot: toCatalogRows(dealership, vehicles),
    packetPayload: {
      subject: `Dealer onboarding authorization: ${dealership.legalName} → ${platform.name}`,
      body: `${dealership.legalName} authorizes this platform to prepare and submit onboarding materials to ${platform.name}. Authorization key: ${key}`
    }
  };
}
