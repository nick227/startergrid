import { SectionCard } from '@/components/operator/index.ts';
import type { AdminDashboardResponse } from '@/lib/api/admin.ts';
import {
  HEALTH_CFG,
  HEALTH_DEFAULT,
  READINESS_CFG,
  READINESS_DEFAULT,
} from '@/features/adminOverview/constants/statusConfig.ts';
import { formatDuration } from '@/features/adminOverview/utils/formatDuration.ts';

type Props = {
  health: AdminDashboardResponse['health'] | undefined;
  readiness: AdminDashboardResponse['readiness'] | undefined;
  queueSnapshot: AdminDashboardResponse['queueSnapshot'] | undefined;
};

export function SystemStatusTab({ health, readiness, queueSnapshot }: Props) {
  return (
    <div className="space-y-5">
      <SectionCard
        title="Health"
        subtitle="Live status of core infrastructure components powering this portal instance."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'API Gateway',       value: 'healthy',                       hint: 'Request routing layer' },
            { label: 'Database',          value: health?.db,                       hint: 'Primary data store' },
            { label: 'Queue Flow',        value: health?.queue,                    hint: 'Sync and publish pipeline' },
            { label: 'Credentials Cache', value: health?.credentials ?? 'unknown', hint: 'Platform API key store' },
          ].map(item => {
            const cfg = HEALTH_CFG[item.value ?? ''] ?? HEALTH_DEFAULT;
            return (
              <div key={item.label} className="bg-surface-inset border border-silver-200 rounded-md p-4">
                <div className="text-xs font-semibold text-ink-heading mb-0.5">{item.label}</div>
                <div className="text-[10px] text-ink-faint mb-2">{item.hint}</div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${cfg.cls}`}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Publish Queue"
        subtitle="Current state of the sync and publish pipeline. Failed and held items require manual review."
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
