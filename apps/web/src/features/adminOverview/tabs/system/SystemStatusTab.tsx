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
import { PublishingFlowComic } from '@/components/publishing/PublishingFlowComic.tsx';

type Props = {
  health: AdminDashboardResponse['health'] | undefined;
  readiness: AdminDashboardResponse['readiness'] | undefined;
  queueSnapshot: AdminDashboardResponse['queueSnapshot'] | undefined;
};

const HEALTH_TILES = [
  { key: 'api', label: 'API Gateway', field: 'api' as const, hint: 'Request routing layer' },
  { key: 'db', label: 'Database', field: 'db' as const, hint: 'Primary data store' },
  { key: 'queue', label: 'Queue Flow', field: 'queue' as const, hint: 'Sync and publish pipeline' },
  { key: 'credentials', label: 'Credentials Cache', field: 'credentials' as const, hint: 'Platform API key store' },
] as const;

export function SystemStatusTab({ health, readiness, queueSnapshot }: Props) {
  const queueGuidance = queueHealthGuidance(health?.queue, queueSnapshot);
  const showQueueGuidance = health?.queue === 'backed_up' || health?.queue === 'unhealthy';

  return (
    <div className="space-y-5">
      <PublishingFlowComic variant="admin-system" />

      <SectionCard
        title="Health"
        subtitle="Live status of core infrastructure components powering this portal instance."
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
        title="Publish Queue"
        subtitle="Counts for READY, SCHEDULED, and CLAIMED items. Queue Flow shows Stalled when the oldest pending item exceeds 1 hour."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pending',               value: queueSnapshot?.pending,  color: 'text-ink-heading' },
            { label: 'Retrying',              value: queueSnapshot?.retrying, color: 'text-status-warning-text' },
            { label: 'Failed',                value: queueSnapshot?.failed,   color: 'text-status-error-text' },
            { label: 'Held / Needs Approval', value: queueSnapshot?.held,     color: 'text-navy-700' },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-inset border border-silver-200 rounded-md p-4">
              <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value ?? '—'}</div>
              <div className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="px-4 py-3 bg-surface-inset border border-silver-200 rounded-md flex justify-between text-xs">
            <span className="text-ink-muted">Oldest Pending Age</span>
            <span className="font-mono text-ink-heading">{formatDuration(queueSnapshot?.oldestPendingAgeSec ?? null)}</span>
          </div>
          <div className="px-4 py-3 bg-surface-inset border border-silver-200 rounded-md flex justify-between text-xs">
            <span className="text-ink-muted">Last Successful Sync</span>
            <span className="font-mono text-ink-heading">
              {queueSnapshot?.lastSuccessSyncAt
                ? new Date(queueSnapshot.lastSuccessSyncAt).toLocaleTimeString()
                : 'Never'}
            </span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Readiness Checklist"
        subtitle="Pre-flight validation across core subsystems. All checks should pass before onboarding new dealers."
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Subsystem</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">What it checks</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Platform Registry', value: readiness?.platformRegistry, desc: 'All known platforms are registered and resolvable by slug.' },
                { label: 'Sync Bridges',      value: readiness?.bridges,          desc: 'Catalog and social sync bridge adapters are initialized.' },
                { label: 'OAuth Clients',     value: readiness?.oauthClients,     desc: 'OAuth provider client configurations are loaded and valid.' },
                { label: 'Category Schemas',  value: readiness?.categorySchemas,  desc: 'Vehicle category field schemas are defined and consistent.' },
                { label: 'Geo Coordinates',   value: readiness?.geoCoordinates,   desc: 'Rooftop geocoordinates are available for at least one dealer.' },
                { label: 'Marketplace Smoke', value: readiness?.smokeMarketplace, desc: 'Marketplace listing data pathway responds successfully.' },
                { label: 'Operator Smoke',    value: readiness?.smokeOperator,    desc: 'Operator console data path is accessible and returns results.' },
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
      </SectionCard>
    </div>
  );
}
