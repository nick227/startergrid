import { useState } from 'react';
import type { PlatformPublishResult, PlatformAccountDetail, PlatformPerformanceItem, SelectedSocialPage } from '@/lib/types.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { updateAccount } from '@/lib/api/sdk.ts';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { PanelSkeleton } from '@/components/operator';
import { PlatformDetailDrawer } from './PlatformDetailDrawer.tsx';
import { PlatformLogo } from './PlatformLogo.tsx';
import { OAuthConnectButton } from './OAuthConnectButton.tsx';
import { Button } from '@/components/ui/Button.tsx';
import {
  platformConnectionWithAccount,
  oauthProviderDisplayName,
  platformBenefitLine,
  feedHealthLine,
  type PlatformConnection,
  type PlatformConnectionMeta,
} from '@/lib/platformPresentation.ts';
import { socialRowSubtitle } from '@/lib/platformPanelGuards.ts';
import { channelSecondaryMeta, channelRowSurface } from '@/lib/channelRowPresentation.ts';
import { platformDisplayName } from '@/lib/marketplaceBrand.ts';
import { getSetupReadiness, severityToPill } from '@/lib/setupReadiness.ts';

type Props = {
  platforms: PlatformPublishResult[];
  perfBySlug: Map<string, PlatformPerformanceItem>;
  accountBySlug: Map<string, PlatformAccountDetail>;
  socialPageBySlug?: Map<string, SelectedSocialPage>;
  dealerId: string;
  nav: OperatorNavHandlers;
  selectedSlug: string | null;
  onSelectSlug: (slug: string | null) => void;
  onAccountSaved: () => void;
  loading?: boolean;
  emptyMessage: string;
};

type Group = { key: string; label: string; items: PlatformPublishResult[] };

function groupOrder(conn: PlatformConnection): number {
  if (conn === 'blocked') return 0;
  if (conn === 'needs_oauth') return 1;
  if (conn === 'partner_pending') return 2;
  if (conn === 'inactive') return 3;
  if (conn === 'updating') return 4;
  if (conn === 'paused') return 5;
  return 6; // connected
}

const GROUP_LABELS: Record<string, string> = {
  blocked: 'Needs attention',
  needs_oauth: 'Quick connects',
  partner_pending: 'Partner approval pending',
  inactive: 'Setup needed',
  updating: 'Syncing',
  paused: 'Paused',
  connected: 'Active',
};

function buildGroups(
  platforms: PlatformPublishResult[],
  accountBySlug: Map<string, PlatformAccountDetail>
): Group[] {
  const buckets = new Map<string, PlatformPublishResult[]>();
  for (const p of platforms) {
    const account = accountBySlug.get(p.platformSlug);
    const conn = platformConnectionWithAccount(p, account);
    const key = conn.connection === 'connected' ? 'connected'
      : conn.connection === 'updating' ? 'updating'
      : conn.connection === 'needs_oauth' ? 'needs_oauth'
      : conn.connection === 'partner_pending' ? 'partner_pending'
      : conn.connection === 'blocked' ? 'blocked'
      : conn.connection === 'paused' ? 'paused'
      : 'inactive';
    const list = buckets.get(key) ?? [];
    list.push(p);
    buckets.set(key, list);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => groupOrder(a as PlatformConnection) - groupOrder(b as PlatformConnection))
    .map(([key, items]) => ({ key, label: GROUP_LABELS[key] ?? key, items }));
}

const CTA_W = 'min-w-[8rem] justify-center';

function PlatformCta({
  platform,
  account,
  conn,
  dealerId,
  onAccountSaved,
  onSelectSlug,
  nav,
}: {
  platform: PlatformPublishResult;
  account: PlatformAccountDetail | undefined;
  conn: PlatformConnectionMeta;
  dealerId: string;
  onAccountSaved: () => void;
  onSelectSlug: (slug: string | null) => void;
  nav: OperatorNavHandlers;
}) {
  const slug = platform.platformSlug;
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);

  const handlePause = async () => {
    setPausing(true);
    try {
      await updateAccount(dealerId, slug, { state: 'SUSPENDED' });
      onAccountSaved();
    } catch {
      setPausing(false);
    }
  };

  const handleResume = async () => {
    setResuming(true);
    try {
      await updateAccount(dealerId, slug, { state: 'ACTIVE' });
      onAccountSaved();
    } catch {
      setResuming(false);
    }
  };

  if (conn.connection === 'paused') {
    return (
      <Button size="sm" variant="secondary" loading={resuming} className={CTA_W} onClick={() => void handleResume()}>
        Resume
      </Button>
    );
  }

  if (conn.connection === 'needs_oauth' && account?.oauthProvider) {
    return (
      <OAuthConnectButton
        dealerId={dealerId}
        platformSlug={slug}
        providerDisplayName={oauthProviderDisplayName(account.oauthProvider)}
        isReconnect={account.oauthExpired}
        onDone={onAccountSaved}
        label={account.oauthExpired ? 'Re-connect' : 'Connect'}
        className={CTA_W}
      />
    );
  }

  if (account?.partnerSignup && (account.state === 'ACCOUNT_NEEDED' || account.state === 'PARTNER_REQUIRED')) {
    return (
      <a
        href={account.partnerSignup.applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md bg-orange-600 hover:bg-orange-500 text-white transition-colors ${CTA_W}`}
      >
        Apply →
      </a>
    );
  }

  if (conn.connection === 'partner_pending') {
    return (
      <span className={`inline-flex items-center px-3 py-1.5 text-[11px] font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200 ${CTA_W}`}>
        Applied
      </span>
    );
  }

  if (conn.connection === 'connected' || conn.connection === 'updating') {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => nav.goToPlatformDetail(slug)}
          className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md text-ink-muted hover:text-ink-heading transition-colors ${CTA_W}`}
        >
          Manage →
        </button>
        {platform.integrationClass !== 'OWNED' && (
          <button
            type="button"
            disabled={pausing}
            onClick={() => void handlePause()}
            className="text-[10px] text-ink-faint hover:text-ink-muted disabled:opacity-50 transition-colors"
          >
            {pausing ? 'Pausing…' : 'Pause syncing'}
          </button>
        )}
      </div>
    );
  }

  if (platform.integrationClass === 'OWNED') {
    return (
      <button
        type="button"
        onClick={() => nav.goToPlatformDetail(slug)}
        className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md text-ink-muted hover:text-ink-heading transition-colors ${CTA_W}`}
      >
        Manage →
      </button>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      className={CTA_W}
      onClick={() => onSelectSlug(slug)}
    >
      Set up
    </Button>
  );
}

function PlatformRowFields({
  account,
  dealerId,
  onSaved,
}: {
  account: PlatformAccountDetail;
  dealerId: string;
  onSaved: () => void;
}) {
  const allFields = account.connectionFields ?? [];
  const fields = allFields.filter(f => !f.isSecret);

  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      init[f.field] = String(account.connectionConfig?.[f.field] ?? '');
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState(0);

  if (!fields.length || account.integrationClass === 'OWNED') return null;

  const origValues = Object.fromEntries(
    fields.map(f => [f.field, String(account.connectionConfig?.[f.field] ?? '')])
  );
  const isDirty = fields.some(f => form[f.field] !== origValues[f.field]);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      await updateAccount(dealerId, account.platformSlug, {
        accountId: form['accountId'] || undefined,
        membershipStatus: form['membershipStatus'] || undefined,
        platformRepName: form['platformRepName'] || undefined,
        platformRepEmail: form['platformRepEmail'] || undefined,
      });
      setLastSaved(Date.now());
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-2.5 border-t border-silver-100 space-y-2">
      {err && <p className="text-[11px] text-red-600">{err}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map(f => (
          <div key={f.field} className="min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-ink-faint block mb-0.5">
              {f.label}
              {f.helpUrl && (
                <a
                  href={f.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1.5 normal-case font-normal tracking-normal text-ink-faint/60 hover:text-ink-muted"
                >
                  (where do I find this?)
                </a>
              )}
            </label>
            <input
              type="text"
              value={form[f.field] ?? ''}
              onChange={e => setForm(prev => ({ ...prev, [f.field]: e.target.value }))}
              placeholder={f.placeholder ?? ''}
              className="w-full field-input text-xs"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 min-h-[2rem]">
        {isDirty ? (
          <Button size="sm" variant="primary" loading={saving} onClick={() => void handleSave()}>
            Save changes
          </Button>
        ) : (
          lastSaved > 0 && <span className="text-xs text-green-700 font-medium">Saved ✓</span>
        )}
      </div>
    </div>
  );
}

export function PlatformChannelList({
  platforms,
  perfBySlug,
  accountBySlug,
  socialPageBySlug,
  dealerId,
  nav,
  selectedSlug,
  onSelectSlug,
  onAccountSaved,
  loading,
  emptyMessage,
}: Props) {
  if (loading) return <PanelSkeleton rows={6} />;
  if (!platforms.length) {
    return <p className="text-sm text-ink-muted py-8 text-center">{emptyMessage}</p>;
  }

  const selected = selectedSlug
    ? platforms.find(p => p.platformSlug === selectedSlug) ?? null
    : null;

  const groups = buildGroups(platforms, accountBySlug);
  const useGroups = groups.length > 1;

  const renderRow = (platform: PlatformPublishResult) => {
    const account = accountBySlug.get(platform.platformSlug);
    const conn = platformConnectionWithAccount(platform, account);
    const perf = perfBySlug.get(platform.platformSlug);

    const socialSubtitle = socialRowSubtitle(
      platform.socialPosting,
      conn.connection === 'connected',
      socialPageBySlug?.get(platform.platformSlug)?.name,
    );

    const readiness = getSetupReadiness(platform, account || null);

    const inlineContent = account ? (
      <PlatformRowFields
        key={account.updatedAt}
        account={account}
        dealerId={dealerId}
        onSaved={onAccountSaved}
      />
    ) : undefined;

    const displayName = platformDisplayName(platform.platformSlug, platform.platformName);

    return (
      <OpsRowCard
        key={platform.platformSlug}
        title={displayName}
        onTitleClick={() => nav.goToPlatformDetail(platform.platformSlug)}
        statusLabel={readiness.statusLabel}
        statusClassName={severityToPill(readiness.severity)}
        secondaryMeta={channelSecondaryMeta(platform)}
        detailOpen={selectedSlug === platform.platformSlug}
        surfaceClassName={channelRowSurface(conn.connection)}
        logoNode={<PlatformLogo slug={platform.platformSlug} name={displayName} />}
        subtitleLine={socialSubtitle ?? platformBenefitLine(platform.platformSlug)}
        healthLine={feedHealthLine(perf, conn.connection)}
        inlineContent={inlineContent}
        ctaNode={
          <PlatformCta
            platform={platform}
            account={account}
            conn={conn}
            dealerId={dealerId}
            onAccountSaved={onAccountSaved}
            onSelectSlug={onSelectSlug}
            nav={nav}
          />
        }
      />
    );
  };

  return (
    <div>
      <div className="space-y-3">
        {useGroups ? (
          groups.map(group => (
            <div key={group.key}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-2 mt-4 first:mt-0">
                {group.label} <span className="ml-1 font-normal normal-case tracking-normal text-ink-faint/60">{group.items.length}</span>
              </p>
              <div className="space-y-2">
                {group.items.map(renderRow)}
              </div>
            </div>
          ))
        ) : (
          platforms.map(renderRow)
        )}
      </div>

      {selected && (
        <PlatformDetailDrawer
          platform={selected}
          account={accountBySlug.get(selected.platformSlug) ?? null}
          perf={perfBySlug.get(selected.platformSlug) ?? null}
          dealerId={dealerId}
          nav={nav}
          open
          onClose={() => onSelectSlug(null)}
          onSaved={onAccountSaved}
        />
      )}
    </div>
  );
}
