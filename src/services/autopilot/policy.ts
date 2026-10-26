import { createHash } from 'node:crypto';
import type { AutopilotPolicy, AutopilotSafeguards, ChannelCapability, VehicleSnapshot } from './contracts.js';

export const DEFAULT_SAFEGUARDS: Readonly<AutopilotSafeguards> = Object.freeze({
  maxPriceChangeFraction: 0.3,
  minPriceCents: 100,
  maxRemovalCount: 10,
  minRemovalBatchSize: 3,
  maxRemovalFraction: 0.25,
  maxAttempts: 5,
  retryBaseMs: 30_000,
  retryMaxMs: 3_600_000,
  verificationTimeoutMs: 15 * 60_000,
  evidenceMaxAgeMs: 60 * 60_000,
});

export function defaultPolicy(dealershipId: string): AutopilotPolicy {
  return { dealershipId, mode: 'OFF', version: 0, includedChannels: [], excludedVehicleIds: [],
    safeguards: { ...DEFAULT_SAFEGUARDS }, updatedAt: new Date(0).toISOString(), updatedBy: 'system' };
}

/** Fail closed; never silently turn malformed persisted data into permissive policy. */
export function validatePolicy(policy: AutopilotPolicy, capabilities: ChannelCapability[]): string[] {
  const errors: string[] = [];
  if (!['OFF', 'ON', 'PAUSED'].includes(policy.mode)) errors.push('Invalid Autopilot mode.');
  if (!policy.dealershipId || !Number.isSafeInteger(policy.version) || policy.version < 0) errors.push('Invalid policy identity/version.');
  for (const [key, value] of Object.entries(policy.safeguards)) {
    if (!Number.isFinite(value) || value <= 0) errors.push(`${key} must be a positive finite number.`);
  }
  for (const key of Object.keys(DEFAULT_SAFEGUARDS) as (keyof AutopilotSafeguards)[]) {
    if (!(key in policy.safeguards)) errors.push(`${key} is required.`);
  }
  if (policy.safeguards.maxRemovalFraction > 1) errors.push('maxRemovalFraction cannot exceed 1.');
  if (policy.safeguards.retryMaxMs < policy.safeguards.retryBaseMs) errors.push('retryMaxMs must be at least retryBaseMs.');
  for (const key of ['maxRemovalCount', 'minRemovalBatchSize', 'maxAttempts', 'minPriceCents'] as const) {
    if (!Number.isSafeInteger(policy.safeguards[key])) errors.push(`${key} must be an integer.`);
  }
  if (new Set(policy.includedChannels).size !== policy.includedChannels.length) errors.push('Channels must be unique.');
  if (new Set(policy.excludedVehicleIds).size !== policy.excludedVehicleIds.length) errors.push('Excluded vehicles must be unique.');
  if (policy.mode === 'ON' && policy.includedChannels.length === 0) errors.push('Select at least one qualified channel.');
  if (policy.mode === 'ON') {
    for (const slug of policy.includedChannels) {
      const c = capabilities.find(c => c.channel === slug);
      if (!c || c.qualification !== 'VERIFIED_AUTOMATIC' || !c.canVerify || !c.operations.includes('UPSERT')) {
        errors.push(`${slug} is not qualified for automatic distribution.`);
      }
    }
  }
  return errors;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Source timestamps do not manufacture publishing work for an unchanged item. */
export function snapshotHash(snapshot: VehicleSnapshot): string {
  const { sourceRevision: _revision, ...content } = snapshot;
  return createHash('sha256').update(canonical(content)).digest('hex');
}

export function idempotencyKey(dealershipId: string, vehicleId: string, channel: string, generation: number): string {
  return `v5:${createHash('sha256').update(JSON.stringify([dealershipId, vehicleId, channel, generation])).digest('hex')}`;
}

/** Evaluate the whole committed batch before dispatching any member. */
export function removalGuard(removalCount: number, managedCount: number, safeguards: AutopilotSafeguards): boolean {
  if (removalCount <= 0) return false;
  if (managedCount <= 0 || removalCount > managedCount) return true;
  return removalCount >= safeguards.maxRemovalCount ||
    (removalCount >= safeguards.minRemovalBatchSize && removalCount / managedCount >= safeguards.maxRemovalFraction);
}

export function vehicleInformationErrors(v: VehicleSnapshot, guards: AutopilotSafeguards): string[] {
  const errors: string[] = [];
  if (!v.stockNumber.trim()) errors.push('Add a stock number.');
  if (!v.make.trim() || !v.model.trim()) errors.push('Add the make and model.');
  if (!Number.isInteger(v.year) || v.year < 1886 || v.year > new Date().getUTCFullYear() + 2) errors.push('Correct the vehicle year.');
  if (!Number.isSafeInteger(v.priceCents) || v.priceCents < guards.minPriceCents) errors.push('Set a valid selling price.');
  if (!v.photos.length || v.photos.some(p => !p.trim())) errors.push('Add valid vehicle photos.');
  if (v.listingStatus !== 'READY') errors.push('Mark the vehicle ready to publish.');
  return errors;
}
