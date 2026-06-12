import { useMemo, useState } from 'react';
import { BUSINESS_CATEGORY_IDS } from '@auto-dealer/category-schemas';
import {
  fetchPlatformCredentials,
  validatePlatformCredentials,
  type AdminDashboardResponse,
  type ProviderCredentialResult,
} from '@/lib/api/admin.ts';
import { adminPlatformHash } from '@/lib/routes.ts';
import { ResultCount, SortableHeaderCell, type SortDir } from '@/features/adminOverview/components/index.ts';
import { CAP_CLS, CLEAR_CLS, INPUT_CLS, SELECT_CLS } from '@/features/adminOverview/constants/styles.ts';
import {
  MATURITY_CFG,
  MATURITY_DEFAULT,
  VALIDATION_CFG,
  VALIDATION_DEFAULT,
} from '@/features/adminOverview/constants/statusConfig.ts';
import { MATURITY_ORDER } from '@/features/adminOverview/constants/platformConfig.ts';

type PlatformOverviewItemWithCategories = AdminDashboardResponse['platformOverview'][number] & {
  supportedCategories?: string[];
};

type PlatSortField = 'platformName' | 'dealersUsing' | 'maturity';

type Props = {
  platformOverview: PlatformOverviewItemWithCategories[];
};

export function PlatformsTab({ platformOverview }: Props) {
  const [platSearch, setPlatSearch] = useState('');
  const [platCap, setPlatCap] = useState('');
  const [platCategory, setPlatCategory] = useState('');
  const [platValidation, setPlatValidation] = useState('');
  const [platMaturity, setPlatMaturity] = useState('');
  const [platSort, setPlatSort] = useState<PlatSortField>('platformName');
  const [platDir, setPlatDir] = useState<SortDir>('asc');
  const [liveValidationMap, setLiveValidationMap] = useState<Map<string, ProviderCredentialResult> | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationMeta, setValidationMeta] = useState<{ checkedAt: Date; durationMs: number } | null>(null);

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
    if (platValidation) list = list.filter(p => p.liveValidationStatus === platValidation);
    if (platMaturity) list = list.filter(p => p.integrationMaturity === platMaturity);
    list.sort((a, b) => {
      let cmp = 0;
      if (platSort === 'platformName') cmp = a.platformName.localeCompare(b.platformName);
      else if (platSort === 'dealersUsing') cmp = a.dealersUsing - b.dealersUsing;
      else if (platSort === 'maturity') cmp = (MATURITY_ORDER[a.integrationMaturity ?? ''] ?? 3) - (MATURITY_ORDER[b.integrationMaturity ?? ''] ?? 3);
      return platDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [platformOverview, platSearch, platCap, platCategory, platValidation, platMaturity, platSort, platDir]);

  const platActiveFilters = [platSearch, platCategory, platCap, platValidation, platMaturity].filter(Boolean).length;

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
      const [valRes, credRes] = await Promise.all([
        validatePlatformCredentials(),
        fetchPlatformCredentials(),
      ]);
      const slugMap = new Map<string, ProviderCredentialResult>();
      for (const result of valRes.results) {
        const provider = credRes.providers.find(p => p.provider === result.provider);
        if (provider) provider.platformSlugs.forEach(slug => slugMap.set(slug, result));
      }
      setLiveValidationMap(slugMap);
      setValidationMeta({ checkedAt: new Date(), durationMs: valRes.meta?.durationMs ?? 0 });
    } finally {
      setValidating(false);
    }
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
          <option value="valid">Valid</option>
          <option value="invalid">Invalid</option>
          <option value="not-configured">Not Configured</option>
          <option value="unsupported">No Live Check</option>
        </select>
        <select value={platMaturity} onChange={e => setPlatMaturity(e.target.value)} className={SELECT_CLS}>
          <option value="">All Maturities</option>
          <option value="PRODUCTION_READY">Production Ready</option>
          <option value="BETA">Beta</option>
          <option value="ALPHA">Alpha</option>
        </select>
        {platActiveFilters > 0 && (
          <button type="button" onClick={() => { setPlatSearch(''); setPlatCategory(''); setPlatCap(''); setPlatValidation(''); setPlatMaturity(''); }} className={CLEAR_CLS}>
            Clear ({platActiveFilters})
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          {validationMeta && (
            <span className="text-[10px] text-ink-faint">
              Validated {validationMeta.checkedAt.toLocaleTimeString()} · {validationMeta.durationMs}ms
            </span>
          )}
          {!validationMeta && filteredPlatforms.filter(p => p.liveValidationStatus === 'invalid').length > 0 && (
            <span className="text-xs text-status-error-text">
              {filteredPlatforms.filter(p => p.liveValidationStatus === 'invalid').length} invalid
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
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
              <SortableHeaderCell isActive={platSort === 'platformName'} dir={platDir} onClick={() => togglePlat('platformName')}>Platform</SortableHeaderCell>
              <th className="px-4 py-3 font-semibold">Validation</th>
              <th className="px-4 py-3 font-semibold">Capabilities</th>
              <SortableHeaderCell isActive={platSort === 'dealersUsing'} dir={platDir} onClick={() => togglePlat('dealersUsing')}>Dealers</SortableHeaderCell>
              <SortableHeaderCell isActive={platSort === 'maturity'} dir={platDir} onClick={() => togglePlat('maturity')}>Maturity</SortableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {filteredPlatforms.map(platform => {
              const liveValidation = liveValidationMap?.get(platform.platformSlug);
              const valCfg = VALIDATION_CFG[liveValidation?.status ?? platform.liveValidationStatus ?? ''] ?? VALIDATION_DEFAULT;
              const matCfg = MATURITY_CFG[platform.integrationMaturity ?? ''] ?? MATURITY_DEFAULT;
              return (
                <tr key={platform.platformSlug} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors">
                  <td className="px-4 py-3">
                    <a href={adminPlatformHash(platform.platformSlug)} className="font-semibold text-navy-700 hover:text-navy-600 hover:underline text-sm">
                      {platform.platformName}
                    </a>
                    <div className="text-[10px] text-ink-faint font-mono mt-0.5">
                      {platform.platformSlug}
                      {!platform.configured && <span className="ml-1.5 text-ink-faint">· not configured</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${valCfg.cls}`}>{valCfg.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {platform.capabilities.map(cap => (
                        <span key={cap} className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${CAP_CLS}`}>
                          {cap}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-ink-heading text-sm">{platform.dealersUsing}</span>
                    {platform.blockedDealers > 0 && <div className="text-[10px] text-status-error-text font-semibold mt-0.5">{platform.blockedDealers} blocked</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${matCfg.cls}`}>{matCfg.label}</span>
                  </td>
                </tr>
              );
            })}
            {filteredPlatforms.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-faint text-sm">No platforms match the selected filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
