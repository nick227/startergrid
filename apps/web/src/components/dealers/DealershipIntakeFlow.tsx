import { useMemo, useState, type FormEvent } from 'react';
import { BUSINESS_CATEGORY_IDS } from '@auto-dealer/category-schemas';
import type { CreateDealershipPayload, CreateDealershipResponse } from '@/lib/types.ts';

type Mode = 'signup' | 'admin';

type Props = {
  mode: Mode;
  onSubmit: (payload: CreateDealershipPayload) => Promise<CreateDealershipResponse>;
  onUploadLogo?: (dealershipId: string, file: File) => Promise<{ logoUrl: string }>;
  onComplete: (response: CreateDealershipResponse) => void;
  onCancel?: () => void;
};

type Step = 'business' | 'location' | 'channels' | 'review';

const STEPS: Step[] = ['business', 'location', 'channels', 'review'];

const CHANNEL_OPTIONS = [
  { value: 'owned-storefront', label: 'Owned storefront' },
  { value: 'google-dynamic-product-ads', label: 'Google catalog ads' },
  { value: 'facebook-dynamic-product-ads', label: 'Facebook catalog ads' },
  { value: 'facebook-social-posting', label: 'Social posting' },
  { value: 'cars-com', label: 'Cars.com' },
  { value: 'autotrader-cox', label: 'Autotrader / Cox' },
  { value: 'cargurus-dealer', label: 'CarGurus' },
];

const FIELD_CLS =
  'w-full bg-surface-card border border-silver-300 rounded-md px-3 py-2 text-sm text-ink-heading ' +
  'placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-navy-500/30 transition-colors';

const LABEL_CLS = 'block space-y-1.5';
const LABEL_TEXT_CLS = 'text-xs font-semibold text-ink-body';

const EMPTY_PAYLOAD: CreateDealershipPayload = {
  legalName: '',
  dbaName: '',
  businessCategory: 'AUTOMOTIVE',
  dealerLicense: '',
  websiteUrl: '',
  rooftopAddress: {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  },
  primaryContact: {
    name: '',
    email: '',
    phone: '',
    role: '',
  },
  inventorySize: null,
  desiredChannels: [],
  documents: [],
};

function cleanPayload(payload: CreateDealershipPayload): CreateDealershipPayload {
  return {
    ...payload,
    legalName: payload.legalName.trim(),
    dbaName: payload.dbaName?.trim() || undefined,
    dealerLicense: payload.dealerLicense?.trim() || undefined,
    websiteUrl: payload.websiteUrl?.trim() || undefined,
    rooftopAddress: {
      street: payload.rooftopAddress.street.trim(),
      city: payload.rooftopAddress.city.trim(),
      state: payload.rooftopAddress.state.trim(),
      postalCode: payload.rooftopAddress.postalCode.trim(),
      country: payload.rooftopAddress.country?.trim() || 'US',
    },
    primaryContact: {
      name: payload.primaryContact.name.trim(),
      email: payload.primaryContact.email.trim(),
      phone: payload.primaryContact.phone?.trim() || undefined,
      role: payload.primaryContact.role?.trim() || undefined,
    },
    inventorySize: payload.inventorySize ?? null,
    desiredChannels: payload.desiredChannels ?? [],
    documents: payload.documents?.filter(Boolean) ?? [],
  };
}

function stepLabel(step: Step) {
  switch (step) {
    case 'business': return 'Business';
    case 'location': return 'Location';
    case 'channels': return 'Channels';
    case 'review': return 'Review';
  }
}

function validateStep(step: Step, payload: CreateDealershipPayload): string | null {
  if (step === 'business') {
    if (!payload.legalName.trim()) return 'Legal business name is required.';
    if (!payload.businessCategory) return 'Business category is required.';
  }
  if (step === 'location') {
    if (!payload.rooftopAddress.street.trim()) return 'Street address is required.';
    if (!payload.rooftopAddress.city.trim()) return 'City is required.';
    if (!payload.rooftopAddress.state.trim()) return 'State is required.';
    if (!payload.rooftopAddress.postalCode.trim()) return 'Postal code is required.';
    if (!payload.primaryContact.name.trim()) return 'Primary contact name is required.';
    if (!payload.primaryContact.email.trim()) return 'Primary contact email is required.';
  }
  return null;
}

export function DealershipIntakeFlow({ mode, onSubmit, onUploadLogo, onComplete, onCancel }: Props) {
  const [payload, setPayload] = useState<CreateDealershipPayload>(EMPTY_PAYLOAD);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const title = mode === 'admin' ? 'Add Dealership' : 'Create Dealership Profile';
  const subtitle = mode === 'admin'
    ? 'Create the dealer workspace operators will use for accounts, inventory, sync, and reporting.'
    : 'Tell us where the dealership operates and which channels you want to prepare first.';

  const selectedChannels = useMemo(() => new Set(payload.desiredChannels ?? []), [payload.desiredChannels]);

  function update<K extends keyof CreateDealershipPayload>(key: K, value: CreateDealershipPayload[K]) {
    setPayload(current => ({ ...current, [key]: value }));
  }

  function updateAddress(key: keyof CreateDealershipPayload['rooftopAddress'], value: string) {
    setPayload(current => ({
      ...current,
      rooftopAddress: { ...current.rooftopAddress, [key]: value },
    }));
  }

  function updateContact(key: keyof CreateDealershipPayload['primaryContact'], value: string) {
    setPayload(current => ({
      ...current,
      primaryContact: { ...current.primaryContact, [key]: value },
    }));
  }

  function toggleChannel(channel: string) {
    setPayload(current => {
      const next = new Set(current.desiredChannels ?? []);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return { ...current, desiredChannels: [...next] };
    });
  }

  function goNext() {
    const stepError = validateStep(step, payload);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(null);
    setStepIndex(i => Math.min(STEPS.length - 1, i + 1));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isLastStep) {
      goNext();
      return;
    }
    for (const s of STEPS) {
      const stepError = validateStep(s, payload);
      if (stepError) {
        setStepIndex(STEPS.indexOf(s));
        setError(stepError);
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await onSubmit(cleanPayload(payload));
      if (logoFile && onUploadLogo) {
        await onUploadLogo(response.dealer.id, logoFile);
      }
      onComplete(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dealership.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-heading">{title}</h2>
        <p className="text-sm text-ink-muted mt-1">{subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, idx) => (
          <button
            key={s}
            type="button"
            onClick={() => idx <= stepIndex && setStepIndex(idx)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
              idx === stepIndex
                ? 'bg-navy-800 text-silver-100 border-navy-800'
                : idx < stepIndex
                ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                : 'bg-surface-inset text-ink-muted border-silver-200'
            }`}
          >
            {idx + 1}. {stepLabel(s)}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-status-error-border bg-status-error-bg px-3 py-2 text-sm text-status-error-text">
          {error}
        </div>
      )}

      {step === 'business' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={`${LABEL_CLS} md:col-span-2`}>
            <span className={LABEL_TEXT_CLS}>Legal business name</span>
            <input value={payload.legalName} onChange={e => update('legalName', e.target.value)} className={FIELD_CLS} autoFocus />
          </label>
          <label className={`${LABEL_CLS} md:col-span-2`}>
            <span className={LABEL_TEXT_CLS}>Logo image</span>
            <div className="flex flex-col gap-2 rounded-md border border-silver-200 bg-surface-inset p-3">
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={e => setLogoFile(e.target.files?.[0] ?? null)}
                className="text-sm text-ink-body"
              />
              <span className="text-xs text-ink-faint">
                {logoFile ? logoFile.name : 'PNG, JPG, or WebP. The logo uploads after the dealership is created.'}
              </span>
            </div>
          </label>
          <label className={LABEL_CLS}>
            <span className={LABEL_TEXT_CLS}>DBA name</span>
            <input value={payload.dbaName ?? ''} onChange={e => update('dbaName', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className={LABEL_CLS}>
            <span className={LABEL_TEXT_CLS}>Business category</span>
            <select value={payload.businessCategory} onChange={e => update('businessCategory', e.target.value)} className={FIELD_CLS}>
              {BUSINESS_CATEGORY_IDS.map(id => <option key={id} value={id}>{id.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
          <label className={LABEL_CLS}>
            <span className={LABEL_TEXT_CLS}>Dealer license</span>
            <input value={payload.dealerLicense ?? ''} onChange={e => update('dealerLicense', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className={LABEL_CLS}>
            <span className={LABEL_TEXT_CLS}>Website</span>
            <input type="url" value={payload.websiteUrl ?? ''} onChange={e => update('websiteUrl', e.target.value)} className={FIELD_CLS} placeholder="https://example.com" />
          </label>
        </div>
      )}

      {step === 'location' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={`${LABEL_CLS} md:col-span-2`}>
            <span className={LABEL_TEXT_CLS}>Street address</span>
            <input value={payload.rooftopAddress.street} onChange={e => updateAddress('street', e.target.value)} className={FIELD_CLS} autoFocus />
          </label>
          <label className={LABEL_CLS}>
            <span className={LABEL_TEXT_CLS}>City</span>
            <input value={payload.rooftopAddress.city} onChange={e => updateAddress('city', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className={LABEL_CLS}>
            <span className={LABEL_TEXT_CLS}>State</span>
            <input value={payload.rooftopAddress.state} onChange={e => updateAddress('state', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className={LABEL_CLS}>
            <span className={LABEL_TEXT_CLS}>Postal code</span>
            <input value={payload.rooftopAddress.postalCode} onChange={e => updateAddress('postalCode', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className={LABEL_CLS}>
            <span className={LABEL_TEXT_CLS}>Country</span>
            <input value={payload.rooftopAddress.country ?? 'US'} onChange={e => updateAddress('country', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className={LABEL_CLS}>
            <span className={LABEL_TEXT_CLS}>Primary contact</span>
            <input value={payload.primaryContact.name} onChange={e => updateContact('name', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className={LABEL_CLS}>
            <span className={LABEL_TEXT_CLS}>Contact email</span>
            <input type="email" value={payload.primaryContact.email} onChange={e => updateContact('email', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className={LABEL_CLS}>
            <span className={LABEL_TEXT_CLS}>Contact phone</span>
            <input value={payload.primaryContact.phone ?? ''} onChange={e => updateContact('phone', e.target.value)} className={FIELD_CLS} />
          </label>
          <label className={LABEL_CLS}>
            <span className={LABEL_TEXT_CLS}>Contact role</span>
            <input value={payload.primaryContact.role ?? ''} onChange={e => updateContact('role', e.target.value)} className={FIELD_CLS} />
          </label>
        </div>
      )}

      {step === 'channels' && (
        <div className="space-y-4">
          <label className="block max-w-xs space-y-1.5">
            <span className={LABEL_TEXT_CLS}>Inventory size</span>
            <input
              type="number"
              min={0}
              value={payload.inventorySize ?? ''}
              onChange={e => update('inventorySize', e.target.value ? Number(e.target.value) : null)}
              className={FIELD_CLS}
              autoFocus
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {CHANNEL_OPTIONS.map(channel => (
              <label key={channel.value} className="flex items-center gap-2 rounded-md border border-silver-200 bg-surface-inset px-3 py-2 text-sm text-ink-body">
                <input
                  type="checkbox"
                  checked={selectedChannels.has(channel.value)}
                  onChange={() => toggleChannel(channel.value)}
                />
                {channel.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="rounded-md border border-silver-200 bg-surface-inset p-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <div><span className="text-ink-faint">Dealer</span><div className="font-semibold text-ink-heading">{payload.legalName || 'Missing'}</div></div>
            <div><span className="text-ink-faint">Category</span><div className="font-semibold text-ink-heading">{payload.businessCategory}</div></div>
            <div><span className="text-ink-faint">Address</span><div className="font-semibold text-ink-heading">{payload.rooftopAddress.city || 'Missing'}, {payload.rooftopAddress.state || 'Missing'}</div></div>
            <div><span className="text-ink-faint">Contact</span><div className="font-semibold text-ink-heading">{payload.primaryContact.name || 'Missing'}</div></div>
            <div><span className="text-ink-faint">Inventory</span><div className="font-semibold text-ink-heading">{payload.inventorySize ?? 'Not provided'}</div></div>
            <div><span className="text-ink-faint">Desired channels</span><div className="font-semibold text-ink-heading">{payload.desiredChannels?.length ? payload.desiredChannels.length : 'None selected'}</div></div>
            <div><span className="text-ink-faint">Logo</span><div className="font-semibold text-ink-heading">{logoFile ? logoFile.name : 'Not selected'}</div></div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-silver-200 pt-4">
        <div>
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink-heading">
              Cancel
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <button type="button" onClick={() => { setError(null); setStepIndex(i => Math.max(0, i - 1)); }} className="px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 rounded-md">
              Back
            </button>
          )}
          <button type="submit" disabled={submitting} className="btn-primary-operator disabled:opacity-40">
            {submitting ? 'Creating...' : isLastStep ? 'Create Dealership' : 'Continue'}
          </button>
        </div>
      </div>
    </form>
  );
}
