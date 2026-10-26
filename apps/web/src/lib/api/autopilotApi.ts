import type { V5AutopilotSummary, V5DistributionIncident } from '@auto-dealer/api-client';
export type { V5AutopilotSummary, V5DistributionIncident };
export async function distributionRequest<T>(dealerId: string, suffix: string, body?: object, method = 'POST'): Promise<T> {
  const response = await fetch('/api/dealers/' + encodeURIComponent(dealerId) + suffix, {
    credentials: 'include', ...(body !== undefined ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(response.status === 503 ? 'Autopilot is not enabled on this server.' : typeof data.error === 'string' ? data.error : 'Unable to update distribution.');
  return data as T;
}
export function saveAutopilot(dealerId: string, summary: V5AutopilotSummary, patch: { mode?: 'OFF' | 'ON' | 'PAUSED'; includedChannels?: string[] }) {
  const p = summary.policy;
  return distributionRequest(dealerId, '/autopilot', { expectedVersion: p.version, mode: p.mode,
    includedChannels: p.includedChannels, excludedVehicleIds: p.excludedVehicleIds, safeguards: p.safeguards, ...patch }, 'PUT');
}
