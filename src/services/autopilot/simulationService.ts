import type { PrismaClient } from '@prisma/client';
import { platformProfiles } from '../../data/platformProfiles.js';
import { capabilitiesForDealer, readPolicy, vehicleSnapshot } from './service.js';
import { snapshotHash, removalGuard } from './policy.js';
import { decideDistribution } from './decisions.js';
import type { IncidentOwner, VehicleSnapshot } from './contracts.js';

export interface ChannelBlockerSummary {
  reasonCode: string;
  message: string;
  owner: IncidentOwner;
  vehicleCount: number;
  sampleStockNumbers: string[];
}

export interface ChannelSimulation {
  channel: string;
  name: string;
  connected: boolean;
  qualification: string;
  eligibleCount: number;
  blockedCount: number;
  scheduledUpserts: number;
  scheduledWithdraws: number;
  blockers: ChannelBlockerSummary[];
}

export interface HeldVehicleItem {
  vehicleId: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  reasonCode: string;
  nextAction: string;
  owner: IncidentOwner;
  channel: string;
}

export interface AutopilotSimulationResult {
  dealershipId: string;
  dealerName: string;
  evaluatedAt: string;
  simulatedMode: 'ON' | 'OFF' | 'PAUSED';
  currentMode: 'ON' | 'OFF' | 'PAUSED';
  summary: {
    totalInventory: number;
    qualifiedCount: number;
    heldCount: number;
    needsAttentionCount: number;
    scheduledOperations: {
      upsert: number;
      withdraw: number;
    };
  };
  channels: ChannelSimulation[];
  heldVehicles: HeldVehicleItem[];
}

export async function simulateAutopilotDistribution(
  db: PrismaClient,
  dealershipId: string,
  opts: { mode?: 'ON' | 'OFF' | 'PAUSED'; includedChannels?: string[] } = {},
): Promise<AutopilotSimulationResult> {
  const [dealer, currentPolicy, capabilities, accounts, deselections, priorTargets, vehicles, approvals] =
    await Promise.all([
      db.dealershipProfile.findUniqueOrThrow({ where: { id: dealershipId } }),
      readPolicy(db, dealershipId),
      capabilitiesForDealer(db, dealershipId),
      db.platformAccount.findMany({ where: { dealershipId } }).catch(() => []),
      db.vehicleChannelSelection.findMany({ where: { dealershipId, selected: false } }).catch(() => []),
      db.distributionTarget.findMany({ where: { dealershipId } }).catch(() => []),
      db.vehicle.findMany({
        where: { dealershipId },
        include: { media: true },
        orderBy: [{ updatedAt: 'desc' }],
      }),
      db.distributionIncident.findMany({
        where: { dealershipId, reasonCode: 'MASS_REMOVAL', state: 'RESOLVED' },
      }).catch(() => []),
    ]);

  const simulatedMode = opts.mode ?? 'ON';
  const simulatedIncludedChannels = opts.includedChannels ?? (
    currentPolicy.includedChannels.length > 0
      ? currentPolicy.includedChannels
      : capabilities.filter(c => c.qualification === 'VERIFIED_AUTOMATIC' || c.qualification === 'CONFIGURED_UNVERIFIED').map(c => c.channel)
  );

  const policy = {
    ...currentPolicy,
    mode: simulatedMode,
    includedChannels: simulatedIncludedChannels,
  };

  const channelSimulations: ChannelSimulation[] = [];
  const heldVehiclesMap = new Map<string, HeldVehicleItem>();
  const qualifiedVehicleIds = new Set<string>();
  const heldVehicleIds = new Set<string>();
  const needsAttentionVehicleIds = new Set<string>();

  let totalScheduledUpserts = 0;
  let totalScheduledWithdraws = 0;

  const channels = new Set([...policy.includedChannels, ...priorTargets.map(p => p.channel)]);

  for (const channel of channels) {
    const profile = platformProfiles.find(p => p.slug === channel);
    const channelName = profile?.name ?? channel;
    const capability = capabilities.find(c => c.channel === channel);
    const account = accounts.find(a => a.platformSlug === channel);
    const isConnected = Boolean(account?.dealerEnabled && account.state === 'ACTIVE');

    // Identical to service.ts: channelPrior only counts active verified targets for mass removal protection
    const channelPriorActive = priorTargets.filter(
      p => p.channel === channel && p.verifiedSnapshot !== null &&
      !(p.verifiedSnapshot as unknown as VehicleSnapshot).sold &&
      !(p.verifiedSnapshot as unknown as VehicleSnapshot).removed
    );
    const removalCount = channelPriorActive.filter(p => vehicles.some(v => v.id === p.vehicleId && (v.soldAt || v.removedAt))).length;
    const massRemovalHeld = removalGuard(removalCount, channelPriorActive.length, policy.safeguards);

    let scheduledUpserts = 0;
    let scheduledWithdraws = 0;
    let eligibleCount = 0;
    let blockedCount = 0;

    const blockerMap = new Map<string, {
      reasonCode: string;
      message: string;
      owner: IncidentOwner;
      vehicleCount: number;
      stocks: Set<string>;
    }>();

    for (const vehicle of vehicles) {
      const snapshot = vehicleSnapshot(vehicle);
      const previous = priorTargets.find(p => p.vehicleId === vehicle.id && p.channel === channel);
      const isSelected = !deselections.some(d => d.vehicleId === vehicle.id && d.channelKey === channel);

      const decision = decideDistribution({
        policy,
        vehicle: snapshot,
        capability: capability ?? { channel, qualification: 'UNAVAILABLE', operations: [], canVerify: false, evidenceReference: null, reason: 'Channel unavailable' },
        connected: isConnected,
        selected: isSelected,
        previouslyManaged: previous?.verifiedSnapshot != null,
        verifiedSnapshot: (previous?.verifiedSnapshot as unknown as VehicleSnapshot) ?? null,
        massRemovalHeld: massRemovalHeld && !approvals.some(a => {
          const e = a.technicalEvidence as { approvedVehicleIds?: string[]; approvalExpiresAt?: string };
          return e.approvalExpiresAt && Date.parse(e.approvalExpiresAt) > Date.now() && e.approvedVehicleIds?.includes(vehicle.id);
        }),
        approvedHash: previous?.approvedHash ?? null,
      });

      if (decision.dispatch) {
        eligibleCount++;
        qualifiedVehicleIds.add(vehicle.id);
        if (decision.operation === 'UPSERT') {
          scheduledUpserts++;
          totalScheduledUpserts++;
        } else {
          scheduledWithdraws++;
          totalScheduledWithdraws++;
        }
      } else {
        // Blocked or not selected
        if (['NEEDS_VEHICLE_INFORMATION', 'HELD', 'NEEDS_SETUP', 'FAILED'].includes(decision.status)) {
          blockedCount++;
          if (decision.status === 'HELD') {
            heldVehicleIds.add(vehicle.id);
          } else {
            needsAttentionVehicleIds.add(vehicle.id);
          }

          const reason = decision.reasonCode ?? decision.status;
          const currentBlocker = blockerMap.get(reason) ?? {
            reasonCode: reason,
            message: decision.nextAction ?? 'Requires resolution before publishing',
            owner: decision.owner,
            vehicleCount: 0,
            stocks: new Set<string>(),
          };
          currentBlocker.vehicleCount++;
          if (currentBlocker.stocks.size < 5) {
            currentBlocker.stocks.add(vehicle.stockNumber);
          }
          blockerMap.set(reason, currentBlocker);

          if (!heldVehiclesMap.has(vehicle.id)) {
            heldVehiclesMap.set(vehicle.id, {
              vehicleId: vehicle.id,
              stockNumber: vehicle.stockNumber,
              year: vehicle.year,
              make: vehicle.make,
              model: vehicle.model,
              reasonCode: reason,
              nextAction: decision.nextAction ?? 'Resolve vehicle details',
              owner: decision.owner,
              channel: channelName,
            });
          }
        }
      }
    }

    if (policy.includedChannels.includes(channel) || scheduledWithdraws > 0 || scheduledUpserts > 0) {
      channelSimulations.push({
        channel,
        name: channelName,
        connected: isConnected,
        qualification: capability?.qualification ?? 'UNAVAILABLE',
        eligibleCount,
        blockedCount,
        scheduledUpserts,
        scheduledWithdraws,
        blockers: Array.from(blockerMap.values()).map(b => ({
          reasonCode: b.reasonCode,
          message: b.message,
          owner: b.owner,
          vehicleCount: b.vehicleCount,
          sampleStockNumbers: Array.from(b.stocks),
        })),
      });
    }
  }

  return {
    dealershipId,
    dealerName: dealer.dbaName ?? dealer.legalName,
    evaluatedAt: new Date().toISOString(),
    simulatedMode,
    currentMode: currentPolicy.mode,
    summary: {
      totalInventory: vehicles.length,
      qualifiedCount: qualifiedVehicleIds.size,
      heldCount: heldVehicleIds.size,
      needsAttentionCount: needsAttentionVehicleIds.size,
      scheduledOperations: {
        upsert: totalScheduledUpserts,
        withdraw: totalScheduledWithdraws,
      },
    },
    channels: channelSimulations,
    heldVehicles: Array.from(heldVehiclesMap.values()),
  };
}
