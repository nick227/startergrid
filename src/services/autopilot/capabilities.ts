import { platformProfiles } from '../../data/platformProfiles.js';
import type { ChannelCapability } from './contracts.js';

export interface CapabilityContext {
  siteEnabled: boolean;
  categorySupported: boolean;
  providerConfigured: boolean;
  /** True only after the owned publisher + read-model verification are installed. */
  ownedPublisherAvailable: boolean;
}

/** External adapters never become verified by env vars, profile flags or UI input. */
export function qualifyChannel(channel: string, ctx: CapabilityContext): ChannelCapability {
  const base = { channel, operations: [], canVerify: false, evidenceReference: null } satisfies Partial<ChannelCapability>;
  const profile = platformProfiles.find(p => p.slug === channel);
  if (!profile || !ctx.siteEnabled || !ctx.categorySupported) {
    return { ...base, qualification: 'UNAVAILABLE', reason: 'This destination is unavailable for this dealership.' };
  }
  if (channel === 'consumer-marketplace') {
    return ctx.ownedPublisherAvailable
      ? { channel, qualification: 'VERIFIED_AUTOMATIC', operations: ['UPSERT', 'WITHDRAW'], canVerify: true,
          evidenceReference: 'owned-marketplace-read-model-v1', reason: 'First-party publication supports authoritative read-model verification.' }
      : { ...base, qualification: 'UNAVAILABLE', reason: 'The verified first-party publisher is not installed.' };
  }
  if (profile.integrationMaturity === 'SETUP_GUIDE' || profile.integrationClass === 'ASSISTED' || profile.integrationClass === 'PARTNER_DEPENDENT') {
    return { ...base, qualification: profile.connectionType === 'MANUAL_PORTAL' ? 'MANUAL' : 'PARTNER_ASSISTED',
      reason: 'This destination requires manual or partner-assisted work; automatic delivery is not qualified.' };
  }
  if (ctx.providerConfigured && (profile.oauthProvider || profile.catalogSync || profile.marketplaceListing || profile.socialPosting)) {
    return { ...base, qualification: 'CONFIGURED_UNVERIFIED', reason: 'Configuration exists, but external create/update/withdrawal and verification have not been qualified.' };
  }
  return { ...base, qualification: 'UNAVAILABLE', reason: 'Required provider configuration or an automatic implementation is missing.' };
}
