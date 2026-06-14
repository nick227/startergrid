import { DealerDashboard } from '@/components/dashboard';
import { buildAdminOverviewNav } from '@/features/adminOverview/utils/adminOverviewNav.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchAdminOutreachStats } from '@/lib/api/sdk.ts';

function OutreachStatsCard() {
  const { data, loading, error } = useAsyncQuery(() => fetchAdminOutreachStats(30), []);

  const emailSent   = data?.byChannel.find(r => r.channel === 'email'  && r.status === 'SENT')?.count ?? 0;
  const smsSent     = data?.byChannel.find(r => r.channel === 'sms'    && r.status === 'SENT')?.count ?? 0;
  const emailFailed = data?.byChannel.find(r => r.channel === 'email'  && r.status === 'FAILED')?.count ?? 0;
  const smsFailed   = data?.byChannel.find(r => r.channel === 'sms'    && r.status === 'FAILED')?.count ?? 0;

  return (
    <div className="rounded-xl border border-silver-200 bg-white shadow-sm">
      <div className="border-b border-silver-200 px-5 py-3">
        <p className="text-sm font-semibold text-ink-heading">Buyer Auto-Response — last 30 days</p>
        <p className="text-xs text-ink-muted">System-wide messages sent to buyers across all dealerships</p>
      </div>
      <div className="p-5">
        {loading && <p className="text-sm text-ink-muted">Loading…</p>}
        {error   && <p className="text-sm text-red-600">Failed to load stats</p>}
        {data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Email sent',   value: emailSent,   accent: 'text-green-700' },
                { label: 'SMS sent',     value: smsSent,     accent: 'text-green-700' },
                { label: 'Email failed', value: emailFailed, accent: emailFailed > 0 ? 'text-red-600' : 'text-ink-muted' },
                { label: 'SMS failed',   value: smsFailed,   accent: smsFailed   > 0 ? 'text-red-600' : 'text-ink-muted' },
              ].map(({ label, value, accent }) => (
                <div key={label} className="rounded-lg border border-silver-200 bg-silver-50 px-4 py-3">
                  <p className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
                </div>
              ))}
            </div>

            {data.topDealers.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-ink-muted uppercase tracking-wide">Top dealers by messages sent</p>
                <div className="space-y-1">
                  {data.topDealers.map(d => (
                    <div key={d.dealershipId} className="flex items-center justify-between text-xs text-ink-body">
                      <span className="font-mono text-ink-muted">{d.dealershipId}</span>
                      <span className="font-semibold">{d.sent} sent</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminInsightsTab() {
  return (
    <div className="space-y-4">
      <OutreachStatsCard />
      <DealerDashboard
        isAdmin={true}
        nav={buildAdminOverviewNav()}
      />
    </div>
  );
}
