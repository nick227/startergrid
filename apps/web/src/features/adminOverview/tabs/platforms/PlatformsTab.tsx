import { useEffect, useMemo, useState } from 'react';
import { BUSINESS_CATEGORY_IDS } from '@auto-dealer/category-schemas';
import {
  fetchPlatformCredentials,
  validatePlatformCredential,
  validatePlatformCredentials,
  type AdminDashboardResponse,
  type PlatformCredentialContractSummary,
  type PlatformCredentialDisplayStatus,
  type ProviderCredentialResultWithContracts,
  type ProviderCredentialSummaryWithContracts,
  type OperatorSetupGuide,
} from '@/lib/api/admin.ts';
import { adminPlatformHash } from '@/lib/routes.ts';
import { ResultCount, SortableHeaderCell, type SortDir } from '@/features/adminOverview/components/index.ts';
import { CAP_CLS, CLEAR_CLS, INPUT_CLS, SELECT_CLS } from '@/features/adminOverview/constants/styles.ts';
import {
  VALIDATION_CFG,
  VALIDATION_DEFAULT,
} from '@/features/adminOverview/constants/statusConfig.ts';

type PlatformOverviewItemWithCategories = AdminDashboardResponse['platformOverview'][number] & {
  supportedCategories?: string[];
};

type PlatSortField = 'platformName' | 'dealersUsing' | 'liveInventory' | 'outbound7d' | 'recentFailures' | 'blockedDealers';

type Props = {
  platformOverview: PlatformOverviewItemWithCategories[];
};

const INTERNAL_MARKETPLACE_CHECKS = [
  'Marketplace route',
  'Publish endpoint',
  'Listing visibility',
  'Lead capture',
  'Buyer event flow',
  'Sold notification flow',
];

function formatList(items: string[]): string {
  return items.length > 0 ? items.join(' + ') : 'none';
}

function connectionModelLabel(model: string | undefined): string {
  if (model === 'shared-system-oauth') return 'Shared OAuth';
  if (model === 'dealer-oauth') return 'Dealer OAuth';
  if (model === 'shared-system-api-key') return 'Shared API Key';
  if (model === 'partner-feed') return 'Partner Feed';
  if (model === 'manual-portal') return 'Manual Portal';
  if (model === 'internal-route') return 'Internal';
  if (model === 'none') return 'None';
  return model ?? '—';
}

function connectionModelClass(model: string | undefined): string {
  if (model === 'shared-system-oauth' || model === 'shared-system-api-key') return 'bg-status-info-bg text-status-info-text border-status-info-border';
  if (model === 'dealer-oauth') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (model === 'partner-feed') return 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
  if (model === 'manual-portal') return 'bg-status-warning-bg text-status-warning-text border-status-warning-border';
  if (model === 'internal-route') return 'bg-status-success-bg text-status-success-text border-status-success-border';
  return 'bg-surface-inset text-ink-faint border-silver-200';
}

function describeSystemCredentialGap(platform: PlatformOverviewItemWithCategories, providerName: string): string {
  if (platform.platformType === 'internal') {
    return 'Internal platform: validate first-party routes and event loops. No external developer keys.';
  }
  if (providerName === 'unregistered') {
    return 'No shared system credential contract was returned. This platform likely uses dealer credentials, partner feed credentials, or a manual portal workflow.';
  }
  return 'Provider is registered, but no required system fields were returned. Add platform credential contract metadata before live validation.';
}

function statusFromProviderFallback(
  platform: PlatformOverviewItemWithCategories,
  provider: ProviderCredentialSummaryWithContracts | ProviderCredentialResultWithContracts | undefined,
  requiredFields: string[],
  missingFields: string[],
): PlatformCredentialDisplayStatus {
  if (platform.platformSlug === 'consumer-marketplace' || platform.platformType === 'internal') return 'INTERNAL';
  if (!provider) return 'CONTRACT_MISSING';
  if (requiredFields.length === 0) return 'MANUAL_SETUP';
  if (missingFields.length > 0 || provider.configured === false) return 'NOT_CONFIGURED';
  if ('status' in provider) {
    if (provider.status === 'valid') return 'VALID';
    if (provider.status === 'unsupported') return 'READY_TO_VALIDATE';
    return 'VALIDATION_FAILED';
  }
  return 'READY_TO_VALIDATE';
}

function configDetail(
  platform: PlatformOverviewItemWithCategories,
  providerName: string,
  requiredFields: string[],
  missingFields: string[],
): string {
  if (platform.platformSlug === 'consumer-marketplace' || platform.platformType === 'internal') {
    return 'No external secrets required. Checks cover first-party route and event-loop health.';
  }
  if (missingFields.length > 0) return `Missing ${formatList(missingFields)}.`;
  if (requiredFields.length > 0) return `Requires ${formatList(requiredFields)}.`;
  return describeSystemCredentialGap(platform, providerName);
}

function providerForPlatform(
  providers: ProviderCredentialSummaryWithContracts[] | ProviderCredentialResultWithContracts[] | undefined,
  platformSlug: string,
) {
  return providers?.find(provider => provider.platformSlugs.includes(platformSlug));
}

function fallbackContract(
  platform: PlatformOverviewItemWithCategories,
  provider?: ProviderCredentialSummaryWithContracts | ProviderCredentialResultWithContracts,
): PlatformCredentialContractSummary {
  const isResult = provider && 'status' in provider;
  const isInternal = platform.platformSlug === 'consumer-marketplace' || platform.platformType === 'internal';
  const missingFields = provider?.missingFields ?? (provider?.configured === false ? provider.envVars : []);
  const requiredFields = isInternal ? [] : provider?.envVars ?? [];
  const providerName = isInternal ? 'internal' : provider?.provider ?? 'unregistered';
  const requiredCapabilities = isInternal ? INTERNAL_MARKETPLACE_CHECKS : platform.capabilities;
  const status = statusFromProviderFallback(platform, provider, requiredFields, missingFields);
  const notes = isInternal
    ? 'Internal platform: validate marketplace route, publish, lead capture, buyer events, and sold notifications.'
    : requiredFields.length > 0
      ? 'System credential requirements are known; run Validate to test provider auth and permissions.'
      : describeSystemCredentialGap(platform, providerName);

  return {
    platformSlug: platform.platformSlug,
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
        detail: configDetail(platform, providerName, requiredFields, missingFields),
        checkedFields: isInternal ? [] : requiredFields,
      },
      {
        stage: 'auth',
        status: isResult ? status : 'READY_TO_VALIDATE',
        detail: isResult
          ? provider.detail
          : isInternal
            ? 'Internal route authorization has not been checked.'
            : 'Provider auth has not been checked.',
        checkedFields: isResult && provider.checkMethod !== 'none' ? provider.envVars : [],
      },
      {
        stage: 'permissions',
        status: requiredFields.length > 0 ? 'READY_TO_VALIDATE' : status,
        detail: isInternal
          ? 'Internal workflow permissions have not been checked.'
          : 'Required provider scopes and permissions have not been checked.',
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
    lastError: isResult && provider.status !== 'valid' && provider.status !== 'unsupported'
      ? provider.detail
      : missingFields.length > 0
        ? `Missing ${formatList(missingFields)}.`
        : null,
  };
}

function buildCredentialMap(
  platforms: PlatformOverviewItemWithCategories[],
  contracts: PlatformCredentialContractSummary[] | undefined,
  providers: ProviderCredentialSummaryWithContracts[] | undefined,
  results?: ProviderCredentialResultWithContracts[],
): Map<string, PlatformCredentialContractSummary> {
  const map = new Map<string, PlatformCredentialContractSummary>();
  for (const contract of contracts ?? []) map.set(contract.platformSlug, contract);
  for (const platform of platforms) {
    if (map.has(platform.platformSlug)) continue;
    const provider = providerForPlatform(results, platform.platformSlug)
      ?? providerForPlatform(providers, platform.platformSlug);
    map.set(platform.platformSlug, fallbackContract(platform, provider));
  }
  return map;
}

export function PlatformsTab({ platformOverview }: Props) {
  const [platSearch, setPlatSearch] = useState('');
  const [platCap, setPlatCap] = useState('');
  const [platCategory, setPlatCategory] = useState('');
  const [platValidation, setPlatValidation] = useState('');
  const [platSort, setPlatSort] = useState<PlatSortField>('platformName');
  const [platDir, setPlatDir] = useState<SortDir>('asc');
  const [credentialMap, setCredentialMap] = useState<Map<string, PlatformCredentialContractSummary>>(new Map());
  const [validating, setValidating] = useState(false);
  const [validatingSlug, setValidatingSlug] = useState<string | null>(null);
  const [validationMeta, setValidationMeta] = useState<{ checkedAt: Date; durationMs: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPlatformCredentials()
      .then(res => {
        if (cancelled) return;
        setCredentialMap(buildCredentialMap(platformOverview, res.platforms, res.providers));
      })
      .catch(() => {
        if (!cancelled) setCredentialMap(buildCredentialMap(platformOverview, [], []));
      });
    return () => { cancelled = true; };
  }, [platformOverview]);

  const filteredPlatforms = useMemo(() => {
    let list = [...platformOverview];
    if (platSearch) {
      const q = platSearch.toLowerCase();
      list = list.filter(p =>
        p.platformName.toLowerCase().includes(q) ||
        p.platformSlug.toLowerCase().includes(q),
      );
    }
    if (platCap) list = list.filter(p => p.capabilities.includes(platCap));
    if (platCategory) list = list.filter(p => p.supportedCategories?.includes(platCategory));
    if (platValidation) {
      list = list.filter(p => validationStatus(credentialMap.get(p.platformSlug)) === platValidation);
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (platSort === 'platformName') cmp = a.platformName.localeCompare(b.platformName);
      else if (platSort === 'dealersUsing') cmp = a.dealersUsing - b.dealersUsing;
      else if (platSort === 'liveInventory') cmp = (a.liveInventory ?? 0) - (b.liveInventory ?? 0);
      else if (platSort === 'outbound7d') cmp = (a.outbound7d ?? 0) - (b.outbound7d ?? 0);
      else if (platSort === 'recentFailures') cmp = (a.recentFailures ?? 0) - (b.recentFailures ?? 0);
      else if (platSort === 'blockedDealers') cmp = a.blockedDealers - b.blockedDealers;
      return platDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [credentialMap, platformOverview, platSearch, platCap, platCategory, platValidation, platSort, platDir]);

  const platActiveFilters = [platSearch, platCategory, platCap, platValidation].filter(Boolean).length;

  function togglePlat(field: PlatSortField) {
    if (platSort === field) setPlatDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
    else {
      setPlatSort(field);
      setPlatDir('asc');
    }
  }

  async function runValidation() {
    setValidating(true);
    try {
      const valRes = await validatePlatformCredentials();
      setCredentialMap(buildCredentialMap(platformOverview, valRes.platforms, [], valRes.results));
      setValidationMeta({ checkedAt: new Date(), durationMs: valRes.meta?.durationMs ?? 0 });
    } finally {
      setValidating(false);
    }
  }

  async function runRowValidation(platformSlug: string) {
    setValidatingSlug(platformSlug);
    try {
      const valRes = await validatePlatformCredential(platformSlug);
      setCredentialMap(prev => {
        const next = new Map(prev);
        for (const platform of valRes.platforms ?? []) next.set(platform.platformSlug, platform);
        if ((valRes.platforms ?? []).length === 0) {
          const overview = platformOverview.find(platform => platform.platformSlug === platformSlug);
          if (overview) {
            const provider = providerForPlatform(valRes.results, platformSlug);
            next.set(platformSlug, fallbackContract(overview, provider));
          }
        }
        return next;
      });
      setValidationMeta({ checkedAt: new Date(), durationMs: valRes.meta?.durationMs ?? 0 });
    } finally {
      setValidatingSlug(null);
    }
  }

  function validationCopy(platform: PlatformOverviewItemWithCategories, contract: PlatformCredentialContractSummary | undefined): string {
    if (!contract) return 'Credential contract was not returned by the API.';
    const requirements = contract.requiredFields.length > 0
      ? contract.requiredFields.join(' + ')
      : contract.requiredCapabilities.join(' + ');
    if (contract.lastStatus === 'READY_TO_VALIDATE') {
      return requirements
        ? `Ready to validate — requires ${requirements}.`
        : contract.notes;
    }
    if (contract.lastStatus === 'VALID') {
      const checked = contract.checkedFields.length > 0 ? contract.checkedFields.join(' + ') : contract.authType;
      return `Checked ${checked}.`;
    }
    if (contract.lastError) return contract.lastError;
    if (contract.missingFields.length > 0) return contract.missingFields.length === 1
      ? `Missing ${contract.missingFields[0]}`
      : `Missing ${contract.missingFields.join(' + ')}`;
    return contract.notes || platform.liveValidationStatus || 'Credential contract missing.';
  }

  function validationStatus(contract: PlatformCredentialContractSummary | undefined): PlatformCredentialDisplayStatus {
    return contract?.lastStatus ?? 'CONTRACT_MISSING';
  }

  function validationText(status: PlatformCredentialDisplayStatus): string {
    if (status === 'VALID') return 'valid';
    if (status === 'NOT_CONFIGURED') return 'missing config';
    if (status === 'READY_TO_VALIDATE') return 'ready to validate';
    if (status === 'VALIDATION_FAILED') return 'validation failed';
    if (status === 'MANUAL_SETUP') return 'partner/feed credentials';
    if (status === 'INTERNAL') return 'internal';
    if (status === 'CONTRACT_MISSING') return 'contract missing';
    return status;
  }

  function operationalStatus(platform: PlatformOverviewItemWithCategories, validation: PlatformCredentialDisplayStatus): 'green' | 'yellow' | 'red' {
    if (platform.operationalStatus) return platform.operationalStatus;
    if (validation === 'VALIDATION_FAILED' || validation === 'CONTRACT_MISSING' || (platform.recentFailures ?? 0) > 0) return 'red';
    if ((validation !== 'VALID' && validation !== 'INTERNAL' && validation !== 'MANUAL_SETUP') || platform.blockedDealers > 0 || (platform.blockedItems ?? 0) > 0) return 'yellow';
    return 'green';
  }

  function statusDotClass(status: 'green' | 'yellow' | 'red'): string {
    if (status === 'green') return 'bg-status-success-text';
    if (status === 'yellow') return 'bg-status-warning-text';
    return 'bg-status-error-text';
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={platSearch}
          onChange={e => setPlatSearch(e.target.value)}
          placeholder="Search platforms…"
          className={`${INPUT_CLS} w-44`}
        />
        <select value={platCategory} onChange={e => setPlatCategory(e.target.value)} className={SELECT_CLS}>
          <option value="">All Categories</option>
          {BUSINESS_CATEGORY_IDS.map(id => (
            <option key={id} value={id}>{id.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={platCap} onChange={e => setPlatCap(e.target.value)} className={SELECT_CLS}>
          <option value="">All Capabilities</option>
          <option value="catalogSync">Catalog Sync</option>
          <option value="socialPosting">Social Posting</option>
          <option value="marketplaceListing">Marketplace Listing</option>
          <option value="partnerFeed">Partner Feed</option>
          <option value="leadCapture">Lead Capture</option>
        </select>
        <select value={platValidation} onChange={e => setPlatValidation(e.target.value)} className={SELECT_CLS}>
          <option value="">All Validation States</option>
          <option value="VALID">Valid</option>
          <option value="NOT_CONFIGURED">Not Configured</option>
          <option value="READY_TO_VALIDATE">Ready to Validate</option>
          <option value="VALIDATION_FAILED">Validation Failed</option>
          <option value="MANUAL_SETUP">Manual Setup</option>
          <option value="INTERNAL">Internal</option>
          <option value="CONTRACT_MISSING">Contract Missing</option>
        </select>
        {platActiveFilters > 0 && (
          <button type="button" onClick={() => { setPlatSearch(''); setPlatCategory(''); setPlatCap(''); setPlatValidation(''); }} className={CLEAR_CLS}>
            Clear ({platActiveFilters})
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          {validationMeta && (
            <span className="text-[10px] text-ink-faint">
              Validated {validationMeta.checkedAt.toLocaleTimeString()} · {validationMeta.durationMs}ms
            </span>
          )}
          {!validationMeta && filteredPlatforms.filter(p => credentialMap.get(p.platformSlug)?.lastStatus === 'VALIDATION_FAILED').length > 0 && (
            <span className="text-xs text-status-error-text">
              {filteredPlatforms.filter(p => credentialMap.get(p.platformSlug)?.lastStatus === 'VALIDATION_FAILED').length} failed
            </span>
          )}
          <button
            type="button"
            onClick={() => void runValidation()}
            disabled={validating}
            className="px-3 py-1.5 text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-silver-100 rounded-md transition-colors disabled:opacity-40"
          >
            {validating ? 'Validating…' : 'Validate Credentials'}
          </button>
        </div>
      </div>

      <ResultCount shown={filteredPlatforms.length} total={platformOverview.length} noun="platform" />

      <div className="surface-card-operator overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
              <SortableHeaderCell isActive={platSort === 'platformName'} dir={platDir} onClick={() => togglePlat('platformName')}>Platform</SortableHeaderCell>
              <th className="px-4 py-3 font-semibold">Connection</th>
              <th className="px-4 py-3 font-semibold">Validation</th>
              <SortableHeaderCell isActive={platSort === 'dealersUsing'} dir={platDir} onClick={() => togglePlat('dealersUsing')}>Dealers</SortableHeaderCell>
              <SortableHeaderCell isActive={platSort === 'liveInventory'} dir={platDir} onClick={() => togglePlat('liveInventory')}>Live</SortableHeaderCell>
              <SortableHeaderCell isActive={platSort === 'outbound7d'} dir={platDir} onClick={() => togglePlat('outbound7d')}>Outbound</SortableHeaderCell>
              <SortableHeaderCell isActive={platSort === 'recentFailures'} dir={platDir} onClick={() => togglePlat('recentFailures')}>Failures</SortableHeaderCell>
              <SortableHeaderCell isActive={platSort === 'blockedDealers'} dir={platDir} onClick={() => togglePlat('blockedDealers')}>Blocked</SortableHeaderCell>
              <th className="px-4 py-3 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlatforms.map(platform => {
              const contract = credentialMap.get(platform.platformSlug);
              const status = validationStatus(contract);
              const valCfg = VALIDATION_CFG[status] ?? VALIDATION_DEFAULT;
              const visibleStages = contract?.stages.filter(stage => stage.status !== 'READY_TO_VALIDATE' || stage.stage === 'config').slice(0, 3) ?? [];
              const opStatus = operationalStatus(platform, status);
              return (
                <tr key={platform.platformSlug} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors">
                  <td className="px-4 py-3 min-w-[280px]">
                    <a href={adminPlatformHash(platform.platformSlug)} className="font-semibold text-navy-700 hover:text-navy-600 hover:underline text-sm">
                      {platform.platformName}
                    </a>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-ink-faint font-mono mt-0.5">
                      {platform.platformSlug}
                      <span className="px-1.5 py-0.5 rounded bg-surface-inset border border-silver-200 text-[9px] font-semibold uppercase tracking-wide">
                        {platform.platformType ?? (platform.configured ? 'external' : 'internal')}
                      </span>
                      {!platform.configured && <span className="ml-1.5 text-ink-faint">· not configured</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(platform.supportedCategories ?? []).map(category => (
                        <span key={category} className={`px-1.5 py-0.5 bg-blue-100 rounded text-[9px] font-semibold uppercase tracking-wide ${CAP_CLS}`}>
                          {category.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {platform.capabilities.map(cap => (
                        <span key={cap} className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-surface-inset text-ink-muted border border-silver-200">
                          {cap}
                        </span>
                      ))}
                      {(platform.supportedCategories?.length ?? 0) === 0 && platform.capabilities.length === 0 && (
                        <span className="text-xs text-ink-faint bg-pink-100">No linked categories or capabilities</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 min-w-[180px]">
                    {(() => {
                      const model = contract?.connectionModel;
                      const opGuide = contract?.operatorSetup;
                      return (
                        <div className="space-y-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-semibold uppercase tracking-wide ${connectionModelClass(model)}`}>
                            {connectionModelLabel(model)}
                          </span>
                          {opGuide && (
                            <p className="text-[10px] text-ink-faint leading-snug">{opGuide.shortBlurb}</p>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[320px] space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${valCfg.cls}`}>{validationText(status)}</span>
                        <button
                          type="button"
                          onClick={() => void runRowValidation(platform.platformSlug)}
                          disabled={validating || validatingSlug === platform.platformSlug}
                          className="px-2 py-1 text-[10px] font-semibold text-navy-700 border border-silver-300 hover:border-navy-300 hover:bg-navy-50 rounded transition-colors disabled:opacity-40"
                        >
                          {validatingSlug === platform.platformSlug ? 'Checking…' : 'Validate'}
                        </button>
                      </div>
                      <p className="text-[11px] leading-snug text-ink-muted">
                        {validationCopy(platform, contract)}
                      </p>
                      {visibleStages.length > 0 && (
                        <div className="space-y-0.5">
                          {visibleStages.map(stage => (
                            <div key={`${stage.stage}-${stage.detail}`} className="text-[10px] text-ink-faint">
                              <span className="font-semibold uppercase">{stage.stage}</span>: {stage.detail}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-ink-heading text-sm">{platform.dealersUsing}</span>
                    <div className="text-[10px] text-ink-faint mt-0.5">{platform.eligibleDealers ?? 0} eligible</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-ink-heading text-sm">{platform.liveInventory ?? 0}</span>
                    <div className="text-[10px] text-ink-faint mt-0.5">active</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-heading">
                    {(platform.outboundToday ?? 0)} / {(platform.outbound7d ?? 0)} / {(platform.outboundAllTime ?? 0)}
                    <div className="font-sans text-[10px] text-ink-faint mt-0.5">24h / 7d / all</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold text-sm ${(platform.recentFailures ?? 0) > 0 ? 'text-status-error-text' : 'text-ink-heading'}`}>
                      {platform.recentFailures ?? 0}
                    </span>
                    <div className="text-[10px] text-ink-faint mt-0.5">24h</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold text-sm ${platform.blockedDealers + (platform.blockedItems ?? 0) > 0 ? 'text-status-error-text' : 'text-ink-heading'}`}>
                      {platform.blockedDealers} / {platform.blockedItems ?? 0}
                    </span>
                    <div className="text-[10px] text-ink-faint mt-0.5">dealers / items</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${statusDotClass(opStatus)}`}
                      title={opStatus}
                      aria-label={`Operational status ${opStatus}`}
                    />
                  </td>
                </tr>
              );
            })}
            {filteredPlatforms.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-ink-faint text-sm">No platforms match the selected filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
