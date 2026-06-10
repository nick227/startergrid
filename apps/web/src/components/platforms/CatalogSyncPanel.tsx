import { useState, useEffect } from 'react';
import type { CatalogConfig } from '@/lib/types.ts';
import { fetchCatalogConfig, saveCatalogConfig, triggerCatalogSync } from '@/lib/api/sdk.ts';
import { timeAgo } from '@/lib/timeAgo.ts';
import { Button } from '@/components/ui/Button.tsx';

// Platforms that encode two IDs in the catalogId field (bcId:catalogId).
const TIKTOK_SLUG = 'tiktok-automotive-ads';

type CatalogFieldMeta = {
  label: string;
  placeholder: string;
  hint: string;
};

const CATALOG_FIELD_META: Record<string, CatalogFieldMeta> = {
  'meta-automotive-ads': {
    label: 'Catalog ID',
    placeholder: '123456789012345',
    hint: 'Facebook Commerce Manager → Catalogs → select catalog → ID in URL',
  },
  'google-vehicle-ads': {
    label: 'Merchant Center ID',
    placeholder: '1234567890',
    hint: 'merchants.google.com → Account → Settings (10-digit numeric ID)',
  },
  'microsoft-automotive-ads': {
    label: 'Store ID',
    placeholder: '12345678',
    hint: 'Microsoft Merchant Center → Account settings (numeric store ID)',
  },
  'pinterest-shopping-ads': {
    label: 'Catalog ID',
    placeholder: 'abcdef1234567890',
    hint: 'Pinterest Business Hub → Catalogs → select catalog',
  },
  'snapchat-dynamic-product-ads': {
    label: 'Catalog ID',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    hint: 'Snapchat Ads Manager → Assets → Catalogs',
  },
  'reddit-dynamic-product-ads': {
    label: 'Catalog ID',
    placeholder: 'a1b2c3d4e5f6',
    hint: 'Reddit Ads Manager → Assets → Catalogs',
  },
  'tiktok-shop': {
    label: 'Shop ID',
    placeholder: '7300000000000000001',
    hint: 'TikTok Seller Center → Shop Management → Shop ID',
  },
  'x-dynamic-product-ads': {
    label: 'Catalog ID',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    hint: 'X Ads Manager → Tools → Catalog Manager → select catalog',
  },
  'nextdoor-ads': {
    label: 'Catalog ID',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    hint: 'Nextdoor Ads Manager → Assets → Catalogs → select catalog',
  },
};

const DEFAULT_META: CatalogFieldMeta = {
  label: 'Catalog ID',
  placeholder: '',
  hint: 'Find this in your platform\'s advertising manager.',
};

type Props = {
  dealerId: string;
  platformSlug: string;
};

export function CatalogSyncPanel({ dealerId, platformSlug }: Props) {
  const [config, setConfig] = useState<CatalogConfig | null | undefined>(undefined); // undefined = loading
  const [loadError, setLoadError] = useState<string | null>(null);

  // TikTok split fields
  const [bcId, setBcId] = useState('');
  const [tiktokCatalogId, setTiktokCatalogId] = useState('');
  // Standard single-field
  const [catalogIdInput, setCatalogIdInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; rejected: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const isTikTok = platformSlug === TIKTOK_SLUG;
  const fieldMeta = CATALOG_FIELD_META[platformSlug] ?? DEFAULT_META;

  useEffect(() => {
    setConfig(undefined);
    setLoadError(null);
    setSyncResult(null);
    setSyncError(null);
    setSaveError(null);
    fetchCatalogConfig(dealerId, platformSlug)
      .then(res => {
        setConfig(res?.config ?? null);
        if (res?.config) {
          if (isTikTok) {
            const [bc, cat] = res.config.catalogId.split(':');
            setBcId(bc ?? '');
            setTiktokCatalogId(cat ?? '');
          } else {
            setCatalogIdInput(res.config.catalogId);
          }
        }
      })
      .catch(e => setLoadError(e instanceof Error ? e.message : 'Failed to load'));
  }, [dealerId, platformSlug, isTikTok]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const encoded = isTikTok ? `${bcId.trim()}:${tiktokCatalogId.trim()}` : catalogIdInput.trim();
      if (!encoded || encoded === ':') throw new Error('Catalog ID is required');
      const res = await saveCatalogConfig(dealerId, platformSlug, encoded);
      setConfig(res.config);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await triggerCatalogSync(dealerId, platformSlug);
      setSyncResult({ synced: res.synced, rejected: res.rejected });
      // Refresh config to update lastSyncAt
      const updated = await fetchCatalogConfig(dealerId, platformSlug);
      if (updated?.config) setConfig(updated.config);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (config === undefined) {
    return <p className="text-xs text-ink-faint py-4 text-center">Loading…</p>;
  }

  if (loadError) {
    return <p className="text-xs text-status-error-text py-4">{loadError}</p>;
  }

  return (
    <div className="space-y-5">

      {/* Catalog ID configuration */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
          Catalog configuration
        </p>

        {saveError && (
          <div className="text-xs text-status-error-text bg-status-error-bg px-3 py-2 rounded-md border border-status-error-border">
            {saveError}
          </div>
        )}

        {isTikTok ? (
          <>
            <FormField label="Business Center ID" hint="TikTok Business Center → Settings → Business ID">
              <input
                type="text"
                value={bcId}
                onChange={e => setBcId(e.target.value)}
                placeholder="7000000000000000000"
                className="field-input"
              />
            </FormField>
            <FormField label="Catalog ID" hint="TikTok Business Center → Assets → Catalogs → select catalog">
              <input
                type="text"
                value={tiktokCatalogId}
                onChange={e => setTiktokCatalogId(e.target.value)}
                placeholder="7000000000000000001"
                className="field-input"
              />
            </FormField>
          </>
        ) : (
          <FormField label={fieldMeta.label} hint={fieldMeta.hint}>
            <input
              type="text"
              value={catalogIdInput}
              onChange={e => setCatalogIdInput(e.target.value)}
              placeholder={fieldMeta.placeholder}
              className="field-input"
            />
          </FormField>
        )}

        <Button variant="primary" size="sm" loading={saving} onClick={() => void handleSave()}>
          {config ? 'Update catalog ID' : 'Save catalog ID'}
        </Button>
      </div>

      {/* Sync controls — only shown after catalog is configured */}
      {config && (
        <div className="border-t border-silver-200 pt-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
            Catalog sync
          </p>

          <div className="rounded-md bg-surface-subtle border border-border-subtle px-3 py-2.5 space-y-0.5">
            <p className="text-xs text-ink-body">
              <span className="font-semibold">Catalog ID:</span>{' '}
              <span className="font-mono text-[11px] text-ink-muted break-all">{config.catalogId}</span>
            </p>
            {config.lastSyncAt ? (
              <p className="text-xs text-ink-faint">
                Last sync: {timeAgo(config.lastSyncAt)}
                {config.lastSyncCount != null && ` · ${config.lastSyncCount.toLocaleString()} vehicle${config.lastSyncCount !== 1 ? 's' : ''}`}
              </p>
            ) : (
              <p className="text-xs text-ink-faint">Never synced</p>
            )}
          </div>

          {syncError && (
            <div className="text-xs text-status-error-text bg-status-error-bg px-3 py-2 rounded-md border border-status-error-border">
              {syncError}
            </div>
          )}

          {syncResult && (
            <div className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200">
              ✓ {syncResult.synced.toLocaleString()} vehicle{syncResult.synced !== 1 ? 's' : ''} synced
              {syncResult.rejected > 0 && ` · ${syncResult.rejected} rejected`}
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            loading={syncing}
            onClick={() => void handleSync()}
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </Button>
        </div>
      )}

    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-muted mb-1">{label}</label>
      {hint && <p className="text-[11px] text-ink-faint mb-1">{hint}</p>}
      {children}
    </div>
  );
}
