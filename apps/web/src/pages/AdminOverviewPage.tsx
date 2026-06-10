import { useMemo } from 'react';
import { fetchAdminDashboard } from '@/lib/api/admin.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { ErrorState } from '@/components/operator/ErrorState.tsx';

// Format duration to readable string
function formatDuration(sec: number | null): string {
  if (sec === null) return 'N/A';
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  const remainingSecs = sec % 60;
  return `${mins}m ${remainingSecs}s`;
}

export default function AdminOverviewPage() {
  const { data, loading, error, reload } = useAsyncQuery(() => fetchAdminDashboard(), []);

  const health = useMemo(() => data?.health, [data]);
  const readiness = useMemo(() => data?.readiness, [data]);
  const queueSnapshot = useMemo(() => data?.queueSnapshot, [data]);
  const platformOverview = useMemo(() => data?.platformOverview ?? [], [data]);
  const dealerAttention = useMemo(() => data?.dealerAttention ?? [], [data]);
  const recentEvents = useMemo(() => data?.recentEvents ?? [], [data]);
  const meta = useMemo(() => data?.meta, [data]);

  return (
    <div className="min-h-screen bg-navy-950 p-6 flex justify-center text-white font-sans">
      <div className="w-full max-w-7xl">
        {/* Header Block */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => { window.location.hash = '#/'; }}
              className="text-xs font-semibold text-silver-300 hover:text-orange-400 transition-colors"
            >
              ← Back to dealers
            </button>
            <h1 className="text-3xl font-bold tracking-tight mt-2 bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              Admin Operations Dashboard
            </h1>
            <p className="text-silver-400 text-sm mt-1">
              System-wide monitoring, dealer attention triage, readiness signals, and platform capability health.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { window.location.hash = '#/admin/platform-credentials'; }}
              className="px-4 py-2 text-xs font-semibold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg transition-all"
            >
              Live Key Validation
            </button>
            <button
              type="button"
              onClick={() => void reload()}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-silver-800 hover:bg-silver-700 border border-silver-600/30 rounded-lg transition-all disabled:opacity-40"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Metadata Banner */}
        {meta && (
          <div className="mb-6 p-3 bg-silver-900/40 rounded-lg border border-silver-800/40 flex flex-wrap gap-4 items-center text-xs text-silver-300">
            <div>
              Generated at:{' '}
              <span className="font-mono text-silver-200">
                {new Date(meta.generatedAt).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>Cache:</span>
              <span
                className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                  meta.cached
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                    : 'bg-indigo-950/40 text-indigo-400 border-indigo-500/30'
                }`}
              >
                {meta.cached ? 'Served from cache (60s)' : 'Live hit'}
              </span>
            </div>
            <div>
              Load time:{' '}
              <span className="font-mono text-teal-400 font-bold">{meta.durationMs}ms</span>
            </div>
          </div>
        )}

        {loading && !data && (
          <div className="bg-silver-900/20 rounded-xl p-6 border border-silver-800/40">
            <Skeleton rows={10} />
          </div>
        )}

        {error && <ErrorState message={error} onRetry={reload} />}

        {!loading && !error && data && (
          <div className="space-y-6">
            {/* Top Grid: System Health, Readiness, and Queue Snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* System Health Widget */}
              <div className="bg-silver-900/20 border border-silver-800/40 rounded-xl p-5 shadow-lg">
                <h2 className="text-lg font-bold text-teal-300 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  System Health Status
                </h2>
                <div className="space-y-3">
                  {/* API */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-silver-900/30 border border-silver-800/20">
                    <span className="text-sm text-silver-300">API Gateway</span>
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/50 text-emerald-400 border border-emerald-500/30">
                      Healthy
                    </span>
                  </div>

                  {/* Database */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-silver-900/30 border border-silver-800/20">
                    <span className="text-sm text-silver-300">Database Connection</span>
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        health?.db === 'healthy'
                          ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-950/50 text-red-400 border-red-500/30'
                      }`}
                    >
                      {health?.db === 'healthy' ? 'Healthy' : 'Unhealthy'}
                    </span>
                  </div>

                  {/* Job Queue */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-silver-900/30 border border-silver-800/20">
                    <span className="text-sm text-silver-300">Queue Flow</span>
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        health?.queue === 'flowing'
                          ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30'
                          : health?.queue === 'backed_up'
                          ? 'bg-amber-950/50 text-amber-400 border-amber-500/30'
                          : 'bg-red-950/50 text-red-400 border-red-500/30'
                      }`}
                    >
                      {health?.queue === 'flowing'
                        ? 'Flowing'
                        : health?.queue === 'backed_up'
                        ? 'Backed Up'
                        : 'Unhealthy'}
                    </span>
                  </div>

                  {/* Developer Credentials */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-silver-900/30 border border-silver-800/20">
                    <span className="text-sm text-silver-300">Credentials Cache</span>
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        health?.credentials === 'valid'
                          ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30'
                          : health?.credentials === 'invalid'
                          ? 'bg-red-950/50 text-red-400 border-red-500/30'
                          : 'bg-amber-950/50 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {health?.credentials === 'unknown' ? 'NOT_CHECKED' : health?.credentials?.toUpperCase() || 'NOT_CHECKED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Readiness Checks Widget */}
              <div className="bg-silver-900/20 border border-silver-800/40 rounded-xl p-5 shadow-lg">
                <h2 className="text-lg font-bold text-teal-300 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  Readiness Checklist
                </h2>
                <div className="grid grid-cols-1 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {[
                    { label: 'Platform Registry', value: readiness?.platformRegistry },
                    { label: 'Sync Bridges', value: readiness?.bridges },
                    { label: 'OAuth Clients', value: readiness?.oauthClients },
                    { label: 'Category Schemas', value: readiness?.categorySchemas },
                    { label: 'Geo Coordinate Coverage', value: readiness?.geoCoordinates },
                    { label: 'Smoke Test: Marketplace', value: readiness?.smokeMarketplace },
                    { label: 'Smoke Test: Operator', value: readiness?.smokeOperator },
                  ].map((check, idx) => {
                    const isPass = check.value === 'valid' || check.value === 'PASS';
                    const isWarn = check.value === 'WARNING';
                    const isUnknown = check.value === 'UNKNOWN';
                    
                    let pillText = check.value?.toUpperCase() || 'UNKNOWN';
                    let pillStyle = 'bg-silver-900/60 text-silver-400 border-silver-800';
                    
                    if (isPass) {
                      pillText = 'PASS';
                      pillStyle = 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20';
                    } else if (isWarn) {
                      pillStyle = 'bg-amber-950/40 text-amber-400 border-amber-500/20';
                    } else if (isUnknown) {
                      pillText = check.label.includes('Geo') ? 'UNKNOWN/NOT_CONFIGURED' : 'UNKNOWN';
                      pillStyle = 'bg-amber-950/30 text-amber-400/80 border-amber-500/10';
                    } else if (check.value === 'invalid') {
                      pillText = 'FAIL';
                      pillStyle = 'bg-red-950/40 text-red-400 border-red-500/20';
                    }

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded bg-silver-900/20 border border-silver-800/10"
                      >
                        <span className="text-xs text-silver-300">{check.label}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${pillStyle}`}>
                          {pillText}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Queue Snapshot Widget */}
              <div className="bg-silver-900/20 border border-silver-800/40 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-teal-300 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    Publish & Sync Queue
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-silver-900/30 rounded-lg border border-silver-800/20">
                      <div className="text-2xl font-bold text-white font-mono">
                        {queueSnapshot?.pending}
                      </div>
                      <div className="text-[10px] uppercase text-silver-400 tracking-wider font-semibold">
                        Pending
                      </div>
                    </div>
                    <div className="p-3 bg-silver-900/30 rounded-lg border border-silver-800/20">
                      <div className="text-2xl font-bold text-amber-400 font-mono">
                        {queueSnapshot?.retrying}
                      </div>
                      <div className="text-[10px] uppercase text-silver-400 tracking-wider font-semibold">
                        Retrying
                      </div>
                    </div>
                    <div className="p-3 bg-silver-900/30 rounded-lg border border-silver-800/20">
                      <div className="text-2xl font-bold text-red-400 font-mono">
                        {queueSnapshot?.failed}
                      </div>
                      <div className="text-[10px] uppercase text-silver-400 tracking-wider font-semibold">
                        Failed
                      </div>
                    </div>
                    <div className="p-3 bg-silver-900/30 rounded-lg border border-silver-800/20">
                      <div className="text-2xl font-bold text-indigo-400 font-mono">
                        {queueSnapshot?.held}
                      </div>
                      <div className="text-[10px] uppercase text-silver-400 tracking-wider font-semibold">
                        Held / Needs Approval
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-silver-800/30 text-xs text-silver-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Oldest Pending Age:</span>
                    <span className="font-mono text-silver-200">
                      {formatDuration(queueSnapshot?.oldestPendingAgeSec ?? null)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Successful Sync:</span>
                    <span className="font-mono text-silver-200">
                      {queueSnapshot?.lastSuccessSyncAt
                        ? new Date(queueSnapshot.lastSuccessSyncAt).toLocaleTimeString()
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Middle Row: Platform Overview Widget */}
            <div className="bg-silver-900/20 border border-silver-800/40 rounded-xl p-5 shadow-lg overflow-hidden">
              <h2 className="text-lg font-bold text-teal-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                Platform Capabilities & Adoption Matrix
              </h2>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-silver-900/40 border-b border-silver-800 text-[10px] text-silver-400 uppercase tracking-wider">
                      <th className="px-4 py-3 font-semibold">Platform</th>
                      <th className="px-4 py-3 font-semibold text-center">Configured</th>
                      <th className="px-4 py-3 font-semibold">Live Validation</th>
                      <th className="px-4 py-3 font-semibold">Adoption</th>
                      <th className="px-4 py-3 font-semibold">Capabilities</th>
                      <th className="px-4 py-3 font-semibold">Maturity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformOverview.map(p => {
                      const hasBlocked = p.blockedDealers > 0;
                      
                      let validationPill = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-silver-950 text-silver-400 border border-silver-800">
                          NOT_CHECKED
                        </span>
                      );
                      
                      if (p.liveValidationStatus === 'valid') {
                        validationPill = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/50 text-emerald-400 border border-emerald-500/20">
                            VALID
                          </span>
                        );
                      } else if (p.liveValidationStatus === 'invalid') {
                        validationPill = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950/50 text-red-400 border border-red-500/20">
                            INVALID
                          </span>
                        );
                      } else if (p.liveValidationStatus === 'not-configured') {
                        validationPill = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-silver-950 text-silver-500 border border-silver-800/40">
                            NOT_CONFIGURED
                          </span>
                        );
                      } else if (p.liveValidationStatus === 'unsupported') {
                        validationPill = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-silver-950 text-silver-500 border border-silver-800/40">
                            NO_LIVE_CHECK
                          </span>
                        );
                      }

                      return (
                        <tr
                          key={p.platformSlug}
                          className="border-b border-silver-800/20 hover:bg-silver-900/10 transition-colors"
                        >
                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-white text-sm">
                              {p.platformName}
                            </div>
                            <div className="text-xs text-silver-400 mt-0.5 font-mono">
                              {p.platformSlug}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-center">
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full ${
                                p.configured ? 'bg-emerald-400 shadow-emerald-400/50 shadow-sm' : 'bg-silver-700'
                              }`}
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            {validationPill}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="text-xs">
                              <span className="font-semibold text-white">{p.dealersUsing}</span> dealers
                            </div>
                            {hasBlocked && (
                              <div className="text-[10px] text-red-400 mt-0.5 font-semibold">
                                {p.blockedDealers} blocked
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-1">
                              {p.capabilities.map(cap => {
                                let style = 'bg-silver-900/60 text-silver-300';
                                if (cap === 'catalogSync') style = 'bg-teal-950/40 text-teal-400 border border-teal-500/20';
                                if (cap === 'socialPosting') style = 'bg-indigo-950/40 text-indigo-400 border border-indigo-500/20';
                                if (cap === 'marketplaceListing') style = 'bg-violet-950/40 text-violet-400 border border-violet-500/20';
                                if (cap === 'partnerFeed') style = 'bg-sky-950/40 text-sky-400 border border-sky-500/20';
                                if (cap === 'leadCapture') style = 'bg-amber-950/40 text-amber-400 border border-amber-500/20';
                                return (
                                  <span key={cap} className={`px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase ${style}`}>
                                    {cap}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                p.integrationMaturity === 'PRODUCTION_READY'
                                  ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                                  : p.integrationMaturity === 'BETA'
                                  ? 'bg-indigo-950/30 text-indigo-400 border-indigo-500/20'
                                  : 'bg-silver-950 text-silver-400 border-silver-800'
                              }`}
                            >
                              {p.integrationMaturity}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Row: Dealer Attention and Recent Events */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Dealer Attention Widget */}
              <div className="bg-silver-900/20 border border-silver-800/40 rounded-xl p-5 shadow-lg lg:col-span-7 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-teal-300 mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    Dealer Attention Triage
                  </h2>
                  
                  {dealerAttention.length === 0 ? (
                    <div className="p-8 text-center bg-silver-900/10 rounded-lg border border-silver-850 border-dashed text-silver-400 text-sm">
                      ✨ All dealers are fully operational. No triage actions required.
                    </div>
                  ) : (
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-silver-900/40 border-b border-silver-800 text-[10px] text-silver-400 uppercase tracking-wider">
                            <th className="px-3 py-2 font-semibold">Dealer</th>
                            <th className="px-3 py-2 font-semibold">Platform</th>
                            <th className="px-3 py-2 font-semibold">Severity</th>
                            <th className="px-3 py-2 font-semibold">Blocker / Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dealerAttention.map((item, idx) => {
                            const isCritical = item.severity === 'critical';
                            const isWarning = item.severity === 'warning';
                            
                            let sevPill = (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950/40 text-sky-400 border border-sky-500/20">
                                INFO
                              </span>
                            );
                            if (isCritical) {
                              sevPill = (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/40 text-red-400 border border-red-500/20">
                                  CRITICAL
                                </span>
                              );
                            } else if (isWarning) {
                              sevPill = (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/40 text-amber-400 border border-amber-500/20">
                                  WARNING
                                </span>
                              );
                            }

                            return (
                              <tr
                                key={idx}
                                className="border-b border-silver-800/10 hover:bg-silver-900/10 transition-colors"
                              >
                                <td className="px-3 py-2.5 align-top">
                                  <a
                                    href={`#/${item.dealerId}/platforms`}
                                    className="font-semibold text-teal-400 hover:text-teal-300 hover:underline text-xs"
                                  >
                                    {item.dealerName}
                                  </a>
                                  <div className="text-[10px] text-silver-400 mt-0.5 font-semibold">
                                    {item.category}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 align-top font-mono text-xs text-silver-300">
                                  {item.platformSlug}
                                </td>
                                <td className="px-3 py-2.5 align-top">
                                  {sevPill}
                                </td>
                                <td className="px-3 py-2.5 align-top">
                                  <div className="text-xs text-silver-200">
                                    {item.reason}
                                  </div>
                                  <div className="text-[10px] text-orange-400 mt-1 font-semibold">
                                    Next: {item.nextAction}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Events Widget */}
              <div className="bg-silver-900/20 border border-silver-800/40 rounded-xl p-5 shadow-lg lg:col-span-5 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-teal-300 mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    Recent Events (Audit Logs)
                  </h2>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                    {recentEvents.map(event => (
                      <div
                        key={event.id}
                        className="p-3 bg-silver-900/30 rounded-lg border border-silver-800/20 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white font-mono break-all pr-2">
                            {event.action}
                          </span>
                          <span className="text-[10px] text-silver-400 font-mono whitespace-nowrap shrink-0">
                            {new Date(event.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-silver-400">
                          Actor: <span className="text-silver-200">{event.actorEmail}</span>
                        </div>
                        {event.detailString && (
                          <div className="text-[10px] text-silver-300 bg-silver-950/60 p-1.5 rounded font-mono break-words leading-normal max-h-16 overflow-y-auto">
                            {event.detailString}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
