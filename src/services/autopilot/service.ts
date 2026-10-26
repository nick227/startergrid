import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient, type DistributionTarget } from '@prisma/client';
import { platformProfiles } from '../../data/platformProfiles.js';
import { isPlatformAllowedForCategory } from '../../data/platformCategoryMap.js';
import { getMarketplaceVehicle } from '../marketplace/marketplaceQueryService.js';
import { qualifyChannel } from './capabilities.js';
import { defaultPolicy, idempotencyKey, removalGuard, snapshotHash, validatePolicy } from './policy.js';
import { decideDistribution, evidenceStatus } from './decisions.js';
import { DISTRIBUTION_CONTRACT_VERSION, type AutopilotPolicy, type ChannelCapability, type DistributionOutcome,
  type AutopilotSummary, type VehicleSnapshot, type PublicationEvidence } from './contracts.js';

export type DistributionDb = PrismaClient | Prisma.TransactionClient;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export const OWNED_CHANNEL = 'consumer-marketplace';
export const autopilotEnabled = () => process.env['V5_AUTOPILOT_ENABLED'] === 'true';

export async function readPolicy(db: DistributionDb, dealershipId: string): Promise<AutopilotPolicy> {
  const row = await db.autopilotPolicy.findUnique({ where: { dealershipId } });
  if (!row) return defaultPolicy(dealershipId);
  return { ...row, mode: row.mode as AutopilotPolicy['mode'], safeguards: row.safeguards as unknown as AutopilotPolicy['safeguards'],
    includedChannels: row.includedChannels as string[], excludedVehicleIds: row.excludedVehicleIds as string[], updatedAt: row.updatedAt.toISOString() };
}

export async function capabilitiesForDealer(db: DistributionDb, dealershipId: string): Promise<ChannelCapability[]> {
  const dealer = await db.dealershipProfile.findUniqueOrThrow({ where: { id: dealershipId } });
  const [accounts, site, tokens] = await Promise.all([
    db.platformAccount.findMany({ where: { dealershipId } }), db.platformSiteAvailability.findMany(),
    db.platformOAuthToken.findMany({ where: { dealershipId }, select: { provider: true } }),
  ]);
  return platformProfiles.filter(p => isPlatformAllowedForCategory(p.slug, dealer.businessCategory)).map(p => qualifyChannel(p.slug, {
    siteEnabled: site.find(s => s.platformSlug === p.slug)?.siteEnabled !== false,
    categorySupported: true,
    ownedPublisherAvailable: autopilotEnabled(),
    providerConfigured: Boolean(accounts.find(a => a.platformSlug === p.slug)?.connectionConfig) ||
      Boolean(p.oauthProvider && tokens.some(t => t.provider === p.oauthProvider)),
  }));
}

export async function updatePolicy(db: PrismaClient, policy: AutopilotPolicy, actor: { id: string; email: string }): Promise<AutopilotPolicy> {
  const capabilities = await capabilitiesForDealer(db, policy.dealershipId);
  const errors = validatePolicy(policy, capabilities);
  if (errors.length) throw new Error(errors.join(' '));
  const excluded = await db.vehicle.count({ where: { dealershipId: policy.dealershipId, id: { in: policy.excludedVehicleIds } } });
  if (excluded !== policy.excludedVehicleIds.length) throw new Error('Excluded vehicles must belong to this dealership.');
  await db.$transaction(async tx => {
    const data = { mode: policy.mode, includedChannels: json(policy.includedChannels), excludedVehicleIds: json(policy.excludedVehicleIds),
      safeguards: json(policy.safeguards), updatedBy: actor.id, version: policy.version + 1 };
    if (policy.version === 0) await tx.autopilotPolicy.create({ data: { dealershipId: policy.dealershipId, ...data } });
    else {
      const result = await tx.autopilotPolicy.updateMany({ where: { dealershipId: policy.dealershipId, version: policy.version }, data });
      if (!result.count) throw new Error('Policy changed. Reload before saving.');
    }
    // Onboarding preference is intent, not sufficient authority to start dispatch.
    await tx.dealershipProfile.update({ where: { id: policy.dealershipId }, data: { autopilotPreference: policy.mode } });
    await tx.adminAuditLog.create({ data: { action: 'AUTOPILOT_POLICY_UPDATED', actorId: actor.id, actorEmail: actor.email,
      detail: json({ dealershipId: policy.dealershipId, ...data }) } });
  });
  return readPolicy(db, policy.dealershipId);
}

export function toOutcome(row: DistributionTarget, now = new Date(), evidenceMaxAgeMs = 3_600_000): DistributionOutcome {
  const evidence = row.evidence as unknown as PublicationEvidence | null;
  let status = row.status as DistributionOutcome['status'];
  if (status === 'VERIFIED_LIVE' || status === 'VERIFIED_REMOVED') {
    status = evidenceStatus(evidence, { ...row, operation: row.operation as 'UPSERT' | 'WITHDRAW' }, now, evidenceMaxAgeMs);
  }
  return { dealershipId: row.dealershipId, vehicleId: row.vehicleId, channel: row.channel, generation: row.generation,
    desiredHash: row.desiredHash, operation: row.operation as 'UPSERT' | 'WITHDRAW', status, reasonCode: row.reasonCode,
    nextAction: status === 'UNKNOWN' ? 'Wait for a fresh destination check or ask support to verify.' : row.nextAction,
    owner: status === 'UNKNOWN' ? 'INTERNAL_SUPPORT' : row.owner as DistributionOutcome['owner'], attemptCount: row.attemptCount,
    nextAttemptAt: row.nextAttemptAt?.toISOString() ?? null, submittedAt: row.submittedAt?.toISOString() ?? null,
    evidence, updatedAt: row.updatedAt.toISOString() };
}

export async function summary(db: DistributionDb, dealershipId: string): Promise<AutopilotSummary> {
  const [policy, capabilities, rows, openIncidents] = await Promise.all([
    readPolicy(db, dealershipId), capabilitiesForDealer(db, dealershipId),
    db.distributionTarget.findMany({ where: { dealershipId } }),
    db.distributionIncident.count({ where: { dealershipId, state: { not: 'RESOLVED' } } }),
  ]);
  const counts: AutopilotSummary['counts'] = {};
  for (const row of rows) { const { status } = toOutcome(row, new Date(), policy.safeguards.evidenceMaxAgeMs); counts[status] = (counts[status] ?? 0) + 1; }
  const qualified = policy.includedChannels.filter(c => capabilities.some(x => x.channel === c && x.qualification === 'VERIFIED_AUTOMATIC')).length;
  const coverage = policy.mode === 'OFF' ? 'OFF' : policy.mode === 'PAUSED' ? 'PAUSED'
    : !qualified ? 'UNAVAILABLE' : qualified < policy.includedChannels.length ? 'PARTIAL' : 'FULL';
  return { contractVersion: DISTRIBUTION_CONTRACT_VERSION, policy, capabilities, coverage, counts, openIncidents, generatedAt: new Date().toISOString() };
}

export async function upsertIncident(db: DistributionDb, target: Pick<DistributionTarget, 'id' | 'dealershipId' | 'vehicleId' | 'channel' | 'desiredHash'>,
  reasonCode: string, nextAction: string, owner: string, evidence: Record<string, unknown> = {}, critical = false): Promise<void> {
  const key = createHash('sha256').update(`${target.id}:${reasonCode}`).digest('hex');
  const data = { dealershipId: target.dealershipId, channel: target.channel, vehicleId: target.vehicleId, targetId: target.id,
    reasonCode, severity: critical ? 'CRITICAL' : 'WARNING', businessImpact: critical ? 'A sold or removed vehicle may remain advertised.' : 'Selected inventory is not confirmed current.',
    owner, description: nextAction, nextAction, technicalEvidence: json({ desiredHash: target.desiredHash, ...evidence }),
    state: 'OPEN', verificationState: 'UNVERIFIED', resolvedAt: null };
  await db.distributionIncident.upsert({ where: { key }, create: { key, ...data }, update: data });
}

type VehicleRow = Prisma.VehicleGetPayload<{ include: { media: true } }>;
export function vehicleSnapshot(v: VehicleRow): VehicleSnapshot {
  return { dealershipId: v.dealershipId, vehicleId: v.id, sourceRevision: v.updatedAt.toISOString(), stockNumber: v.stockNumber,
    year: v.year, make: v.make, model: v.model, priceCents: v.priceCents,
    listingStatus: v.listingStatus === 'READY' ? 'READY' : 'DRAFT',
    sold: v.soldAt !== null, removed: v.removedAt !== null,
    photos: [...v.media].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)).map(m => m.url),
    details: json({ trim: v.trim, mileage: v.mileage, condition: v.condition, exteriorColor: v.exteriorColor,
      interiorColor: v.interiorColor, bodyStyle: v.bodyStyle, drivetrain: v.drivetrain, fuelType: v.fuelType,
      transmission: v.transmission, options: v.options, categoryPayload: v.categoryPayload,
      media: v.media.map(m => ({ id: m.id, kind: m.kind, url: m.url, sortOrder: m.sortOrder, slot: m.mediaSlotKey }))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)) }) as VehicleSnapshot['details'] };
}

/** Owned publisher uses one DB transaction: listing effect, authoritative readback,
 * outcome and event commit together. No external HTTP or mock dispatch path. */
export async function publishOwned(tx: Prisma.TransactionClient, target: DistributionTarget, snapshot: VehicleSnapshot): Promise<PublicationEvidence> {
  if (target.channel !== OWNED_CHANNEL) throw new Error('No qualified automatic external publisher is installed.');
  const operation = target.operation as 'UPSERT' | 'WITHDRAW';
  if (operation === 'WITHDRAW') {
    await tx.marketplaceListing.updateMany({ where: { dealershipId: target.dealershipId, vehicleId: target.vehicleId, platformSlug: OWNED_CHANNEL },
      data: { status: 'ENDED', endedAt: new Date(), errorMessage: null } });
  } else {
    await tx.marketplaceListing.upsert({ where: { vehicleId_platformSlug: { vehicleId: target.vehicleId, platformSlug: OWNED_CHANNEL } },
      create: { dealershipId: target.dealershipId, vehicleId: target.vehicleId, platformSlug: OWNED_CHANNEL, status: 'ACTIVE', listedAt: new Date() },
      update: { status: 'ACTIVE', endedAt: null, errorMessage: null } });
  }
  const publicVehicle = await getMarketplaceVehicle(tx as PrismaClient, target.vehicleId);
  const observed = await tx.vehicle.findUnique({ where: { id: target.vehicleId }, include: { media: true } });
  const matches = observed && snapshotHash(vehicleSnapshot(observed)) === target.desiredHash;
  return { channel: OWNED_CHANNEL, vehicleId: target.vehicleId, desiredHash: target.desiredHash, operation,
    method: 'OWNED_READ_MODEL', observedAt: new Date().toISOString(),
    result: operation === 'WITHDRAW' ? (!publicVehicle ? 'REMOVED' : 'MISMATCH') : publicVehicle && matches ? 'LIVE' : 'MISMATCH',
    reference: `marketplace:${snapshot.vehicleId}:${target.generation}` };
}

/** Durable reconciliation: every persisted vehicle/media change is discoverable
 * after restart, including bulk imports and writes that bypass debounce hooks.
 * The policy row lock serializes concurrent workers for this dealership. */
export async function reconcileDealer(db: PrismaClient, dealershipId: string): Promise<{ processed: number; verified: number }> {
  return db.$transaction(async tx => {
    const locks = await tx.$queryRaw<Array<{ dealershipId: string }>>`SELECT dealershipId FROM AutopilotPolicy WHERE dealershipId = ${dealershipId} FOR UPDATE`;
    if (!locks.length) return { processed: 0, verified: 0 };
    const policy = await readPolicy(tx, dealershipId);
    const dealer = await tx.dealershipProfile.findUnique({ where: { id: dealershipId } });
    if (!dealer) return { processed: 0, verified: 0 };
    // Onboarding can pause/disable immediately, but cannot independently enable delivery.
    if (dealer.autopilotPreference !== 'ON') policy.mode = dealer.autopilotPreference;
    const capabilities = await capabilitiesForDealer(tx, dealershipId);
    const [vehicles, prior, accounts, deselections] = await Promise.all([
      tx.vehicle.findMany({ where: { dealershipId }, include: { media: true } }),
      tx.distributionTarget.findMany({ where: { dealershipId } }),
      tx.platformAccount.findMany({ where: { dealershipId } }),
      tx.vehicleChannelSelection.findMany({ where: { dealershipId, selected: false } }),
    ]);
    const channels = new Set([...policy.includedChannels, ...prior.map(p => p.channel)]);
    let processed = 0, verified = 0;
    for (const channel of channels) {
      const channelPrior = prior.filter(p => p.channel === channel && p.verifiedSnapshot !== null);
      const removalCount = channelPrior.filter(p => vehicles.some(v => v.id === p.vehicleId && (v.soldAt || v.removedAt))).length;
      const massRemovalHeld = removalGuard(removalCount, channelPrior.length, policy.safeguards);
      for (const vehicle of vehicles) {
        const snapshot = vehicleSnapshot(vehicle), desiredHash = snapshotHash(snapshot);
        const previous = prior.find(p => p.vehicleId === vehicle.id && p.channel === channel);
        const changed = !previous || previous.desiredHash !== desiredHash;
        const generation = changed ? (previous?.generation ?? 0) + 1 : previous.generation;
        const c = capabilities.find(c => c.channel === channel) ?? qualifyChannel(channel, { siteEnabled: false, categorySupported: false, providerConfigured: false, ownedPublisherAvailable: false });
        const account = accounts.find(a => a.platformSlug === channel);
        const decision = decideDistribution({ policy, vehicle: snapshot, capability: c,
          connected: Boolean(account?.dealerEnabled && account.state === 'ACTIVE'),
          selected: !deselections.some(d => d.vehicleId === vehicle.id && d.channelKey === channel),
          previouslyManaged: previous?.verifiedSnapshot != null, verifiedSnapshot: previous?.verifiedSnapshot as unknown as VehicleSnapshot | null ?? null,
          massRemovalHeld, approvedHash: changed ? null : previous?.approvedHash ?? null });
        if (!changed && decision.dispatch && previous && ['VERIFIED_LIVE', 'VERIFIED_REMOVED'].includes(previous.status) &&
            toOutcome(previous, new Date(), policy.safeguards.evidenceMaxAgeMs).status === previous.status) continue;
        if (!changed && decision.dispatch && previous?.nextAttemptAt && previous.nextAttemptAt > new Date()) continue;
        if (!changed && decision.dispatch && previous && previous.attemptCount >= policy.safeguards.maxAttempts) continue;
        const target = await tx.distributionTarget.upsert({
          where: { dealershipId_vehicleId_channel: { dealershipId, vehicleId: vehicle.id, channel } },
          create: { dealershipId, vehicleId: vehicle.id, channel, desiredHash, snapshot: json(snapshot), generation,
            operation: decision.operation, status: decision.status, reasonCode: decision.reasonCode, nextAction: decision.nextAction, owner: decision.owner },
          update: { desiredHash, snapshot: json(snapshot), generation, operation: decision.operation, status: decision.status,
            reasonCode: decision.reasonCode, nextAction: decision.nextAction, owner: decision.owner,
            ...(changed ? { attemptCount: 0, nextAttemptAt: null, approvedHash: null, evidence: Prisma.DbNull, submittedAt: null } : {}) },
        });
        processed++;
        if (!decision.dispatch) {
          if (['NEEDS_SETUP', 'NEEDS_VEHICLE_INFORMATION', 'FAILED', 'HELD'].includes(decision.status))
            await upsertIncident(tx, target, decision.reasonCode!, decision.nextAction!, decision.owner, {}, decision.operation === 'WITHDRAW');
          continue;
        }
        const evidence = await publishOwned(tx, target, snapshot);
        const status = evidenceStatus(evidence, { ...target, operation: decision.operation }, new Date(), policy.safeguards.evidenceMaxAgeMs);
        const confirmed = status === 'VERIFIED_LIVE' || status === 'VERIFIED_REMOVED';
        await tx.distributionTarget.update({ where: { id: target.id }, data: { status, submittedAt: new Date(), evidence: json(evidence),
          attemptCount: { increment: 1 }, nextAttemptAt: confirmed ? null : new Date(Date.now() + policy.safeguards.retryBaseMs),
          nextAction: confirmed ? null : 'Ask support to check why the destination result differs.', owner: confirmed ? 'SYSTEM' : 'INTERNAL_SUPPORT',
          ...(confirmed ? { verifiedSnapshot: json(snapshot) } : {}) } });
        if (confirmed) {
          verified++;
          await tx.distributionIncident.updateMany({ where: { targetId: target.id, state: { not: 'RESOLVED' } },
            data: { state: 'RESOLVED', verificationState: 'VERIFIED', resolvedAt: new Date() } });
          await tx.syncEvent.create({ data: { dealershipId, vehicleId: vehicle.id, platformSlug: channel, kind: 'INVENTORY_CHANGE',
            payload: json({ autopilot: true, status, evidence, idempotencyKey: idempotencyKey(dealershipId, vehicle.id, channel, generation) }) } });
        } else await upsertIncident(tx, target, 'VERIFICATION_MISMATCH', 'Ask support to verify the public listing before retrying.', 'INTERNAL_SUPPORT', { evidence }, decision.operation === 'WITHDRAW');
      }
    }
    return { processed, verified };
  }, { timeout: 30_000, maxWait: 5_000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

export async function runAutopilot(db: PrismaClient): Promise<{ dealers: number; failed: number }> {
  if (!autopilotEnabled()) return { dealers: 0, failed: 0 };
  const policies = await db.autopilotPolicy.findMany({ select: { dealershipId: true } });
  let failed = 0;
  for (const { dealershipId } of policies) {
    try { await reconcileDealer(db, dealershipId); }
    catch (error) {
      failed++;
      // Transaction failure cannot commit half a listing effect. Persist an owned
      // incident outside the rolled-back transaction; next sweep retries safely.
      await upsertIncident(db, { id: `reconcile:${dealershipId}`, dealershipId, vehicleId: '', channel: OWNED_CHANNEL, desiredHash: '' },
        'RECONCILE_FAILED', 'Internal support should inspect the distribution worker and retry.', 'INTERNAL_SUPPORT',
        { errorType: error instanceof Error ? error.name : 'Unknown' });
    }
  }
  return { dealers: policies.length, failed };
}
