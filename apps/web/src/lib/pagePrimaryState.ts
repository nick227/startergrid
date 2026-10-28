import { AUTO_MARKETPLACE_SLUG } from './marketplaceBrand.ts';

export type PageExperience = 'empty' | 'setup' | 'running' | 'attention';

export type ChannelCounts = {
  connected: number;
  attention: number;
  setup: number;
  total: number;
};

/** Channels: attention wins, then none connected, then unfinished setup, then running. */
export function channelExperience(counts: ChannelCounts): PageExperience {
  if (counts.total === 0) return 'empty';
  if (counts.attention > 0) return 'attention';
  if (counts.connected === 0) return 'empty';
  if (counts.setup > 0) return 'setup';
  return 'running';
}

export function platformLooksConnected(platform: {
  accountState?: string | null;
  state?: string | null;
  platformSlug?: string;
}): boolean {
  if (platform.accountState === 'ACTIVE' || platform.state === 'Active') return true;
  return platform.platformSlug === AUTO_MARKETPLACE_SLUG && (platform.state === 'Ready' || platform.state === 'Scheduled');
}

export function dealerSetupIncomplete(input: {
  vehicleTotal: number;
  vehicleReady: number;
  channelConnected: boolean;
  missingPrimaryContact: boolean;
}): boolean {
  return (
    input.vehicleTotal === 0 ||
    input.vehicleReady === 0 ||
    !input.channelConnected ||
    input.missingPrimaryContact
  );
}

export type OperatingPosture = 'unconfigured' | 'attention' | 'clear';

/** A dealership with nothing in use is not healthy. All clear requires a configured system and a completed check. */
export function operatingPosture(input: {
  vehicleTotal: number;
  channelConfigured: boolean;
  leadCount: number;
  problemCount: number;
  checksIncomplete: boolean;
}): OperatingPosture {
  const inUse = input.vehicleTotal > 0 || input.channelConfigured || input.leadCount > 0;
  if (!inUse) return 'unconfigured';
  if (input.problemCount > 0 || input.checksIncomplete) return 'attention';
  return 'clear';
}

/** Reports: blocked listings and failed sends win; empty inventory is empty, not a six-widget dashboard. */
export function reportsExperience(input: {
  vehicleTotal: number;
  blocked: number;
  failedSends: number;
}): PageExperience {
  if (input.vehicleTotal === 0 && input.blocked === 0 && input.failedSends === 0) return 'empty';
  if (input.blocked > 0 || input.failedSends > 0) return 'attention';
  return 'running';
}
