import type { PrismaClient } from '@prisma/client';
import { platformProfiles } from '../../data/platformProfiles.js';
import { listPlatformAccounts, type PlatformAccountDetail } from '../publishing/platformAccountService.js';
import { buildSetupPlan, type ChannelSetupPlan, type SetupOwner } from './channelSetupService.js';
import { CHANNEL_PURPOSES, channelCapabilities, primaryPurpose, type ChannelCapability, type ChannelPurpose } from './channelPurpose.js';

/**
 * One evidence-based status per channel for the Channels overview and the channel page header,
 * with setup, connection and distribution kept as separate facts underneath it.
 * CONNECTED means setup is complete; it never means listings are live.
 */

export type ChannelDisplayStatus = 'NOT_SET_UP' | 'SETTING_UP' | 'NEEDS_ATTENTION' | 'CONNECTED';
export type ChannelConnectionState = 'VERIFIED' | 'NOT_CHECKED' | 'FAILED' | 'NOT_APPLICABLE';

export type ChannelOverviewItem = {
  channel: string;
  name: string;
  purpose: ChannelPurpose;
  capabilities: ChannelCapability[];
  integrationClass: string;
  enabled: boolean;
  displayStatus: ChannelDisplayStatus;
  /** One plain sentence explaining displayStatus. */
  displayReason: string;
  /** Who the channel is waiting on while SETTING_UP. */
  waitingOn: SetupOwner | null;
  setup: { status: ChannelSetupPlan['status']; done: number; total: number; currentStepTitle: string | null };
  connection: { state: ChannelConnectionState };
  /** Autopilot distribution targets for this channel. verifiedLive needs destination evidence. */
  distribution: { verifiedLive: number; inProgress: number; problems: number };
  openIncidents: number;
};

export type ChannelOverview = {
  purposes: Array<{
    purpose: ChannelPurpose;
    label: string;
    description: string;
    total: number;
    counts: Record<ChannelDisplayStatus, number>;
  }>;
  channels: ChannelOverviewItem[];
};

const PROBLEM_STATUSES = new Set(['FAILED', 'UNKNOWN', 'HELD']);
const IN_PROGRESS_STATUSES = new Set(['PROCESSING', 'SUBMITTED']);
const ON_HOLD = new Set(['BLOCKED', 'SUSPENDED']);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Evidence = { distribution: ChannelOverviewItem['distribution']; openIncidents: number };

function connectionState(a: PlatformAccountDetail): ChannelConnectionState {
  if (a.integrationClass === 'OWNED') return 'NOT_APPLICABLE';
  if (a.state === 'FAILED' || a.oauthExpired) return 'FAILED';
  // A passed connection check, or a live sign-in token for a sign-in channel.
  if (a.state === 'READY' || a.highestConfirmedLevel === 'CONNECTION_TESTED') return 'VERIFIED';
  if (a.connectionType === 'OAUTH' && a.oauthConnected) return 'VERIFIED';
  return 'NOT_CHECKED';
}

function hasStarted(a: PlatformAccountDetail, plan: ChannelSetupPlan): boolean {
  return a.dealerEnabled || a.state !== 'ACCOUNT_NEEDED' || plan.progress.done > 0 || a.oauthConnected || a.oauthExpired;
}

/** Pure status rules, kept separate from data loading so they are easy to test. */
export function channelOverviewItem(a: PlatformAccountDetail, plan: ChannelSetupPlan, evidence: Evidence): ChannelOverviewItem {
  const profile = platformProfiles.find(p => p.slug === a.platformSlug);
  const name = plan.name;
  const connection = connectionState(a);
  const current = plan.steps.find(s => s.id === plan.currentStepId) ?? null;
  const { distribution, openIncidents } = evidence;
  const owned = a.integrationClass === 'OWNED';
  const started = owned ? a.dealerEnabled : hasStarted(a, plan);

  // First matching problem wins; each only counts once the dealer has started the channel.
  const attention = !started ? null
    : a.oauthExpired ? `Your ${name} sign-in expired. Sign in again.`
    : a.state === 'FAILED' ? `${name} did not accept the connection details.`
    : ON_HOLD.has(a.state) ? `The ${name} account is on hold. DealerGrid support is on it.`
    : plan.status === 'BLOCKED' && current?.owner === 'DEALERSHIP' ? plan.headline
    : distribution.problems > 0 ? `${plural(distribution.problems, 'vehicle is', 'vehicles are')} not confirmed on ${name}.`
    : openIncidents > 0 ? `${plural(openIncidents, 'problem needs', 'problems need')} a look on ${name}.`
    : null;

  const ready = owned || plan.status === 'READY';
  const displayStatus: ChannelDisplayStatus = attention ? 'NEEDS_ATTENTION'
    : !started ? 'NOT_SET_UP'
    : ready ? 'CONNECTED'
    : 'SETTING_UP';

  const displayReason = attention
    ?? (displayStatus === 'NOT_SET_UP' ? 'Not set up.'
      : displayStatus === 'SETTING_UP' ? plan.headline
      : distribution.verifiedLive > 0 ? `${plural(distribution.verifiedLive, 'vehicle', 'vehicles')} confirmed live.`
      : 'Set up. No listings confirmed live yet.');

  return {
    channel: a.platformSlug,
    name,
    purpose: profile ? primaryPurpose(profile) : 'MARKETPLACE',
    capabilities: profile ? channelCapabilities(profile) : [],
    integrationClass: a.integrationClass,
    enabled: a.dealerEnabled,
    displayStatus,
    displayReason,
    waitingOn: displayStatus === 'SETTING_UP' ? current?.owner ?? null : null,
    setup: { status: plan.status, done: plan.progress.done, total: plan.progress.total, currentStepTitle: current?.title ?? null },
    connection: { state: connection },
    distribution,
    openIncidents,
  };
}

export function summarizePurposes(items: ChannelOverviewItem[]): ChannelOverview['purposes'] {
  return CHANNEL_PURPOSES.map(p => {
    const mine = items.filter(i => i.purpose === p.purpose);
    const counts: Record<ChannelDisplayStatus, number> = { NOT_SET_UP: 0, SETTING_UP: 0, NEEDS_ATTENTION: 0, CONNECTED: 0 };
    for (const i of mine) counts[i.displayStatus]++;
    return { ...p, total: mine.length, counts };
  });
}

export async function getChannelOverview(db: PrismaClient, dealershipId: string, channel?: string): Promise<ChannelOverview> {
  const [{ accounts }, targets, incidents] = await Promise.all([
    listPlatformAccounts(db, dealershipId),
    db.distributionTarget.groupBy({ by: ['channel', 'status'], where: { dealershipId, operation: 'UPSERT' }, _count: { _all: true } }),
    db.distributionIncident.groupBy({ by: ['channel'], where: { dealershipId, state: { in: ['OPEN', 'ACKNOWLEDGED'] } }, _count: { _all: true } }),
  ]);
  const supportEmail = process.env['SUPPORT_EMAIL'];
  const items = accounts
    .filter(a => a.siteEnabled !== false)
    .map(a => {
      const distribution = { verifiedLive: 0, inProgress: 0, problems: 0 };
      for (const t of targets.filter(t => t.channel === a.platformSlug)) {
        if (t.status === 'VERIFIED_LIVE') distribution.verifiedLive += t._count._all;
        else if (IN_PROGRESS_STATUSES.has(t.status)) distribution.inProgress += t._count._all;
        else if (PROBLEM_STATUSES.has(t.status)) distribution.problems += t._count._all;
      }
      const openIncidents = incidents.find(i => i.channel === a.platformSlug)?._count._all ?? 0;
      return channelOverviewItem(a, buildSetupPlan(a, { supportEmail }), { distribution, openIncidents });
    });
  const scoped = channel ? items.filter(i => i.channel === channel) : items;
  return { purposes: summarizePurposes(items), channels: scoped };
}
