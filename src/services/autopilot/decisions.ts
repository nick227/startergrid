import type { AutopilotPolicy, ChannelCapability, DistributionOperation, DistributionStatus, IncidentOwner, PublicationEvidence, VehicleSnapshot } from './contracts.js';
import { snapshotHash, vehicleInformationErrors } from './policy.js';

export interface Decision {
  operation: DistributionOperation;
  status: DistributionStatus;
  reasonCode: string | null;
  nextAction: string | null;
  owner: IncidentOwner;
  dispatch: boolean;
}
export interface DecisionInput {
  policy: AutopilotPolicy;
  vehicle: VehicleSnapshot;
  capability: ChannelCapability;
  connected: boolean;
  selected: boolean;
  previouslyManaged: boolean;
  verifiedSnapshot: VehicleSnapshot | null;
  massRemovalHeld: boolean;
  approvedHash: string | null;
}

export function decideDistribution(input: DecisionInput): Decision {
  const { policy, vehicle: v, capability: c } = input;
  const operation = v.sold || v.removed ? 'WITHDRAW' : 'UPSERT';
  const stop = (status: DistributionStatus, reasonCode: string, nextAction: string, owner: IncidentOwner): Decision =>
    ({ operation, status, reasonCode, nextAction, owner, dispatch: false });
  if (v.dealershipId !== policy.dealershipId) return stop('FAILED', 'SCOPE_MISMATCH', 'Contact support to correct the inventory scope.', 'INTERNAL_SUPPORT');
  // Lifecycle removal continues for managed listings even when promotion is paused/excluded.
  if (operation === 'WITHDRAW' && !input.previouslyManaged) return stop('EXCLUDED', 'NOT_MANAGED', 'No automatic listing exists to withdraw.', 'SYSTEM');
  if (operation === 'UPSERT') {
    if (!policy.includedChannels.includes(c.channel) || policy.excludedVehicleIds.includes(v.vehicleId) || !input.selected)
      return stop('EXCLUDED', 'NOT_SELECTED', 'Include this vehicle and channel to distribute automatically.', 'DEALERSHIP');
    if (policy.mode !== 'ON') return stop('PAUSED', `AUTOPILOT_${policy.mode}`, 'Turn on Autopilot to distribute eligible changes.', 'DEALERSHIP');
  }
  if (c.qualification !== 'VERIFIED_AUTOMATIC' || !c.canVerify || !c.operations.includes(operation)) {
    return stop('NEEDS_SETUP', 'CHANNEL_UNQUALIFIED', operation === 'WITHDRAW'
      ? 'Ask support to confirm removal with the destination.' : c.reason,
    c.qualification === 'PARTNER_ASSISTED' ? 'PARTNER' : 'INTERNAL_SUPPORT');
  }
  if (!input.connected) return stop('NEEDS_SETUP', 'CONNECTION_REQUIRED', 'Reconnect or enable this destination, then retry.', 'DEALERSHIP');
  const approved = input.approvedHash === snapshotHash(v);
  if (operation === 'WITHDRAW' && input.massRemovalHeld && !approved)
    return stop('HELD', 'MASS_REMOVAL', 'Have an internal operator review this removal batch.', 'INTERNAL_SUPPORT');
  if (operation === 'UPSERT') {
    const errors = vehicleInformationErrors(v, policy.safeguards);
    if (errors.length) return stop('NEEDS_VEHICLE_INFORMATION', 'VEHICLE_INFORMATION', errors.join(' '), 'DEALERSHIP');
    const oldPrice = input.verifiedSnapshot?.priceCents;
    if (!approved && oldPrice && Math.abs(v.priceCents - oldPrice) / oldPrice > policy.safeguards.maxPriceChangeFraction)
      return stop('HELD', 'PRICE_CHANGE', 'Have an internal operator confirm this unusually large price change.', 'INTERNAL_SUPPORT');
  }
  return { operation, status: 'PROCESSING', reasonCode: null, nextAction: 'Wait for destination verification.', owner: 'SYSTEM', dispatch: true };
}

export function evidenceStatus(
  evidence: PublicationEvidence | null, expected: { channel: string; vehicleId: string; desiredHash: string; operation: DistributionOperation },
  now: Date, maxAgeMs: number,
): DistributionStatus {
  if (!evidence) return 'SUBMITTED';
  const age = now.getTime() - Date.parse(evidence.observedAt);
  if (!Number.isFinite(age) || age < 0 || age > maxAgeMs || !evidence.reference ||
      evidence.channel !== expected.channel || evidence.vehicleId !== expected.vehicleId ||
      evidence.desiredHash !== expected.desiredHash || evidence.operation !== expected.operation) return 'UNKNOWN';
  if (evidence.result === 'PENDING') return 'SUBMITTED';
  if (evidence.result === 'MISMATCH') return 'UNKNOWN';
  if (expected.operation === 'UPSERT' && evidence.result === 'LIVE') return 'VERIFIED_LIVE';
  if (expected.operation === 'WITHDRAW' && evidence.result === 'REMOVED') return 'VERIFIED_REMOVED';
  return 'UNKNOWN';
}

export class DistributionFailure extends Error {
  constructor(public readonly code: 'TRANSIENT' | 'CREDENTIALS' | 'INVALID_DATA' | 'UNCERTAIN', message: string,
    public readonly retryAfterMs?: number) { super(message); }
}

export function failureDecision(error: unknown, attempt: number, policy: AutopilotPolicy, now: Date, jitter = Math.random()): {
  status: DistributionStatus; reasonCode: string; owner: IncidentOwner; nextAction: string; nextAttemptAt: Date | null;
} {
  const code = error instanceof DistributionFailure ? error.code : 'UNCERTAIN';
  if (code === 'CREDENTIALS') return { status: 'NEEDS_SETUP', reasonCode: code, owner: 'DEALERSHIP', nextAction: 'Reconnect the account, then retry.', nextAttemptAt: null };
  if (code === 'INVALID_DATA') return { status: 'NEEDS_VEHICLE_INFORMATION', reasonCode: code, owner: 'DEALERSHIP', nextAction: 'Correct the vehicle information, then retry.', nextAttemptAt: null };
  if (code === 'TRANSIENT' && attempt < policy.safeguards.maxAttempts) {
    const delay = Math.min(policy.safeguards.retryMaxMs, policy.safeguards.retryBaseMs * 2 ** Math.max(0, attempt - 1));
    const retryAfter = error instanceof DistributionFailure ? error.retryAfterMs ?? 0 : 0;
    return { status: 'FAILED', reasonCode: code, owner: 'SYSTEM', nextAction: 'Automatic retry is scheduled.',
      nextAttemptAt: new Date(now.getTime() + Math.max(retryAfter, Math.round(delay * (0.8 + 0.4 * Math.max(0, Math.min(1, jitter)))))) };
  }
  return { status: code === 'UNCERTAIN' ? 'UNKNOWN' : 'FAILED', reasonCode: code,
    owner: 'INTERNAL_SUPPORT', nextAction: 'Review destination evidence before retrying; the outcome is not confirmed.', nextAttemptAt: null };
}
