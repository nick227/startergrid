/**
 * Client for GET /api/dealers/:id/channels/overview: four purposes (each channel counted once)
 * and one evidence-based status per channel. CONNECTED means set up, never live; only
 * `distribution.verifiedLive` comes from destination evidence.
 */
import type { SetupOwner, SetupPlanStatus } from './channelSetupApi.ts';

export type ChannelPurpose = 'MARKETPLACE' | 'SOCIAL_ADVERTISING' | 'INVENTORY_FEED' | 'LEAD_DELIVERY';
export type ChannelCapability = 'LISTINGS' | 'SOCIAL_POSTS' | 'CATALOG' | 'PARTNER_FEED' | 'LEADS';
export type ChannelDisplayStatus = 'NOT_SET_UP' | 'SETTING_UP' | 'NEEDS_ATTENTION' | 'CONNECTED';

export interface ChannelOverviewItem {
  channel: string;
  name: string;
  purpose: ChannelPurpose;
  capabilities: ChannelCapability[];
  integrationClass: string;
  enabled: boolean;
  displayStatus: ChannelDisplayStatus;
  displayReason: string;
  waitingOn: SetupOwner | null;
  setup: { status: SetupPlanStatus; done: number; total: number; currentStepTitle: string | null };
  connection: { state: 'VERIFIED' | 'NOT_CHECKED' | 'FAILED' | 'NOT_APPLICABLE' };
  distribution: { verifiedLive: number; inProgress: number; problems: number };
  openIncidents: number;
}

export interface ChannelPurposeSummary {
  purpose: ChannelPurpose;
  label: string;
  description: string;
  total: number;
  counts: Record<ChannelDisplayStatus, number>;
}

export interface ChannelOverviewResponse {
  viewerCanAct: boolean;
  purposes: ChannelPurposeSummary[];
  channels: ChannelOverviewItem[];
}

export async function fetchChannelOverview(dealerId: string, channel?: string): Promise<ChannelOverviewResponse> {
  const query = channel ? `?channel=${encodeURIComponent(channel)}` : '';
  const res = await fetch(`/api/dealers/${encodeURIComponent(dealerId)}/channels/overview${query}`, { credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load channels');
  }
  return res.json();
}

export const STATUS_LABEL: Record<ChannelDisplayStatus, string> = {
  NOT_SET_UP: 'Not set up',
  SETTING_UP: 'Setting up',
  NEEDS_ATTENTION: 'Needs attention',
  CONNECTED: 'Connected',
};

export const CAPABILITY_LABEL: Record<ChannelCapability, string> = {
  LISTINGS: 'Listings',
  SOCIAL_POSTS: 'Social posts',
  CATALOG: 'Catalog',
  PARTNER_FEED: 'Partner feed',
  LEADS: 'Leads',
};

/** Who a setting-up channel is waiting on, for "Setting up · waiting on CarGurus". */
export function waitingLabel(item: Pick<ChannelOverviewItem, 'waitingOn' | 'name'>): string | null {
  if (item.waitingOn === 'DEALERSHIP') return 'your next step';
  if (item.waitingOn === 'INTERNAL_SUPPORT') return 'DealerGrid';
  if (item.waitingOn === 'PARTNER') return item.name;
  return null;
}
