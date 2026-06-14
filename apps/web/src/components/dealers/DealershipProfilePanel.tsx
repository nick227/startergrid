import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { fetchDealershipProfile, updateDealershipProfile, uploadDealerLogo } from '@/lib/api/sdk.ts';
import type { DealershipProfile, ProfileReadinessWarning } from '@/lib/types.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { SectionCard, ErrorState } from '@/components/operator';
import { NotificationChannelsPanel } from '@/components/operator/NotificationChannelsPanel.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';

const MARKETPLACE_URL = (import.meta.env['VITE_MARKETPLACE_URL'] as string | undefined) ?? 'http://localhost:5174';
const FIELD_CLS =
  'w-full bg-surface-card border border-silver-300 rounded-md px-3 py-2 text-sm text-ink-heading focus:outline-none focus:ring-2 focus:ring-navy-500/30';

type Props = {
  dealerId: string;
  nav?: OperatorNavHandlers;
  mode?: 'operator' | 'admin';
};

type FormState = {
  legalName: string;
  dbaName: string;
  websiteUrl: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
};

function profileToForm(profile: DealershipProfile): FormState {
  return {
    legalName: profile.legalName,
    dbaName: profile.dbaName ?? '',
    websiteUrl: profile.websiteUrl ?? '',
    contactName: profile.primaryContact.name,
    contactEmail: profile.primaryContact.email,
    contactPhone: profile.primaryContact.phone ?? '',
    street: profile.rooftopAddress.street,
    city: profile.rooftopAddress.city,
    state: profile.rooftopAddress.state,
    postalCode: profile.rooftopAddress.postalCode,
  };
}

function WarningList({ warnings }: { warnings: ProfileReadinessWarning[] }) {
  if (!warnings.length) {
    return (
      <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
        Profile looks ready for marketplace publishing and platform setup.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {warnings.map(w => (
        <li
          key={w.field}
          className={`text-sm rounded-md px-3 py-2 border ${
            w.severity === 'critical'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <span className="font-semibold">{w.label}:</span> {w.message}
        </li>
      ))}
    </ul>
  );
}

function ChannelSummary({ profile }: { profile: DealershipProfile }) {
  const items = [
    profile.notificationChannels.email.enabled && 'Email',
    profile.notificationChannels.webhook.configured && 'Webhook',
    profile.notificationChannels.discord.configured && 'Discord',
    profile.notificationChannels.telegram.configured && 'Telegram',
    profile.notificationChannels.sms.configured && 'SMS',
    profile.notificationChannels.autoResponse.enabled && 'Auto-response',
  ].filter(Boolean);
  return (
    <p className="text-xs text-ink-muted">
      {items.length ? `Configured: ${items.join(', ')}` : 'No lead routing channels configured yet.'}
    </p>
  );
}

export function DealershipProfilePanel({ dealerId, nav, mode = 'operator' }: Props) {
  const { data: profile, loading, error, reload } = useAsyncQuery(
    () => fetchDealershipProfile(dealerId),
    [dealerId],
  );
  const [form, setForm] = useState<FormState | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) setForm(profileToForm(profile));
  }, [profile]);

  const categoryLabel = useMemo(
    () => (profile ? resolveCategorySchema(profile.businessCategory).label : ''),
    [profile],
  );

  const marketplaceHref = profile
    ? `${MARKETPLACE_URL}#/${profile.businessCategory.toLowerCase()}/seller/${encodeURIComponent(dealerId)}`
    : null;

  const update = (key: keyof FormState, value: string) => {
    setForm(prev => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!form) return;
    setSaveState('saving');
    setSaveError(null);
    try {
      await updateDealershipProfile(dealerId, {
        legalName: form.legalName.trim(),
        dbaName: form.dbaName.trim(),
        websiteUrl: form.websiteUrl.trim(),
        primaryContact: {
          name: form.contactName.trim(),
          email: form.contactEmail.trim(),
          phone: form.contactPhone.trim() || undefined,
        },
        rooftopAddress: {
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
        },
      });
      setSaveState('saved');
      reload();
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (e: unknown) {
      setSaveState('error');
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      await uploadDealerLogo(dealerId, file);
      reload();
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading && !profile) {
    return <div className="surface-card-operator p-6"><Skeleton rows={8} /></div>;
  }
  if (error && !profile) return <ErrorState message={error} onRetry={reload} />;
  if (!profile || !form) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-heading">Dealership profile</h2>
          <p className="text-sm text-ink-muted mt-1">
            Public storefront details buyers see on the marketplace and platforms use for publishing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {nav && (
            <Button size="sm" variant="secondary" onClick={() => nav.goToPlatforms()}>
              Manage platforms →
            </Button>
          )}
          {marketplaceHref && (
            <a
              href={marketplaceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md border border-silver-300 text-ink-muted hover:text-ink-heading"
            >
              View marketplace page →
            </a>
          )}
        </div>
      </div>

      <SectionCard title="Publishing readiness">
        <WarningList warnings={profile.publishingWarnings} />
      </SectionCard>

      <SectionCard title="Public marketplace profile" subtitle={`Category: ${categoryLabel}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink-muted">Legal name</span>
            <input value={form.legalName} onChange={e => update('legalName', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink-muted">DBA / display name</span>
            <input value={form.dbaName} onChange={e => update('dbaName', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold text-ink-muted">Website URL</span>
            <input type="url" value={form.websiteUrl} onChange={e => update('websiteUrl', e.target.value)} className={FIELD_CLS} placeholder="https://yourdealership.com" />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Contact information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold text-ink-muted">Primary contact name</span>
            <input value={form.contactName} onChange={e => update('contactName', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink-muted">Email</span>
            <input type="email" value={form.contactEmail} onChange={e => update('contactEmail', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink-muted">Phone</span>
            <input type="tel" value={form.contactPhone} onChange={e => update('contactPhone', e.target.value)} className={FIELD_CLS} placeholder="+15551234567" />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Location / rooftop address">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold text-ink-muted">Street</span>
            <input value={form.street} onChange={e => update('street', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink-muted">City</span>
            <input value={form.city} onChange={e => update('city', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink-muted">State</span>
            <input value={form.state} onChange={e => update('state', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink-muted">Postal code</span>
            <input value={form.postalCode} onChange={e => update('postalCode', e.target.value)} className={FIELD_CLS} />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Logo / branding">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-navy-800 to-navy-700 overflow-hidden shrink-0"
            title="Upload logo"
          >
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl flex items-center justify-center w-full h-full">📡</span>
            )}
            {uploadingLogo && (
              <div className="absolute inset-0 bg-navy-900/60 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </button>
          <div className="text-sm text-ink-muted space-y-1">
            <p>Shown in the operator header and used for branded experiences.</p>
            <p className="text-xs text-ink-faint">PNG, JPEG, or WebP · click logo to upload</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/webp"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) void handleLogoUpload(file);
            }}
          />
        </div>
      </SectionCard>

      <div className="space-y-2">
        <ChannelSummary profile={profile} />
        <NotificationChannelsPanel dealerId={dealerId} defaultOpen />
      </div>

      {mode === 'admin' && (
        <SectionCard title="Internal reference">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-muted uppercase tracking-wide">Dealer ID</dt>
              <dd className="font-mono text-xs text-ink-heading mt-0.5">{profile.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted uppercase tracking-wide">Member since</dt>
              <dd className="text-ink-heading mt-0.5">{new Date(profile.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </SectionCard>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button variant="primary" loading={saveState === 'saving'} onClick={() => void handleSave()}>
          Save profile
        </Button>
        {saveState === 'saved' && <span className="text-sm text-emerald-700 font-medium">Saved</span>}
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>
    </div>
  );
}
