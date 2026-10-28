import type { PrismaClient } from '@prisma/client';
import { listInventoryVehicles } from '../inventory/inventoryListService.js';
import { auditDealershipSyndication, type GhostListingItem, type RemovalStatus } from '../distribution/syndicationSentryService.js';
import { crmDeliveryStatus, isCrmSend } from '../leads/leadCrmHandoffService.js';
import { realEmailDeliveryEnabled } from '../dealer/emailTransport.js';

/**
 * One list of everything that needs a person, built from recorded state only. Each source
 * already owns its rules (inventory readiness, take-down evidence, channel state, CRM
 * attempts); this module groups their results so one problem appears once, with who acts.
 */

export type AttentionArea = 'VEHICLES' | 'REMOVALS' | 'CHANNELS' | 'LEADS';
/** Who has to act. SYSTEM means StarterGrid is still working on it and nobody needs to. */
export type AttentionOwner = 'DEALERSHIP' | 'INTERNAL_SUPPORT' | 'PARTNER' | 'SYSTEM';
/** BLOCKING: work or exposure is stuck until someone acts. WAITING: someone else is on it. */
export type AttentionSeverity = 'BLOCKING' | 'WARNING' | 'WAITING';
export type AttentionKind =
  | 'VEHICLE_INFORMATION_MISSING'
  | 'VEHICLE_PHOTOS_MISSING'
  | 'SOLD_LISTING_TAKE_DOWN_NEEDED'
  | 'SOLD_LISTING_EXTERNAL_REMOVAL'
  | 'SOLD_LISTING_REMOVAL_FAILED'
  | 'SOLD_LISTING_REMOVAL_IN_PROGRESS'
  | 'CHANNEL_SETUP_INCOMPLETE'
  | 'DISTRIBUTION_PROBLEM'
  | 'UNANSWERED_INQUIRY'
  | 'CRM_DELIVERY_FAILED';
export type AttentionActionKind =
  | 'FIX_VEHICLES'
  | 'ADD_PHOTOS'
  | 'REVIEW_REMOVALS'
  | 'END_EXTERNAL_LISTING'
  | 'COMPLETE_CHANNEL_SETUP'
  | 'OPEN_LEADS'
  | 'RETRY_CRM_DELIVERY'
  | 'CONTACT_SUPPORT'
  | 'NONE';

export type AttentionRecord = {
  type: 'VEHICLE' | 'LISTING' | 'CHANNEL' | 'LEAD';
  id: string;
  label: string;
  detail: string | null;
  channel: string | null;
  vehicleId: string | null;
};

export type AttentionItem = {
  /** Stable for the same problem and owner, so the UI can remember dismissed or expanded rows. */
  key: string;
  area: AttentionArea;
  kind: AttentionKind;
  severity: AttentionSeverity;
  owner: AttentionOwner;
  /** Specific person, when the source records one (distribution incidents). */
  ownerId: string | null;
  count: number;
  summary: string;
  nextAction: string;
  action: {
    kind: AttentionActionKind;
    enabled: boolean;
    disabledReason: string | null;
    /** Set when every affected record is on one channel. */
    channel: string | null;
  };
  /** Up to RECORD_LIMIT affected records; `count` is the full number. */
  records: AttentionRecord[];
};

export type AttentionResponse = {
  dealershipId: string;
  generatedAt: string;
  counts: { total: number; blocking: number; dealershipActions: number; waiting: number };
  items: AttentionItem[];
  /** Sources that failed to load. The list is incomplete; never show it as "all clear". */
  unavailableAreas: AttentionArea[];
};

const RECORD_LIMIT = 50;
const ADF_SLUG = 'adf-xml-lead-routing';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function item(fields: Omit<AttentionItem, 'count' | 'action' | 'records'> & {
  records: AttentionRecord[];
  action: AttentionActionKind;
  disabledReason?: string | null;
}): AttentionItem {
  const channels = new Set(fields.records.map(r => r.channel).filter(Boolean));
  return {
    ...fields,
    count: fields.records.length,
    records: fields.records.slice(0, RECORD_LIMIT),
    action: {
      kind: fields.action,
      enabled: fields.action !== 'NONE' && !fields.disabledReason,
      disabledReason: fields.disabledReason ?? null,
      channel: channels.size === 1 ? [...channels][0]! : null,
    },
  };
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  return groups;
}

function normalizeOwner(owner: string | null | undefined): AttentionOwner {
  return owner === 'DEALERSHIP' || owner === 'INTERNAL_SUPPORT' || owner === 'PARTNER' ? owner : 'SYSTEM';
}

function actionForOwner(owner: AttentionOwner, dealershipAction: AttentionActionKind): AttentionActionKind {
  if (owner === 'DEALERSHIP') return dealershipAction;
  return owner === 'INTERNAL_SUPPORT' ? 'CONTACT_SUPPORT' : 'NONE';
}

// ── Vehicles ─────────────────────────────────────────────────────────────────

async function vehicleItems(db: PrismaClient, dealershipId: string): Promise<AttentionItem[]> {
  const { vehicles } = await listInventoryVehicles(db, dealershipId, 'active');
  const record = (v: (typeof vehicles)[number], detail: string | null): AttentionRecord => ({
    type: 'VEHICLE', id: v.id, label: `${v.year} ${v.make} ${v.model} #${v.stockNumber}`,
    detail, channel: null, vehicleId: v.id,
  });
  const blocked = vehicles.filter(v => v.readiness === 'BLOCKED');
  const noPhotos = vehicles.filter(v => v.readiness !== 'BLOCKED' && v.mediaCount === 0);
  const items: AttentionItem[] = [];
  if (blocked.length) {
    items.push(item({
      key: 'vehicles:information-missing', area: 'VEHICLES', kind: 'VEHICLE_INFORMATION_MISSING',
      severity: 'BLOCKING', owner: 'DEALERSHIP', ownerId: null,
      summary: `${plural(blocked.length, 'vehicle is', 'vehicles are')} missing required information and cannot be listed.`,
      nextAction: 'Add the missing details on each vehicle.',
      action: 'FIX_VEHICLES',
      records: blocked.map(v => record(v, v.issues.find(i => i.severity === 'FAIL')?.message ?? null)),
    }));
  }
  if (noPhotos.length) {
    items.push(item({
      key: 'vehicles:photos-missing', area: 'VEHICLES', kind: 'VEHICLE_PHOTOS_MISSING',
      severity: 'WARNING', owner: 'DEALERSHIP', ownerId: null,
      summary: `${plural(noPhotos.length, 'vehicle has', 'vehicles have')} no photos.`,
      nextAction: 'Add photos so shoppers can see the vehicle.',
      action: 'ADD_PHOTOS',
      records: noPhotos.map(v => record(v, null)),
    }));
  }
  return items;
}

// ── Sold-vehicle removals ────────────────────────────────────────────────────

type RemovalBucket = 'TAKE_DOWN_NEEDED' | 'EXTERNAL_REMOVAL' | 'FAILED' | 'IN_PROGRESS';
const BUCKET: Record<RemovalStatus, RemovalBucket | null> = {
  NOT_REQUESTED: 'TAKE_DOWN_NEEDED',
  UNSUPPORTED: 'EXTERNAL_REMOVAL',
  FAILED: 'FAILED',
  QUEUED_LOCALLY: 'IN_PROGRESS',
  SUBMISSION_ATTEMPTED: 'IN_PROGRESS',
  PROVIDER_ACCEPTED: 'IN_PROGRESS',
  VERIFIED_REMOVED: null,
};

async function removalItems(db: PrismaClient, dealershipId: string): Promise<AttentionItem[]> {
  const audit = await auditDealershipSyndication(db, dealershipId);
  if (audit.ghostListings.length === 0) return [];
  const targetIds = audit.ghostListings.filter(g => g.source === 'DISTRIBUTION_TARGET').map(g => g.id);
  const owners = new Map((targetIds.length
    ? await db.distributionTarget.findMany({ where: { dealershipId, id: { in: targetIds } }, select: { id: true, owner: true } })
    : []).map(t => [t.id, normalizeOwner(t.owner)]));

  const rows = audit.ghostListings.flatMap(ghost => {
    const bucket = BUCKET[ghost.removalStatus];
    if (!bucket) return [];
    // Starting a take-down is always the dealership's call; afterwards the source decides.
    const owner: AttentionOwner = bucket === 'TAKE_DOWN_NEEDED' || ghost.source === 'MARKETPLACE_LISTING'
      ? 'DEALERSHIP'
      : owners.get(ghost.id) ?? 'SYSTEM';
    return [{ ghost, bucket, owner }];
  });

  const record = (g: GhostListingItem): AttentionRecord => ({
    type: 'LISTING', id: g.id, label: `${g.title} #${g.stockNumber} on ${g.channelDisplayName}`,
    detail: g.nextAction, channel: g.channel, vehicleId: g.vehicleId,
  });
  const copy: Record<RemovalBucket, { kind: AttentionKind; summary: (n: number) => string; action: AttentionActionKind }> = {
    TAKE_DOWN_NEEDED: {
      kind: 'SOLD_LISTING_TAKE_DOWN_NEEDED', action: 'REVIEW_REMOVALS',
      summary: n => `${plural(n, 'sold vehicle is', 'sold vehicles are')} still listed and no take-down has started.`,
    },
    EXTERNAL_REMOVAL: {
      kind: 'SOLD_LISTING_EXTERNAL_REMOVAL', action: 'END_EXTERNAL_LISTING',
      summary: n => `${plural(n, 'sold vehicle listing needs', 'sold vehicle listings need')} to be ended on the destination; StarterGrid cannot remove ${n === 1 ? 'it' : 'them'} there.`,
    },
    FAILED: {
      kind: 'SOLD_LISTING_REMOVAL_FAILED', action: 'REVIEW_REMOVALS',
      summary: n => `${plural(n, 'sold vehicle removal', 'sold vehicle removals')} failed or could not be confirmed.`,
    },
    IN_PROGRESS: {
      kind: 'SOLD_LISTING_REMOVAL_IN_PROGRESS', action: 'NONE',
      summary: n => `${plural(n, 'sold vehicle removal is', 'sold vehicle removals are')} in progress and not confirmed yet.`,
    },
  };

  return [...groupBy(rows, r => `${r.bucket}:${r.owner}`).values()].map(group => {
    const { bucket, owner } = group[0]!;
    const c = copy[bucket];
    const ghosts = group.map(r => r.ghost);
    return item({
      key: `removals:${bucket.toLowerCase()}:${owner.toLowerCase()}`, area: 'REMOVALS', kind: c.kind,
      severity: bucket === 'IN_PROGRESS' ? 'WAITING' : owner === 'DEALERSHIP' || bucket === 'EXTERNAL_REMOVAL' ? 'BLOCKING' : 'WAITING',
      owner, ownerId: null,
      summary: c.summary(ghosts.length),
      nextAction: ghosts[0]!.nextAction,
      action: actionForOwner(owner, c.action),
      records: ghosts.map(record),
    });
  });
}

// ── Channels ─────────────────────────────────────────────────────────────────

const SETUP_OWNER: Record<string, AttentionOwner | undefined> = {
  ACCOUNT_NEEDED: 'DEALERSHIP', CREDENTIALS_NEEDED: 'DEALERSHIP', NEEDS_INFO: 'DEALERSHIP', FAILED: 'DEALERSHIP',
  PENDING_REVIEW: 'PARTNER', WAITING_ON_PARTNER: 'PARTNER', PARTNER_REQUIRED: 'PARTNER',
  BLOCKED: 'INTERNAL_SUPPORT', SUSPENDED: 'INTERNAL_SUPPORT',
};
// Incidents these reasons describe are already reported by another area or by account setup.
const COVERED_INCIDENT_REASONS = new Set(['VEHICLE_INFORMATION']);
const CONNECTION_REASONS = new Set(['CONNECTION_REQUIRED', 'CREDENTIALS']);

async function channelItems(db: PrismaClient, dealershipId: string): Promise<AttentionItem[]> {
  const [accounts, incidents] = await Promise.all([
    db.platformAccount.findMany({
      where: { dealershipId, dealerEnabled: true },
      select: { platformSlug: true, state: true, nextAction: true },
    }),
    db.distributionIncident.findMany({
      where: { dealershipId, state: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      select: { id: true, channel: true, vehicleId: true, reasonCode: true, severity: true, owner: true, ownerId: true, nextAction: true },
    }),
  ]);

  const items: AttentionItem[] = [];
  const setup = accounts.flatMap(a => {
    const owner = SETUP_OWNER[a.state];
    return owner ? [{ account: a, owner }] : [];
  });
  for (const group of groupBy(setup, r => r.owner).values()) {
    const owner = group[0]!.owner;
    items.push(item({
      key: `channels:setup:${owner.toLowerCase()}`, area: 'CHANNELS', kind: 'CHANNEL_SETUP_INCOMPLETE',
      severity: owner === 'DEALERSHIP' ? 'WARNING' : 'WAITING', owner, ownerId: null,
      summary: `${plural(group.length, 'channel needs', 'channels need')} setup before it can be used.`,
      nextAction: group[0]!.account.nextAction ?? 'Finish connecting the channel.',
      action: actionForOwner(owner, 'COMPLETE_CHANNEL_SETUP'),
      records: group.map(({ account }) => ({
        type: 'CHANNEL', id: account.platformSlug, label: account.platformSlug,
        detail: account.nextAction ?? account.state, channel: account.platformSlug, vehicleId: null,
      })),
    }));
  }

  const setupChannels = new Set(setup.map(r => r.account.platformSlug));
  const open = incidents.filter(i =>
    i.severity !== 'CRITICAL' // sold-vehicle withdrawals: reported under REMOVALS
    && !COVERED_INCIDENT_REASONS.has(i.reasonCode)
    && !(CONNECTION_REASONS.has(i.reasonCode) && setupChannels.has(i.channel)));
  const vehicleIds = [...new Set(open.map(i => i.vehicleId).filter((id): id is string => Boolean(id)))];
  const vehicles = new Map((vehicleIds.length
    ? await db.vehicle.findMany({ where: { dealershipId, id: { in: vehicleIds } }, select: { id: true, year: true, make: true, model: true, stockNumber: true } })
    : []).map(v => [v.id, `${v.year} ${v.make} ${v.model} #${v.stockNumber}`]));

  for (const group of groupBy(open, i => `${i.reasonCode}:${normalizeOwner(i.owner)}`).values()) {
    const first = group[0]!;
    const owner = normalizeOwner(first.owner);
    const ownerIds = new Set(group.map(i => i.ownerId));
    items.push(item({
      key: `channels:incident:${first.reasonCode.toLowerCase()}:${owner.toLowerCase()}`, area: 'CHANNELS', kind: 'DISTRIBUTION_PROBLEM',
      severity: owner === 'DEALERSHIP' ? 'BLOCKING' : 'WAITING', owner,
      ownerId: ownerIds.size === 1 ? first.ownerId : null,
      summary: `${plural(group.length, 'vehicle is', 'vehicles are')} not confirmed current on a channel.`,
      nextAction: first.nextAction,
      action: actionForOwner(owner, 'COMPLETE_CHANNEL_SETUP'),
      records: group.map(i => ({
        type: i.vehicleId ? 'VEHICLE' : 'CHANNEL', id: i.id,
        label: i.vehicleId ? `${vehicles.get(i.vehicleId) ?? 'Vehicle'} on ${i.channel}` : i.channel,
        detail: i.nextAction, channel: i.channel, vehicleId: i.vehicleId,
      })),
    }));
  }
  return items;
}

// ── Leads ────────────────────────────────────────────────────────────────────

async function leadItems(db: PrismaClient, dealershipId: string, env: Record<string, string | undefined>): Promise<AttentionItem[]> {
  const attempts = await db.leadDeliveryAttempt.findMany({
    where: { dealershipId, destinationType: 'ADF_XML_EMAIL', attemptCount: { gt: 0 } },
    orderBy: { createdAt: 'desc' },
    select: { leadId: true, destinationType: true, status: true, attemptCount: true, lastAttemptAt: true, createdAt: true, errorMessage: true },
  });
  const latest = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) if (isCrmSend(a) && !latest.has(a.leadId)) latest.set(a.leadId, a);
  const now = new Date();
  const failed = [...latest.values()].filter(a => crmDeliveryStatus(a, now) === 'FAILED');
  if (failed.length === 0) return [];

  const [leads, adf] = await Promise.all([
    db.lead.findMany({
      where: { dealershipId, id: { in: failed.map(a => a.leadId) } },
      select: { id: true, contactName: true, vehicle: { select: { year: true, make: true, model: true, stockNumber: true } } },
    }),
    db.platformAccount.findFirst({ where: { dealershipId, platformSlug: ADF_SLUG }, select: { accountId: true } }),
  ]);
  const byId = new Map(leads.map(l => [l.id, l]));
  const crmAddress = adf?.accountId?.trim() ?? '';
  // Same preconditions sendLeadToCrm enforces, so the button is never offered when it would be refused.
  const disabledReason = !EMAIL_PATTERN.test(crmAddress)
    ? 'No CRM lead email is set. Copy each lead into your CRM, or add the address on ADF/XML Lead Routing.'
    : !realEmailDeliveryEnabled(env)
      ? 'Email sending is not set up on this StarterGrid server. Copy each lead into your CRM by hand.'
      : null;

  return [item({
    key: 'leads:crm-delivery-failed', area: 'LEADS', kind: 'CRM_DELIVERY_FAILED',
    severity: 'BLOCKING', owner: 'DEALERSHIP', ownerId: null,
    summary: `${plural(failed.length, 'lead', 'leads')} did not reach your CRM.`,
    nextAction: disabledReason ? 'Copy each lead into your CRM by hand.' : 'Retry sending each lead to your CRM.',
    action: 'RETRY_CRM_DELIVERY',
    disabledReason,
    records: failed.map(a => {
      const lead = byId.get(a.leadId);
      const v = lead?.vehicle;
      return {
        type: 'LEAD', id: a.leadId,
        label: [lead?.contactName ?? 'Unnamed buyer', v ? `${v.year} ${v.make} ${v.model} #${v.stockNumber}` : null].filter(Boolean).join(' · '),
        detail: a.errorMessage, channel: null, vehicleId: null,
      };
    }),
  })];
}

// ── Assembly ─────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<AttentionSeverity, number> = { BLOCKING: 0, WARNING: 1, WAITING: 2 };

export async function getAttention(
  db: PrismaClient,
  dealershipId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<AttentionResponse> {
  const sources: Array<[AttentionArea, () => Promise<AttentionItem[]>]> = [
    ['VEHICLES', () => vehicleItems(db, dealershipId)],
    ['REMOVALS', () => removalItems(db, dealershipId)],
    ['CHANNELS', () => channelItems(db, dealershipId)],
    ['LEADS', () => leadItems(db, dealershipId, env)],
    ['LEADS', async () => {
      const leads = await db.lead.findMany({ where: { dealershipId, workflowStatus: 'NEW' }, orderBy: { createdAt: 'asc' } });
      return leads.length ? [item({ key: 'leads:unanswered', area: 'LEADS', kind: 'UNANSWERED_INQUIRY', severity: 'WARNING', owner: 'DEALERSHIP', ownerId: null, summary: `${leads.length} inquiries await a response`, nextAction: 'Review the inbox and record the next step.', action: 'OPEN_LEADS', records: leads.map(l => ({ type: 'LEAD' as const, id: l.id, label: l.contactName || 'Buyer inquiry', detail: null, channel: l.platformSlug, vehicleId: l.vehicleId })) })] : [];
    }],
  ];
  const settled = await Promise.allSettled(sources.map(([, load]) => load()));
  const unavailableAreas: AttentionArea[] = [];
  const items: AttentionItem[] = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') items.push(...result.value);
    else {
      unavailableAreas.push(sources[i]![0]);
      console.error(`[attention] ${sources[i]![0]} failed for ${dealershipId}:`, result.reason);
    }
  });

  items.sort((a, b) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    || Number(b.owner === 'DEALERSHIP') - Number(a.owner === 'DEALERSHIP')
    || b.count - a.count);

  return {
    dealershipId,
    generatedAt: new Date().toISOString(),
    counts: {
      total: items.length,
      blocking: items.filter(i => i.severity === 'BLOCKING').length,
      dealershipActions: items.filter(i => i.owner === 'DEALERSHIP' && i.action.enabled).length,
      waiting: items.filter(i => i.severity === 'WAITING').length,
    },
    items,
    unavailableAreas,
  };
}
