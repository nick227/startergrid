import { useMemo, useState } from 'react';
import {
  fetchPlatformCredentials,
  validatePlatformCredential,
  type AdminPlatformOverviewItem,
  type AdminDealerAttentionItem,
  type AdminRecentEventItem,
  type AdminQueueSnapshot,
  type AdminSetupGuide,
  type ExternalLink,
  type OperatorSetupGuide,
  type CredentialStageResult,
  type PlatformCredentialContractSummary,
  type PlatformCredentialDisplayStatus,
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
  VALID:              { label: 'Valid',                cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  NOT_CONFIGURED:     { label: 'Not configured',       cls: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  READY_TO_VALIDATE:  { label: 'Ready to validate',    cls: 'bg-status-info-bg text-status-info-text border-status-info-border' },
  VALIDATION_FAILED:  { label: 'Validation failed',    cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  MANUAL_SETUP:       { label: 'Manual setup',         cls: 'bg-surface-inset text-ink-muted border-silver-200' },
  INTERNAL:           { label: 'Internal',             cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  CONTRACT_MISSING:   { label: 'Contract missing',     cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
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

function formatList(items: string[]): string {
  if (items.length === 0) return 'none';
  return items.join(' + ');
}

function describeSystemCredentialGap(platform: AdminPlatformOverviewItem, providerName: string): string {
  if (platform.platformType === 'internal') {
    return 'Internal platform: validate first-party routes and event loops. No external developer keys.';
  }
  if (providerName === 'unregistered') {
    return 'No shared system credential contract was returned. This platform likely uses dealer credentials, partner feed credentials, or a manual portal workflow.';
  }
  return 'Provider is registered, but no required system fields were returned. Add platform credential contract metadata before live validation.';
}

function configDetail(
  slug: string,
  platform: AdminPlatformOverviewItem,
  providerName: string,
  requiredFields: string[],
  missingFields: string[],
): string {
  if (slug === 'consumer-marketplace' || platform.platformType === 'internal') {
    return 'No external secrets required. Checks cover first-party route and event-loop health.';
  }
  if (missingFields.length > 0) return `Missing ${formatList(missingFields)}.`;
  if (requiredFields.length > 0) return `Requires ${formatList(requiredFields)}.`;
  return describeSystemCredentialGap(platform, providerName);
}

function statusFromProviderFallback(
  slug: string,
  platform: AdminPlatformOverviewItem,
  provider: ProviderCredentialSummary | undefined,
  requiredFields: string[],
  missingFields: string[],
): PlatformCredentialDisplayStatus {
  if (slug === 'consumer-marketplace' || platform.platformType === 'internal') return 'INTERNAL';
  if (!provider) return 'CONTRACT_MISSING';
  if (requiredFields.length === 0) return 'MANUAL_SETUP';
  if (missingFields.length > 0 || provider.configured === false) return 'NOT_CONFIGURED';
  return 'READY_TO_VALIDATE';
}

function credentialActionText(contract: PlatformCredentialContractSummary | null, status: PlatformCredentialDisplayStatus): string {
  if (!contract) return 'Credential contract was not returned by the API.';
  if (status === 'READY_TO_VALIDATE') {
    const required = contract.requiredFields.length > 0
      ? formatList(contract.requiredFields)
      : formatList(contract.requiredCapabilities);
    return required !== 'none'
      ? `Ready to validate — requires ${required}.`
      : contract.notes;
  }
  if (status === 'NOT_CONFIGURED') {
    return contract.missingFields.length > 0
      ? `Missing ${formatList(contract.missingFields)}.`
      : 'Missing required credential configuration.';
  }
  if (status === 'VALIDATION_FAILED') return contract.lastError ?? 'Auth, permission, or capability probe failed.';
  if (status === 'VALID') {
    const checked = contract.checkedFields.length > 0 ? formatList(contract.checkedFields) : contract.authType;
    return `Checked ${checked}.`;
  }
  if (status === 'MANUAL_SETUP') return contract.notes || 'Partner/feed credentials are configured outside shared system developer keys.';
  if (status === 'INTERNAL') return contract.notes || 'Owned platform uses first-party route validation.';
  if (status === 'CONTRACT_MISSING') return 'Platform credential contract is not defined yet.';
  return contract.lastError ?? contract.notes;
}

function stageLabel(status: PlatformCredentialDisplayStatus): string {
  if (status === 'VALID') return 'OK';
  if (status === 'NOT_CONFIGURED') return 'Missing';
  if (status === 'READY_TO_VALIDATE') return 'Ready';
  if (status === 'VALIDATION_FAILED') return 'Failed';
  if (status === 'MANUAL_SETUP') return 'Manual';
  if (status === 'INTERNAL') return 'Internal';
  return 'Missing';
}

function stageClass(status: PlatformCredentialDisplayStatus): string {
  if (status === 'VALID' || status === 'INTERNAL') return 'bg-status-success-bg text-status-success-text border-status-success-border';
  if (status === 'VALIDATION_FAILED' || status === 'CONTRACT_MISSING') return 'bg-status-error-bg text-status-error-text border-status-error-border';
  if (status === 'NOT_CONFIGURED') return 'bg-status-warning-bg text-status-warning-text border-status-warning-border';
  if (status === 'READY_TO_VALIDATE') return 'bg-status-info-bg text-status-info-text border-status-info-border';
  return 'bg-surface-inset text-ink-faint border-silver-200';
}

function healthClass(status: string): string {
  if (status === 'green') return 'bg-status-success-text';
  if (status === 'yellow') return 'bg-status-warning-text';
  return 'bg-status-error-text';
}

function contractFallback(
  slug: string,
  platform: AdminPlatformOverviewItem,
  provider: ProviderCredentialSummary | undefined,
): PlatformCredentialContractSummary {
  const isInternal = slug === 'consumer-marketplace' || platform.platformType === 'internal';
  const requiredCapabilities = isInternal
    ? ['Marketplace route', 'Publish endpoint', 'Listing visibility', 'Lead capture', 'Buyer event flow', 'Sold notification flow']
    : platform.capabilities;
  const missingFields = provider?.configured === false ? provider.envVars : [];
  const requiredFields = isInternal ? [] : provider?.envVars ?? [];
  const providerName = isInternal ? 'internal' : provider?.provider ?? 'unregistered';
  const status = statusFromProviderFallback(slug, platform, provider, requiredFields, missingFields);
  const notes = isInternal
    ? 'Internal platform: validate marketplace route, publish, lead capture, buyer events, and sold notifications.'
    : requiredFields.length > 0
      ? 'System credential requirements are known; run Validate to test provider auth and permissions.'
      : describeSystemCredentialGap(platform, providerName);

  return {
    platformSlug: slug,
    provider: providerName,
    authType: isInternal ? 'internal' : 'oauth',
    requiredFields,
    requiredSecrets: requiredFields,
    requiredScopes: [],
    requiredPermissions: [],
    requiredCapabilities,
    capabilityChecks: requiredCapabilities,
    docsUrl: null,
    connectionModel: isInternal ? 'internal-route' : requiredFields.length > 0 ? 'shared-system-oauth' : 'manual-portal',
    validationDepth: isInternal ? 'internal' : requiredFields.length > 0 ? 'auth' : 'config',
    checkedFields: isInternal ? requiredCapabilities : requiredFields,
    stages: [
      {
        stage: 'config',
        status,
        detail: configDetail(slug, platform, providerName, requiredFields, missingFields),
        checkedFields: isInternal ? [] : requiredFields,
      },
      {
        stage: 'auth',
        status: requiredFields.length > 0 ? 'READY_TO_VALIDATE' : status,
        detail: isInternal ? 'Internal route authorization has not been checked.' : 'Provider auth has not been checked.',
        checkedFields: [],
      },
      {
        stage: 'permissions',
        status: requiredFields.length > 0 ? 'READY_TO_VALIDATE' : status,
        detail: isInternal ? 'Internal workflow permissions have not been checked.' : 'Required scopes and permissions have not been checked.',
        checkedFields: [],
      },
      {
        stage: 'capability',
        status: requiredFields.length > 0 ? 'READY_TO_VALIDATE' : status,
        detail: `Capability checks: ${formatList(requiredCapabilities)}.`,
        checkedFields: requiredCapabilities,
      },
    ],
    notes,
    configured: isInternal || Boolean(provider?.configured),
    missingFields,
    lastCheckedAt: null,
    lastStatus: status,
    lastError: missingFields.length > 0 ? `Missing ${formatList(missingFields)}.` : null,
  };
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

function StageBadge({ stage }: { stage: CredentialStageResult }) {
  return (
    <div className="p-3 rounded-md border border-silver-200 bg-surface-inset">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">{stage.stage}</span>
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${stageClass(stage.status)}`}>
          {stageLabel(stage.status)}
        </span>
      </div>
      <p className="text-[11px] leading-snug text-ink-muted">{stage.detail}</p>
      {stage.checkedFields.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {stage.checkedFields.map(field => (
            <span key={field} className="px-1.5 py-0.5 rounded bg-silver-100 border border-silver-200 text-[9px] font-mono text-ink-muted">
              {field}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminSetupPanel({ guide, requiredFields }: { guide: AdminSetupGuide; requiredFields: string[] }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-ink-muted">{guide.shortBlurb}</p>
      <a
        href={guide.portalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:underline"
      >
        Open developer portal ↗
      </a>
      {guide.steps.length > 0 && (
        <ol className="space-y-1.5 text-[11px] text-ink-muted list-decimal list-inside">
          {guide.steps.map((step, i) => (
            <li key={i} className="leading-snug">{step}</li>
          ))}
        </ol>
      )}
      {requiredFields.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-silver-200">
          <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Env vars to set</div>
          {requiredFields.map(field => (
            <div key={field} className="flex flex-col gap-0.5">
              <code className="text-[10px] font-mono font-bold text-ink-heading bg-surface-inset border border-silver-200 px-1.5 py-0.5 rounded w-fit">
                {field}
              </code>
              {guide.envVarDescriptions[field] && (
                <span className="text-[10px] text-ink-faint leading-snug pl-1">
                  {guide.envVarDescriptions[field]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OperatorSetupPanel({ guide }: { guide: OperatorSetupGuide }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-ink-muted">{guide.shortBlurb}</p>
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-inset border border-silver-200">
        <span className="text-[9px] font-semibold text-ink-faint uppercase tracking-wide">Model</span>
        <span className="text-[10px] font-mono text-ink-muted">{guide.connectionLabel}</span>
      </div>
      {guide.dealerPortalUrl && (
        <div>
          <a
            href={guide.dealerPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-navy-700 hover:underline"
          >
            Dealer signup portal ↗
          </a>
        </div>
      )}
      {guide.steps.length > 0 && (
        <ol className="space-y-1.5 text-[11px] text-ink-muted list-decimal list-inside">
          {guide.steps.map((step, i) => (
            <li key={i} className="leading-snug">{step}</li>
          ))}
        </ol>
      )}
      <div className="px-2 py-1.5 rounded bg-surface-inset border border-silver-200 text-[10px] text-ink-faint leading-relaxed">
        <span className="font-semibold">Validation: </span>{guide.validationNote}
      </div>
    </div>
  );
}

function PlatformIntroCard({
  description,
  capabilities,
  supportedCategories,
  externalLinks,
}: {
  description: string | null | undefined;
  capabilities: string[];
  supportedCategories: string[] | null | undefined;
  externalLinks: ExternalLink[] | null | undefined;
}) {
  const hasCategories = (supportedCategories?.length ?? 0) > 0;
  const hasCaps = capabilities.length > 0;
  const hasLinks = (externalLinks?.length ?? 0) > 0;
  if (!description && !hasCategories && !hasCaps && !hasLinks) return null;
  return (
    <div className="surface-card-operator p-5 space-y-4">
      {description && (
        <p className="text-sm text-ink-body leading-relaxed">{description}</p>
      )}

      {hasCategories && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide shrink-0">Categories</span>
          {supportedCategories!.map(cat => (
            <span key={cat} className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-navy-800 text-silver-300 border border-navy-700">
              {cat.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {hasCaps && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {capabilities.map(cap => (
            <div key={cap} className="flex flex-col gap-0.5 px-3 py-2 rounded-md bg-surface-inset border border-silver-200">
              <span className="text-[10px] font-bold text-ink-heading font-mono uppercase tracking-wide">{cap}</span>
              <span className="text-[10px] text-ink-faint leading-snug">{CAP_DESCRIPTIONS[cap] ?? 'Integration capability enabled.'}</span>
            </div>
          ))}
        </div>
      )}

      {hasLinks && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 border-t border-silver-100">
          <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide shrink-0">Reference</span>
          {externalLinks!.map(link => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-navy-700 hover:underline"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function RequirementList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <div className="text-[10px] text-ink-faint uppercase tracking-wide font-semibold mb-1">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-ink-faint">{empty}</div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map(item => (
            <span key={item} className="px-1.5 py-0.5 rounded bg-surface-inset border border-silver-200 text-[9px] font-mono text-ink-muted">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CredentialPanel({ slug, provider, contract: initialContract, onContractUpdate }: {
  slug: string;
  provider: ProviderCredentialSummary | undefined;
  contract: PlatformCredentialContractSummary;
  onContractUpdate?: (contract: PlatformCredentialContractSummary) => void;
}) {
  const [result, setResult]       = useState<ProviderCredentialResult | null>(null);
  const [contract, setContract] = useState<PlatformCredentialContractSummary>(initialContract);
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);

  const runValidation = async () => {
    setValidating(true);
    setValidateError(null);
    try {
      const run = await validatePlatformCredential(slug);
      const r = provider ? (run.results.find(r => r.provider === provider.provider) ?? null) : null;
      setResult(r);
      const nextContract = (run.platforms ?? []).find(p => p.platformSlug === slug);
      if (nextContract) {
        setContract(nextContract);
        onContractUpdate?.(nextContract);
      }
    } catch (e) {
      setValidateError(toErrorMessage(e));
    } finally {
      setValidating(false);
    }
  };

  const effectiveStatus = (contract.lastStatus ?? 'CONTRACT_MISSING') as PlatformCredentialDisplayStatus;
  const pill = CRED_STATUS[effectiveStatus ?? ''] ?? CRED_STATUS.CONTRACT_MISSING;
  const pillLabel = result?.status === 'valid' && result.checkMethod === 'client-auth-inference'
    ? 'Client auth inferred'
    : pill.label;
  const isInternal = contract.authType === 'internal' || contract.provider === 'internal';
  const missing = contract.missingFields;

  return (
    <div className="surface-card-operator p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <SectionHeader title="Credential Validation" />
        <button
          type="button"
          onClick={() => void runValidation()}
          disabled={validating}
          className="shrink-0 px-3 py-1.5 rounded text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-40 transition-colors"
        >
          {validating ? 'Validating…' : isInternal ? 'Validate Loop' : 'Validate'}
        </button>
      </div>

      {validateError && (
        <div className="px-3 py-2 bg-status-error-bg border border-status-error-border rounded text-xs text-status-error-text">
          {validateError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${pill.cls}`}>{pillLabel}</span>
        <span className="font-mono text-[10px] text-ink-faint">{contract.provider}</span>
        <span className="px-1.5 py-0.5 rounded bg-surface-inset border border-silver-200 text-[9px] font-semibold uppercase tracking-wide text-ink-muted">
          {contract.authType}
        </span>
        {contract.lastCheckedAt && (
          <span className="text-[10px] text-ink-faint">Last checked {timeAgo(contract.lastCheckedAt)}</span>
        )}
      </div>

      <div className={`px-3 py-2 rounded border text-xs leading-relaxed ${
        effectiveStatus === 'VALID' || effectiveStatus === 'INTERNAL'
          ? 'bg-status-success-bg border-status-success-border text-status-success-text'
          : effectiveStatus === 'VALIDATION_FAILED' || effectiveStatus === 'CONTRACT_MISSING'
            ? 'bg-status-error-bg border-status-error-border text-status-error-text'
            : 'bg-surface-inset border-silver-200 text-ink-muted'
      }`}>
        {credentialActionText(contract, effectiveStatus)}
      </div>

      {missing.length > 0 && (
        <div className="px-3 py-2 rounded border bg-status-warning-bg border-status-warning-border text-status-warning-text text-xs">
          Missing {formatList(missing)}.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <RequirementList
          title={isInternal ? 'Internal checks' : 'Required secrets'}
          items={isInternal ? contract.requiredCapabilities : contract.requiredFields}
          empty={isInternal ? 'No internal checks registered.' : 'No shared system secrets required.'}
        />
        <RequirementList
          title="Required scopes"
          items={contract.requiredScopes}
          empty={isInternal ? 'Internal platform does not use OAuth scopes.' : 'No OAuth scopes registered.'}
        />
        <RequirementList
          title="Permissions"
          items={contract.requiredPermissions}
          empty={isInternal ? 'Controlled by first-party route permissions.' : 'No provider permission notes registered.'}
        />
        <RequirementList
          title="Capability probe"
          items={contract.requiredCapabilities}
          empty="No capability checks registered."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {contract.stages.map(stage => (
          <StageBadge key={stage.stage} stage={stage} />
        ))}
      </div>

      {(result?.detail || contract.lastError || result?.checkMethod) && (
        <div className="pt-3 border-t border-silver-200 space-y-1 text-[10px] text-ink-faint">
          {result?.checkMethod && <div>Check method: <span className="font-mono text-ink-muted">{result.checkMethod}</span></div>}
          {result?.detail && <div>Detail: {result.detail}</div>}
          {contract.lastError && <div>Last error: {contract.lastError}</div>}
        </div>
      )}

      {provider && provider.platformSlugs.length > 1 && (
        <div className="pt-3 border-t border-silver-200">
          <div className="text-[10px] text-ink-faint uppercase tracking-wide font-semibold mb-1">Shared provider platforms</div>
          <div className="flex flex-wrap gap-1.5">
            {provider.platformSlugs.filter(s => s !== slug).map(s => (
              <a key={s} href={`#/admin/platforms/${s}`} className="font-mono text-[10px] text-navy-700 hover:underline">
                {s}
              </a>
            ))}
            {provider.platformSlugs.filter(s => s !== slug).length === 0 && (
              <span className="text-xs text-ink-faint">No other platforms share this provider.</span>
            )}
          </div>
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
  const [contractOverride, setContractOverride] = useState<PlatformCredentialContractSummary | null>(null);

  const platform = useMemo(
    () => platformOverview.find(p => p.platformSlug === slug),
    [platformOverview, slug],
  );

  const { data: credData, loading: credLoading } = useAsyncQuery(() => fetchPlatformCredentials(), []);
  const provider = useMemo(
    () => credData?.providers.find(p => p.platformSlugs.includes(slug)),
    [credData, slug],
  );
  const credentialContract = useMemo(() => {
    if (!platform) return null;
    return contractOverride ?? (credData?.platforms ?? []).find(p => p.platformSlug === slug) ?? contractFallback(slug, platform, provider);
  }, [contractOverride, credData, platform, provider, slug]);

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
  const lastActivity = platformEvents[0]?.createdAt ?? queueSnapshot?.lastSuccessSyncAt ?? null;

  const matCfg = MATURITY_CFG[platform?.integrationMaturity ?? ''] ?? {
    label: 'Unknown', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border', desc: '',
  };

  const effectiveCredentialStatus = credentialContract?.lastStatus ?? 'CONTRACT_MISSING';
  const credStatusPill = CRED_STATUS[effectiveCredentialStatus] ?? {
    label: 'Contract missing', cls: 'bg-surface-inset text-ink-faint border-silver-200',
  };
  const finalHealth = platform?.operationalStatus ?? (
    (effectiveCredentialStatus === 'VALID' || effectiveCredentialStatus === 'INTERNAL' || effectiveCredentialStatus === 'MANUAL_SETUP') && triageCritical === 0 && (platform?.recentFailures ?? 0) === 0
      ? 'green'
      : triageCritical > 0 || effectiveCredentialStatus === 'VALIDATION_FAILED' || effectiveCredentialStatus === 'CONTRACT_MISSING' || (platform?.recentFailures ?? 0) > 0
        ? 'red'
        : 'yellow'
  );

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
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    finalHealth === 'green'
                      ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                      : finalHealth === 'yellow'
                        ? 'bg-status-warning-bg text-status-warning-text border-status-warning-border'
                        : 'bg-status-error-bg text-status-error-text border-status-error-border'
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${healthClass(finalHealth)}`} />
                    {finalHealth}
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
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${matCfg.cls}`}>
                    {matCfg.label}
                  </span>
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


            </div>
          </div>

          {/* ── Platform intro ── */}
          <PlatformIntroCard
            description={credentialContract?.description}
            capabilities={platform.capabilities}
            supportedCategories={platform.supportedCategories}
            externalLinks={credentialContract?.externalLinks}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            <StatCard value={platform.dealersUsing} label="Connected dealers" sub={`${platform.eligibleDealers ?? 0} eligible`} />
            <StatCard value={platform.liveInventory ?? 0} label="Live inventory" sub="active evidence" />
            <StatCard value={platform.outboundToday ?? 0} label="Outbound 24h" sub={`${platform.outbound7d ?? 0} in 7d`} />
            <StatCard value={platform.outboundAllTime ?? 0} label="Outbound all" />
            <StatCard value={platform.recentFailures ?? 0} label="Failures 24h" valueClass={(platform.recentFailures ?? 0) > 0 ? 'text-status-error-text' : 'text-ink-heading'} />
            <StatCard value={`${platform.blockedDealers}/${platform.blockedItems ?? 0}`} label="Blocked" sub="dealers/items" valueClass={platform.blockedDealers + (platform.blockedItems ?? 0) > 0 ? 'text-status-error-text' : 'text-ink-heading'} />
            <StatCard value={lastActivity ? timeAgo(lastActivity) : 'Never'} label="Last activity" />
          </div>

          {/* ── Main two-column layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

            {/* Left: 2/3 */}
            <div className="lg:col-span-2 space-y-5">

              {credLoading || !credentialContract ? (
                <div className="surface-card-operator p-4"><Skeleton rows={6} /></div>
              ) : (
                <CredentialPanel
                  slug={slug}
                  provider={provider}
                  contract={credentialContract}
                  onContractUpdate={setContractOverride}
                />
              )}

              <div className="surface-card-operator p-4">
                <SectionHeader title="Dealer Connections" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatCard value={platform.dealersUsing} label="Connected" sub="started applications" />
                  <StatCard value={platform.eligibleDealers ?? 0} label="Eligible" sub="active for outbound" />
                  <StatCard
                    value={platform.blockedDealers}
                    label="Blocked dealers"
                    sub={platform.blockedDealers > 0 ? 'needs admin action' : 'none blocked'}
                    valueClass={platform.blockedDealers > 0 ? 'text-status-error-text' : 'text-ink-heading'}
                  />
                </div>
                {platform.dealersUsing === 0 ? (
                  <div className="mt-3 py-4 text-center text-xs text-ink-faint border border-dashed border-silver-200 rounded-md">
                    No dealers have started using this platform. Configure credentials first, then onboard a dealer connection.
                  </div>
                ) : platform.blockedDealers > 0 ? (
                  <p className="mt-3 text-xs text-status-warning-text">
                    {platform.blockedDealers} dealer connection{platform.blockedDealers === 1 ? '' : 's'} need review before outbound traffic can run.
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-ink-muted">
                    Dealer connections are not currently blocking this platform.
                  </p>
                )}
              </div>

              <div className="surface-card-operator p-4">
                <SectionHeader title="Inventory & Publishing" />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <StatCard value={platform.liveInventory ?? 0} label="Live" sub="listing/post/sent evidence" />
                  <StatCard value={platform.outboundToday ?? 0} label="Today" sub="sent in 24h" />
                  <StatCard value={platform.outbound7d ?? 0} label="7 days" sub="sent outbound" />
                  <StatCard value={platform.outboundAllTime ?? 0} label="All time" sub="sent outbound" />
                </div>
                {(platform.liveInventory ?? 0) === 0 ? (
                  <div className="mt-3 py-4 text-center text-xs text-ink-faint border border-dashed border-silver-200 rounded-md">
                    No live inventory evidence yet. Validate credentials, confirm eligible dealers, then publish or sync inventory.
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-ink-muted">
                    This platform has active outbound evidence. Use Recent History below for the event timeline.
                  </p>
                )}
              </div>

              {/* Pipeline health */}
              {queueSnapshot && (
                <div className="surface-card-operator p-4">
                  <SectionHeader title="Queue & Sync Health" />
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
                <SectionHeader title="Active Failures & Blockers" count={platformTriage.length + (platform.recentFailures ?? 0) + (platform.blockedItems ?? 0)} />
                {((platform.recentFailures ?? 0) > 0 || (platform.blockedItems ?? 0) > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <StatCard
                      value={platform.recentFailures ?? 0}
                      label="Recent failures"
                      sub="failed jobs/events in 24h"
                      valueClass={(platform.recentFailures ?? 0) > 0 ? 'text-status-error-text' : 'text-ink-heading'}
                    />
                    <StatCard
                      value={platform.blockedItems ?? 0}
                      label="Blocked items"
                      sub="held or blocked queue items"
                      valueClass={(platform.blockedItems ?? 0) > 0 ? 'text-status-error-text' : 'text-ink-heading'}
                    />
                  </div>
                )}
                {platformTriage.length === 0 ? (
                  <div className="py-6 text-center text-xs text-ink-faint border border-dashed border-silver-200 rounded-md">
                    No active triage rows for this platform. If failures exist above, use queue tooling to inspect failed jobs.
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
                  title="Recent History"
                  count={platformEvents.length}
                />
                {platformEvents.length === 0 ? (
                  <div className="py-6 text-center text-xs text-ink-faint border border-dashed border-silver-200 rounded-md">
                    No recent events found for this platform. Validate credentials or run a sync to create fresh history.
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

                {(platform.supportedCategories?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-[10px] text-ink-faint uppercase tracking-wide font-semibold mb-1.5">
                      Supported Categories
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {platform.supportedCategories?.map(cat => (
                        <span key={cat} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-status-neutral-bg text-status-neutral-text border border-status-neutral-border">
                          {cat.replace(/_/g, ' ')}
                        </span>
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

              <div className="surface-card-operator p-4 space-y-5">
                <SectionHeader title="Setup Guide" />
                {!credentialContract ? (
                  <div className="py-4 text-center text-xs text-ink-faint border border-dashed border-silver-200 rounded-md">
                    Credential contract is still loading.
                  </div>
                ) : (
                  <>
                    {/* Admin track */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Admin — Developer Credentials</span>
                        {credentialContract.docsUrl && (
                          <a href={credentialContract.docsUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-navy-700 hover:underline">API docs ↗</a>
                        )}
                      </div>
                      {credentialContract.adminSetup ? (
                        <AdminSetupPanel
                          guide={credentialContract.adminSetup}
                          requiredFields={credentialContract.requiredFields}
                        />
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] text-ink-muted">
                            {credentialContract.authType === 'internal'
                              ? 'Owned first-party platform. No external developer keys required.'
                              : 'No developer key setup guide is registered for this platform.'}
                          </p>
                          {credentialContract.requiredFields.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {credentialContract.requiredFields.map(field => (
                                <code key={field} className="text-[10px] font-mono font-bold text-ink-heading bg-surface-inset border border-silver-200 px-1.5 py-0.5 rounded">
                                  {field}
                                </code>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Operator track */}
                    <div className="pt-4 border-t border-silver-200">
                      <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">Operator — Dealer Connection</div>
                      {credentialContract.operatorSetup ? (
                        <OperatorSetupPanel guide={credentialContract.operatorSetup} />
                      ) : (
                        <p className="text-[11px] text-ink-muted">
                          {credentialContract.connectionModel
                            ? `Connection model: ${credentialContract.connectionModel}.`
                            : 'No dealer connection guide is registered for this platform.'}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-3 border-t border-silver-200">
                      <a href="#/admin/platforms" className="text-xs font-semibold text-navy-700 hover:underline">Platform Credentials</a>
                    </div>
                  </>
                )}
              </div>

              <div className="surface-card-operator p-4">
                <SectionHeader title="Related Platforms" />
                {provider && provider.platformSlugs.filter(s => s !== slug).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {provider.platformSlugs.filter(s => s !== slug).map(s => (
                      <a key={s} href={`#/admin/platforms/${s}`} className="font-mono text-[10px] text-navy-700 hover:underline">
                        {s}
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-ink-faint border border-dashed border-silver-200 rounded-md">
                    No other platform rows share this provider contract.
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
