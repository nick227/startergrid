import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { fetchDealershipProfile, updateDealershipProfile, uploadDealerLogo } from '@/lib/api/sdk.ts';
import type { DealershipProfile, ProfileReadinessWarning } from '@/lib/types.ts';
import { invalidateDealersList } from '@/lib/dealersListInvalidation.ts';
import {
  formatMemberSince,
  normalizePrimaryContact,
  normalizeRooftopAddress,
} from '@/lib/dealershipProfileNormalize.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { SectionCard, ErrorState } from '@/components/operator';
import { NotificationChannelsPanel, type NotificationChannelsPanelHandle } from '@/components/operator/NotificationChannelsPanel.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';

const MARKETPLACE_URL = (import.meta.env['VITE_MARKETPLACE_URL'] as string | undefined) ?? 'http://localhost:5174';
const FIELD_CLS =
  'w-full bg-surface-card border border-silver-300 rounded-md px-3 py-2 text-sm text-ink-heading focus:outline-none focus:ring-2 focus:ring-navy-500/30';

type Props = {
  dealerId: string;
  mode?: 'operator' | 'admin';
  onDealersChanged?: () => void;
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
  const contact = normalizePrimaryContact(profile.primaryContact);
  const address = normalizeRooftopAddress(profile.rooftopAddress);
  return {
    legalName: profile.legalName,
    dbaName: profile.dbaName ?? '',
    websiteUrl: profile.websiteUrl ?? '',
    contactName: contact.name,
    contactEmail: contact.email,
    contactPhone: contact.phone ?? '',
    street: address.street,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
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

function hasOptionalChannelConfigured(profile: DealershipProfile): boolean {
  // Email defaults on for every dealer, so it doesn't count as a deliberate setup step.
  return (
    profile.notificationChannels.webhook.configured ||
    profile.notificationChannels.discord.configured ||
    profile.notificationChannels.telegram.configured ||
    profile.notificationChannels.sms.configured ||
    profile.notificationChannels.autoResponse.enabled
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

export function DealershipProfilePanel({ dealerId, mode = 'operator', onDealersChanged }: Props) {
  const { data: profile, loading, error, reload } = useAsyncQuery(
    () => fetchDealershipProfile(dealerId),
    [dealerId],
  );
  const [form, setForm] = useState<FormState | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelsRef = useRef<NotificationChannelsPanelHandle>(null);
  const savedFormRef = useRef<FormState | null>(null);

  useEffect(() => {
    if (profile) {
      const f = profileToForm(profile);
      setForm(f);
      savedFormRef.current = f;
    }
  }, [profile]);

  const isProfileDirty = useCallback(() => !!form && JSON.stringify(form) !== JSON.stringify(savedFormRef.current), [form]);
  const isAnyDirty = useCallback(() => isProfileDirty() || !!channelsRef.current?.isDirty(), [isProfileDirty]);

  // Warn on tab close / refresh while there are unsaved changes. This app has no router
  // library (navigation is plain `window.location.hash` assignment), so this is the
  // native browser API rather than a router hook.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isAnyDirty()) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAnyDirty]);

  // Warn on in-app navigation (clicking another tab, etc.) while there are unsaved
  // changes. `hashchange` fires after the hash has already changed, so on a dirty form
  // we revert it immediately, confirm with the user, then re-apply the target hash only
  // if they choose to leave. `ignoreNextChange` distinguishes those programmatic
  // hash writes from a genuine navigation so this doesn't loop on itself.
  useEffect(() => {
    let lastHash = window.location.hash;
    let ignoreNextChange = false;

    function handleHashChange() {
      if (ignoreNextChange) {
        ignoreNextChange = false;
        lastHash = window.location.hash;
        return;
      }
      if (!isAnyDirty()) {
        lastHash = window.location.hash;
        return;
      }
      const attemptedHash = window.location.hash;
      ignoreNextChange = true;
      window.location.hash = lastHash;
      const leave = window.confirm('You have unsaved changes on this page. Leave without saving?');
      if (leave) {
        ignoreNextChange = true;
        window.location.hash = attemptedHash;
        lastHash = attemptedHash;
      }
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAnyDirty]);

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

  const refreshDealerSummaries = () => {
    invalidateDealersList();
    onDealersChanged?.();
  };

  const saveProfileFields = async (fields: FormState) => {
    await updateDealershipProfile(dealerId, {
      legalName: fields.legalName.trim(),
      dbaName: fields.dbaName.trim(),
      websiteUrl: fields.websiteUrl.trim(),
      primaryContact: {
        name: fields.contactName.trim(),
        email: fields.contactEmail.trim(),
        phone: fields.contactPhone.trim() || undefined,
      },
      rooftopAddress: {
        street: fields.street.trim(),
        city: fields.city.trim(),
        state: fields.state.trim(),
        postalCode: fields.postalCode.trim(),
      },
    });
    savedFormRef.current = fields;
  };

  const handleSave = async () => {
    if (!form) return;
    setSaveState('saving');
    setSaveError(null);
    let profileSaved = false;
    try {
      await saveProfileFields(form);
      profileSaved = true;
      // Flush unsaved channel edits too — the two forms sit in one visual area,
      // so "Save profile" must not silently drop changes made in the other. If this
      // half fails, fall through to the catch below rather than reporting "Saved" —
      // one form succeeding must never present as an overall success.
      if (channelsRef.current?.isDirty()) {
        await channelsRef.current.save();
      }
      setSaveState('saved');
      reload();
      refreshDealerSummaries();
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (e: unknown) {
      setSaveState('error');
      const message = e instanceof Error ? e.message : 'Save failed';
      setSaveError(profileSaved ? `Profile details saved successfully, but lead routing channels failed to update: ${message}. Please try saving again.` : message);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      await uploadDealerLogo(dealerId, file);
      reload();
      refreshDealerSummaries();
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
        <div>
          <h2 className="text-lg font-semibold text-ink-heading">Lead notification channels</h2>
          <p className="text-sm text-ink-muted mt-1">
            Stored separately from the profile fields above — either Save button below persists both.
          </p>
        </div>
        <ChannelSummary profile={profile} />
        <NotificationChannelsPanel
          dealerId={dealerId}
          defaultOpen={!hasOptionalChannelConfigured(profile)}
          ref={channelsRef}
          onBeforeSave={async () => {
            if (isProfileDirty()) await saveProfileFields(form);
          }}
        />
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
              <dd className="text-ink-heading mt-0.5">{formatMemberSince(profile.createdAt)}</dd>
            </div>
          </dl>
        </SectionCard>
      )}

      <div className="flex flex-col gap-3 pt-1">
        <div className="flex items-center gap-3">
          <Button variant="primary" loading={saveState === 'saving'} onClick={() => void handleSave()}>
            Save profile
          </Button>
          {saveState === 'saved' && <span className="text-sm text-emerald-700 font-medium">Saved</span>}
        </div>
        {saveError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <span className="text-sm text-red-700 font-medium">{saveError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
