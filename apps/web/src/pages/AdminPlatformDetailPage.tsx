import { useMemo, useState } from 'react';
import {
  fetchPlatformCredentials,
  validatePlatformCredentials,
  type AdminPlatformOverviewItem,
  type AdminDealerAttentionItem,
  type AdminRecentEventItem,
  type AdminQueueSnapshot,
  type ProviderCredentialResult,
  type ProviderCredentialSummary,
} from '@/lib/api/admin.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { toErrorMessage } from '@/lib/errors.ts';
import { adminDealerHash } from '@/lib/routes.ts';

// ── Config tables ─────────────────────────────────────────────────────────────

const MATURITY_CFG: Record<string, { label: string; cls: string; desc: string }> = {
  PRODUCTION_READY: {
    label: 'Production Ready',
    cls: 'bg-status-success-bg text-status-success-text border-status-success-border',
    desc: 'Deployed and actively used by dealers. Full monitoring and SLA coverage.',
  },
  BETA: {
    label: 'Beta',
    cls: 'bg-status-info-bg text-status-info-text border-status-info-border',
    desc: 'Limited rollout with enhanced monitoring. Suitable for select dealers only.',
  },
  ALPHA: {
    label: 'Alpha',
    cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border',
    desc: 'Early-stage integration. Not recommended for active dealer use.',
  },
};

const CRED_STATUS: Record<string, { label: string; cls: string }> = {
  'valid':          { label: 'Valid',          cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  'invalid':        { label: 'Invalid',        cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  'unknown':        { label: 'Not checked',    cls: 'bg-surface-inset text-ink-faint border-silver-200' },
  'unreachable':    { label: 'Unreachable',    cls: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  'not-configured': { label: 'Not configured', cls: 'bg-surface-inset text-ink-faint border-silver-200' },
  'unsupported':    { label: 'No live check',  cls: 'bg-surface-inset text-ink-faint border-silver-200' },
};

const SEV_CFG: Record<string, { cls: string; label: string }> = {
  critical: { cls: 'bg-status-error-bg text-status-error-text border-status-error-border',     label: 'Critical' },
  warning:  { cls: 'bg-status-warning-bg text-status-warning-text border-status-warning-border', label: 'Warning' },
  info:     { cls: 'bg-status-info-bg text-status-info-text border-status-info-border',         label: 'Info' },
};

const CAP_DESCRIPTIONS: Record<string, string> = {
  catalogSync:        'Syncs inventory catalog to this platform on a schedule',
  socialPosting:      'Publishes marketing posts to platform social channels',
  marketplaceListing: 'Lists inventory on the platform\'s consumer marketplace',
  partnerFeed:        'Delivers inventory feed to platform partner aggregators',
  leadCapture:        'Routes consumer leads from platform into dealer CRM',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatDuration(sec: number | null): string {
  if (sec === null) return 'N/A';
  if (sec < 60)  return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ value, label, sub, valueClass = 'text-ink-heading' }: {
  value: React.ReactNode;
  label: string;
  sub?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="surface-card-operator p-4">
      <div className={`text-3xl font-bold font-mono ${valueClass}`}>{value}</div>
      <div className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold mt-1">{label}</div>
      {sub && <div className="text-[10px] text-ink-faint mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">{title}</h3>
      {count !== undefined && (
        <span className="px-1.5 py-0.5 rounded bg-navy-800 text-silver-400 text-[10px] font-mono">{count}</span>
      )}
    </div>
  );
}

function CredentialPanel({ slug, provider, initialStatus }: {
  slug: string;
  provider: ProviderCredentialSummary | undefined;
  initialStatus: string | undefined;
}) {
  const [result, setResult]       = useState<ProviderCredentialResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [validatedAt, setValidatedAt] = useState<Date | null>(null);

  const runValidation = async () => {
    setValidating(true);
    setValidateError(null);
    try {
      const run = await validatePlatformCredentials();
      const r = provider ? (run.results.find(r => r.provider === provider.provider) ?? null) : null;
      setResult(r);
      setValidatedAt(new Date());
    } catch (e) {
      setValidateError(toErrorMessage(e));
    } finally {
      setValidating(false);
    }
  };

  const effectiveStatus = result?.status ?? initialStatus;
  const pill = CRED_STATUS[effectiveStatus ?? ''] ?? { label: 'Not checked', cls: 'bg-surface-inset text-ink-faint border-silver-200' };
  const pillLabel = result?.status === 'valid' && result.checkMethod === 'client-auth-inference'
    ? 'Client auth inferred'
    : pill.label;

  return (
    <div className="surface-card-operator p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SectionHeader title="Developer Credentials" />
        {provider && (
          <button
            type="button"
            onClick={() => void runValidation()}
            disabled={validating}
            className="shrink-0 px-3 py-1.5 rounded text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-40 transition-colors"
          >
            {validating ? 'Validating…' : 'Validate Keys'}
          </button>
        )}
      </div>

      {validateError && (
        <div className="px-3 py-2 bg-status-error-bg border border-status-error-border rounded text-xs text-status-error-text">
          {validateError}
        </div>
      )}

      {!provider ? (
        <div className="space-y-1">
          <p className="text-xs text-ink-muted">
            No OAuth app credentials for this platform.
          </p>
          <p className="text-[10px] text-ink-faint leading-relaxed">
            This platform may use API keys, partner feeds, or other non-OAuth authentication
            that isn't tracked in the credential registry. Check the platform's integration
            documentation or env var configuration directly.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-ink-faint uppercase tracking-wide font-semibold mb-0.5">Provider</div>
            <div className="font-mono text-xs text-ink-heading">{provider.provider}</div>
          </div>
          <div>
            <div className="text-[10px] text-ink-faint uppercase tracking-wide font-semibold mb-0.5">Env Vars</div>
            <div className="font-mono text-[10px] text-ink-muted leading-relaxed break-all">{provider.envVars.join('\n')}</div>
          </div>
          <div>
            <div className="text-[10px] text-ink-faint uppercase tracking-wide font-semibold mb-1">Status</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${pill.cls}`}>{pillLabel}</span>
              {validatedAt && (
                <span className="text-[10px] text-ink-faint">{validatedAt.toLocaleTimeString()}</span>
              )}
            </div>
            {result?.detail && (
              <div className="text-[10px] text-ink-faint mt-1 break-words">{result.detail}</div>
            )}
          </div>
          <div>
            <div className="text-[10px] text-ink-faint uppercase tracking-wide font-semibold mb-0.5">Live Probe</div>
            <div className="text-xs text-ink-muted">{provider.probeSupported ? 'Supported' : 'Not available'}</div>
          </div>
          {provider.platformSlugs.length > 1 && (
            <div className="pt-2 border-t border-silver-200">
              <div className="text-[10px] text-ink-faint uppercase tracking-wide font-semibold mb-1">Shared with</div>
              <div className="flex flex-wrap gap-1.5">
                {provider.platformSlugs.filter(s => s !== slug).map(s => (
                  <a key={s} href={`#/admin/platforms/${s}`}
                    className="font-mono text-[10px] text-navy-700 hover:underline">
                    {s}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Props = {
  slug: string;
  platformOverview: AdminPlatformOverviewItem[];
  dealerAttention: AdminDealerAttentionItem[];
  recentEvents: AdminRecentEventItem[];
  queueSnapshot: AdminQueueSnapshot | null;
  loading: boolean;
};

export default function AdminPlatformDetailPage({
  slug,
  platformOverview,
  dealerAttention,
  recentEvents,
  queueSnapshot,
  loading,
}: Props) {
  const platform = useMemo(
    () => platformOverview.find(p => p.platformSlug === slug),
    [platformOverview, slug],
  );

  const { data: credData, loading: credLoading } = useAsyncQuery(() => fetchPlatformCredentials(), []);
  const provider = useMemo(
    () => credData?.providers.find(p => p.platformSlugs.includes(slug)),
    [credData, slug],
  );

  const platformTriage = useMemo(
    () => dealerAttention.filter(a => a.platformSlug === slug),
    [dealerAttention, slug],
  );

  const platformEvents = useMemo(() => {
    const q = slug.toLowerCase();
    return recentEvents.filter(e =>
      e.detailString?.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q),
    ).slice(0, 12);
  }, [recentEvents, slug]);

  const triageCritical = platformTriage.filter(a => a.severity === 'critical').length;
  const triageWarning  = platformTriage.filter(a => a.severity === 'warning').length;

  const matCfg = MATURITY_CFG[platform?.integrationMaturity ?? ''] ?? {
    label: 'Unknown', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border', desc: '',
  };

  const credStatusPill = CRED_STATUS[platform?.liveValidationStatus ?? ''] ?? {
    label: 'Not checked', cls: 'bg-surface-inset text-ink-faint border-silver-200',
  };

  return (
    <div className="space-y-5">

      {/* Back nav */}
      <a href="#/admin/platforms"
        className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink-heading transition-colors">
        ← All Platforms
      </a>

      {loading && !platform && (
        <div className="surface-card-operator p-6"><Skeleton rows={8} /></div>
      )}

      {!loading && !platform && (
        <div className="surface-card-operator p-6 text-sm text-ink-muted">
          Platform <span className="font-mono">"{slug}"</span> not found.
        </div>
      )}

      {platform && (
        <>
          {/* ── Platform header ── */}
          <div className="surface-card-operator p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-1">
                  <h2 className="text-2xl font-bold text-ink-heading">{platform.platformName}</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${matCfg.cls}`}>
                    {matCfg.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    platform.configured
                      ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                      : 'bg-surface-inset text-ink-faint border-silver-200'
                  }`}>
                    {platform.configured ? 'Configured' : 'Not configured'}
                  </span>
                  {platform.liveValidationStatus && platform.liveValidationStatus !== 'unknown' && (
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${credStatusPill.cls}`}>
                      Cred: {credStatusPill.label}
                    </span>
                  )}
                  {triageCritical > 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-status-error-bg text-status-error-text border-status-error-border">
                      {triageCritical} critical
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-ink-faint mb-2">{platform.platformSlug}</div>
                {platform.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {platform.capabilities.map(cap => (
                      <span key={cap} className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-surface-inset text-ink-muted border border-silver-200">
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick stats inline */}
              <div className="flex gap-3 shrink-0">
                <div className="text-center px-4 py-2 bg-surface-inset rounded-md border border-silver-200">
                  <div className="text-2xl font-bold font-mono text-ink-heading">{platform.dealersUsing}</div>
                  <div className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold">Dealers</div>
                </div>
                <div className="text-center px-4 py-2 bg-surface-inset rounded-md border border-silver-200">
                  <div className={`text-2xl font-bold font-mono ${platform.blockedDealers > 0 ? 'text-status-error-text' : 'text-ink-heading'}`}>
                    {platform.blockedDealers}
                  </div>
                  <div className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold">Blocked</div>
                </div>
                <div className="text-center px-4 py-2 bg-surface-inset rounded-md border border-silver-200">
                  <div className={`text-2xl font-bold font-mono ${triageCritical > 0 ? 'text-status-error-text' : triageWarning > 0 ? 'text-status-warning-text' : 'text-ink-heading'}`}>
                    {platformTriage.length}
                  </div>
                  <div className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold">Issues</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Main two-column layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

            {/* Left: 2/3 */}
            <div className="lg:col-span-2 space-y-5">

              {/* Pipeline health */}
              {queueSnapshot && (
                <div className="surface-card-operator p-4">
                  <SectionHeader title="System Pipeline" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <StatCard
                      value={queueSnapshot.pending}
                      label="Pending"
                      valueClass={queueSnapshot.pending > 50 ? 'text-status-warning-text' : 'text-ink-heading'}
                    />
                    <StatCard
                      value={queueSnapshot.failed}
                      label="Failed"
                      valueClass={queueSnapshot.failed > 0 ? 'text-status-error-text' : 'text-ink-heading'}
                    />
                    <StatCard
                      value={queueSnapshot.retrying}
                      label="Retrying"
                      valueClass={queueSnapshot.retrying > 0 ? 'text-status-warning-text' : 'text-ink-heading'}
                    />
                    <StatCard
                      value={queueSnapshot.held}
                      label="Held"
                      sub="needs approval"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-ink-muted px-1">
                    <span>
                      Oldest pending:{' '}
                      <span className="font-mono text-ink-heading">
                        {formatDuration(queueSnapshot.oldestPendingAgeSec)}
                      </span>
                    </span>
                    <span>
                      Last success:{' '}
                      <span className="font-mono text-ink-heading">
                        {queueSnapshot.lastSuccessSyncAt
                          ? timeAgo(queueSnapshot.lastSuccessSyncAt)
                          : 'Never'}
                      </span>
                    </span>
                  </div>
                  <p className="text-[10px] text-ink-faint mt-2 px-1">
                    System-wide queue — not filtered to this platform. Use queue counts as a signal for overall pipeline health.
                  </p>
                </div>
              )}

              {/* Active triage for this platform */}
              <div className="surface-card-operator p-4">
                <SectionHeader title={`Active Issues — ${platform.platformName}`} count={platformTriage.length} />
                {platformTriage.length === 0 ? (
                  <div className="py-6 text-center text-xs text-ink-faint border border-dashed border-silver-200 rounded-md">
                    No active triage items for this platform.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {platformTriage.map((item, i) => {
                      const sev = SEV_CFG[item.severity] ?? SEV_CFG.info;
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 bg-surface-inset rounded-md border border-silver-200">
                          <span className={`mt-0.5 shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold border ${sev.cls}`}>
                            {sev.label}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <a href={adminDealerHash(item.dealerId)}
                                className="text-xs font-semibold text-navy-700 hover:underline truncate">
                                {item.dealerName}
                              </a>
                              <span className="text-[10px] text-ink-faint shrink-0">{item.category}</span>
                            </div>
                            <div className="text-xs text-ink-body">{item.reason}</div>
                            {item.nextAction && (
                              <div className="text-[10px] text-orange-600 font-medium mt-0.5">
                                → {item.nextAction}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Activity feed */}
              <div className="surface-card-operator p-4">
                <SectionHeader
                  title={`Recent Activity — ${platform.platformName}`}
                  count={platformEvents.length}
                />
                {platformEvents.length === 0 ? (
                  <div className="py-6 text-center text-xs text-ink-faint border border-dashed border-silver-200 rounded-md">
                    No recent events found for this platform.
                  </div>
                ) : (
                  <div className="divide-y divide-silver-200">
                    {platformEvents.map(event => (
                      <div key={event.id} className="flex items-start gap-3 py-2.5">
                        <span className="text-[10px] text-ink-faint font-mono shrink-0 w-16 pt-0.5 text-right">
                          {timeAgo(event.createdAt)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs font-semibold text-ink-heading truncate">
                            {event.action}
                          </div>
                          <div className="text-[10px] text-ink-muted mt-0.5 truncate">{event.actorEmail}</div>
                          {event.detailString && (
                            <div className="text-[10px] text-ink-faint mt-0.5 break-words leading-relaxed line-clamp-2">
                              {event.detailString}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Right: 1/3 */}
            <div className="space-y-5">

              {/* Credentials */}
              {credLoading ? (
                <div className="surface-card-operator p-4"><Skeleton rows={5} /></div>
              ) : (
                <CredentialPanel
                  slug={slug}
                  provider={provider}
                  initialStatus={platform.liveValidationStatus}
                />
              )}

              {/* Classification */}
              <div className="surface-card-operator p-4 space-y-4">
                <SectionHeader title="Integration Classification" />

                <div>
                  <div className="text-[10px] text-ink-faint uppercase tracking-wide font-semibold mb-1">Maturity</div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${matCfg.cls}`}>
                      {matCfg.label}
                    </span>
                  </div>
                  {matCfg.desc && (
                    <div className="text-[10px] text-ink-faint leading-relaxed">{matCfg.desc}</div>
                  )}
                </div>

                {platform.capabilities.length > 0 && (
                  <div>
                    <div className="text-[10px] text-ink-faint uppercase tracking-wide font-semibold mb-2">Capabilities</div>
                    <div className="space-y-2">
                      {platform.capabilities.map(cap => (
                        <div key={cap}>
                          <div className="text-xs font-semibold text-ink-heading font-mono">{cap}</div>
                          <div className="text-[10px] text-ink-faint leading-relaxed">
                            {CAP_DESCRIPTIONS[cap] ?? 'Integration capability enabled.'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {platformTriage.length > 0 && (
                  <div>
                    <div className="text-[10px] text-ink-faint uppercase tracking-wide font-semibold mb-1.5">
                      Affected Categories
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[...new Set(platformTriage.map(a => a.category))].map(cat => (
                        <span key={cat} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-status-neutral-bg text-status-neutral-text border border-status-neutral-border">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
