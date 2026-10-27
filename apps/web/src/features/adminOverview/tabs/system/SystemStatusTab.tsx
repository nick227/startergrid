import { SectionCard } from '@/components/operator/index.ts';
import type { AdminDashboardResponse } from '@/lib/api/admin.ts';
import {
  HEALTH_CFG,
  HEALTH_DEFAULT,
  READINESS_CFG,
  READINESS_DEFAULT,
} from '@/features/adminOverview/constants/statusConfig.ts';
import { formatDuration } from '@/features/adminOverview/utils/formatDuration.ts';
import { formatPendingAge, queueHealthGuidance } from '@/features/adminOverview/utils/queueHealthPresentation.ts';

type Props = {
  health: AdminDashboardResponse['health'] | undefined;
  readiness: AdminDashboardResponse['readiness'] | undefined;
  queueSnapshot: AdminDashboardResponse['queueSnapshot'] | undefined;
};

const HEALTH_TILES = [
  { key: 'api', label: 'Sign-in and pages', field: 'api' as const, hint: 'People can open StarterGrid' },
  { key: 'db', label: 'Dealership records', field: 'db' as const, hint: 'Names, vehicles, and people' },
  { key: 'queue', label: 'Sending vehicles', field: 'queue' as const, hint: 'Updates waiting to go out' },
  { key: 'credentials', label: 'Shared credentials', field: 'credentials' as const, hint: 'Site keys for destinations' },
] as const;

export function SystemStatusTab({ health, readiness, queueSnapshot }: Props) {
  const queueGuidance = queueHealthGuidance(health?.queue, queueSnapshot);
  const showQueueGuidance = health?.queue === 'backed_up' || health?.queue === 'unhealthy';

  return (
    <div className="space-y-5">
      <SectionCard
        title="Right now"
        subtitle="Green means staff and dealerships can work. Red or stalled means sending is blocked."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {HEALTH_TILES.map(item => {
            const value = health?.[item.field];
            const cfg = HEALTH_CFG[value ?? ''] ?? HEALTH_DEFAULT;
            const hint = item.field === 'queue' ? queueGuidance.hint : item.hint;
            return (
              <div key={item.label} className="bg-surface-inset border border-silver-200 rounded-md p-4">
                <div className="text-xs font-semibold text-ink-heading mb-0.5">{item.label}</div>
                <div className="text-[10px] text-ink-faint mb-2 leading-snug">{hint}</div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${cfg.cls}`}>
                  {cfg.label}
                </span>
                {item.field === 'queue' && queueSnapshot?.oldestPendingAgeSec != null && (
                  <p className="mt-2 text-[10px] text-ink-muted">
                    Oldest pending: {formatPendingAge(queueSnapshot.oldestPendingAgeSec)}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {showQueueGuidance && (
          <div className="mt-4 rounded-md border border-status-warning-border bg-status-warning-bg/40 px-4 py-3">
            <p className="text-xs font-semibold text-status-warning-text">
              {health?.queue === 'unhealthy' ? 'Queue flow is down' : 'Queue flow is stalled'}
            </p>
            {queueGuidance.summary && (
              <p className="mt-1 text-xs text-ink-body leading-relaxed">{queueGuidance.summary}</p>
            )}
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-ink-faint">What to do</p>
            <ul className="mt-1 space-y-1 text-xs text-ink-body list-disc pl-4">
              {queueGuidance.actions.map(action => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Vehicles waiting to send"
        subtitle="Stalled means the oldest waiting update is more than an hour old."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pending',               value: queueSnapshot?.pending,  color: 'text-ink-heading' },
            { label: 'Retrying',              value: queueSnapshot?.retrying, color: 'text-status-warning-text' },
            { label: 'Failed',                value: queueSnapshot?.failed,   color: 'text-status-error-text' },
            { label: 'Held', value: queueSnapshot?.held, color: 'text-navy-700' },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-inset border border-silver-200 rounded-md p-4">
              <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value ?? '—'}</div>
              <div className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="px-4 py-3 bg-surface-inset border border-silver-200 rounded-md flex justify-between text-xs">
            <span className="text-ink-muted">Oldest waiting</span>
            <span className="font-mono text-ink-heading">{formatDuration(queueSnapshot?.oldestPendingAgeSec ?? null)}</span>
          </div>
          <div className="px-4 py-3 bg-surface-inset border border-silver-200 rounded-md flex justify-between text-xs">
            <span className="text-ink-muted">Last successful send</span>
            <span className="font-mono text-ink-heading">
              {queueSnapshot?.lastSuccessSyncAt
                ? new Date(queueSnapshot.lastSuccessSyncAt).toLocaleTimeString()
                : 'Never'}
            </span>
          </div>
        </div>
      </SectionCard>

      <details className="rounded-lg border border-silver-200 bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink-heading">Technical checks</summary>
        <p className="mt-1 text-xs text-ink-muted">Engineering pre-flight. Skip this unless something above is red.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Check</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">What it checks</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Destinations list', value: readiness?.platformRegistry, desc: 'Every destination we support can be found.' },
                { label: 'Send adapters', value: readiness?.bridges, desc: 'Catalog and social send adapters are loaded.' },
                { label: 'Shared sign-in', value: readiness?.oauthClients, desc: 'Shared destination sign-in is loaded.' },
                { label: 'Vehicle fields', value: readiness?.categorySchemas, desc: 'Vehicle field lists are defined.' },
                { label: 'Lot locations', value: readiness?.geoCoordinates, desc: 'At least one rooftop has a map location.' },
                { label: 'Storefront path', value: readiness?.smokeMarketplace, desc: 'The storefront can return a listing.' },
                { label: 'Staff console path', value: readiness?.smokeOperator, desc: 'The staff console can return data.' },
              ].map(check => {
                const cfg = READINESS_CFG[check.value ?? ''] ?? READINESS_DEFAULT;
                return (
                  <tr key={check.label} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors">
                    <td className="px-4 py-3 text-sm text-ink-heading font-medium">{check.label}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-faint hidden md:table-cell">{check.desc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
