import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { BUSINESS_CATEGORY_IDS } from '@auto-dealer/category-schemas';
import type { CreateDealershipPayload, CreateDealershipResponse } from '@/lib/types.ts';
import { IntakeSteps } from './IntakeSteps.tsx';
import { authFieldClass, authLabelClass } from '@/components/operator/AuthFrame.tsx';

type Mode = 'signup' | 'admin';
type StepPresentation = 'chips' | 'rail';

type Props = {
  mode: Mode;
  steps?: StepPresentation;
  onSubmit: (payload: CreateDealershipPayload) => Promise<CreateDealershipResponse>;
  onUploadLogo?: (dealershipId: string, file: File) => Promise<{ logoUrl: string }>;
  onComplete: (response: CreateDealershipResponse) => void;
  onCancel?: () => void;
  footer?: ReactNode;
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
  password: '',
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
    password: payload.password?.trim() || undefined,
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

function validateStep(step: Step, payload: CreateDealershipPayload, mode: Mode, confirmPass: string): string | null {
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
    if (mode === 'signup') {
      if (!payload.password || payload.password.length < 8) return 'Password must be at least 8 characters.';
      if (payload.password !== confirmPass) return 'Passwords do not match.';
    }
  }
  return null;
}

export function DealershipIntakeFlow({ mode, steps = 'chips', onSubmit, onUploadLogo, onComplete, onCancel, footer }: Props) {
  const [payload, setPayload] = useState<CreateDealershipPayload>(EMPTY_PAYLOAD);
  const [confirmPassword, setConfirmPassword] = useState('');
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
    const stepError = validateStep(step, payload, mode, confirmPassword);
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
      const stepError = validateStep(s, payload, mode, confirmPassword);
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

  const rail = steps === 'rail';
  const stepItems = STEPS.map(id => ({ id, label: stepLabel(id) }));
  const fieldClass = rail ? authFieldClass : 'field-input';
  const rowClass = rail
    ? 'grid grid-cols-1 items-center gap-1.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-4'
    : LABEL_CLS;
  const labelText = rail ? `${authLabelClass} sm:text-right` : LABEL_TEXT_CLS;
  const fieldGrid = rail ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 gap-4 md:grid-cols-2';

  return (
    <form onSubmit={submit} className={rail ? 'flex w-full flex-col' : 'space-y-5'}>
      <IntakeSteps
        presentation={steps}
        items={stepItems}
        stepIndex={stepIndex}
        onSelect={index => { setError(null); setStepIndex(index); }}
        title={rail ? 'Create your dealership' : title}
        subtitle={rail ? 'DealerGrid is the workspace a dealership uses for inventory, channels, and leads.' : subtitle}
      />
      <div className={rail ? 'flex w-full flex-col gap-5' : 'min-w-0 space-y-5'}>
      {error && (
        <div role="alert" className="rounded-md border border-status-error-border bg-status-error-bg px-3 py-2 text-sm text-status-error-text">
          {error}
        </div>
      )}

      {step === 'business' && (
        <div className={fieldGrid}>
          <label className={rail ? rowClass : `${LABEL_CLS} md:col-span-2`}>
            <span className={labelText}>Legal business name</span>
            <input value={payload.legalName} onChange={e => update('legalName', e.target.value)} className={fieldClass} autoFocus />
          </label>
          <label className={rail ? rowClass : `${LABEL_CLS} md:col-span-2`}>
            <span className={labelText}>Logo image</span>
            <div className={rail ? 'flex flex-col gap-2 rounded-md border border-white/15 bg-white/[0.04] px-3 py-2.5' : 'flex flex-col gap-2 rounded-md border border-silver-200 bg-surface-inset p-3'}>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={e => setLogoFile(e.target.files?.[0] ?? null)}
                className={rail ? 'text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-navy-950' : 'text-sm text-ink-body'}
              />
              <span className={rail ? 'text-xs text-white/40' : 'text-xs text-ink-faint'}>
                {logoFile ? logoFile.name : 'PNG, JPG, or WebP. The logo uploads after the dealership is created.'}
              </span>
            </div>
          </label>
          <label className={rowClass}>
            <span className={labelText}>DBA name</span>
            <input value={payload.dbaName ?? ''} onChange={e => update('dbaName', e.target.value)} className={fieldClass} />
          </label>
          <label className={rowClass}>
            <span className={labelText}>Business category</span>
            <select value={payload.businessCategory} onChange={e => update('businessCategory', e.target.value)} className={fieldClass}>
              {BUSINESS_CATEGORY_IDS.map(id => <option key={id} value={id}>{id.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
          <label className={rowClass}>
            <span className={labelText}>Dealer license</span>
            <input value={payload.dealerLicense ?? ''} onChange={e => update('dealerLicense', e.target.value)} className={fieldClass} />
          </label>
          <label className={rowClass}>
            <span className={labelText}>Website</span>
            <input type="url" value={payload.websiteUrl ?? ''} onChange={e => update('websiteUrl', e.target.value)} className={fieldClass} placeholder="https://example.com" />
          </label>
        </div>
      )}

      {step === 'location' && (
        <div className={fieldGrid}>
          <label className={rail ? rowClass : `${LABEL_CLS} md:col-span-2`}>
            <span className={labelText}>Street address</span>
            <input value={payload.rooftopAddress.street} onChange={e => updateAddress('street', e.target.value)} className={fieldClass} autoFocus />
          </label>
          <label className={rowClass}>
            <span className={labelText}>City</span>
            <input value={payload.rooftopAddress.city} onChange={e => updateAddress('city', e.target.value)} className={fieldClass} />
          </label>
          <label className={rowClass}>
            <span className={labelText}>State</span>
            <input value={payload.rooftopAddress.state} onChange={e => updateAddress('state', e.target.value)} className={fieldClass} />
          </label>
          <label className={rowClass}>
            <span className={labelText}>Postal code</span>
            <input value={payload.rooftopAddress.postalCode} onChange={e => updateAddress('postalCode', e.target.value)} className={fieldClass} />
          </label>
          <label className={rowClass}>
            <span className={labelText}>Country</span>
            <input value={payload.rooftopAddress.country ?? 'US'} onChange={e => updateAddress('country', e.target.value)} className={fieldClass} />
          </label>
          <label className={rowClass}>
            <span className={labelText}>Primary contact</span>
            <input value={payload.primaryContact.name} onChange={e => updateContact('name', e.target.value)} className={fieldClass} />
          </label>
          <label className={rowClass}>
            <span className={labelText}>Contact email</span>
            <input type="email" value={payload.primaryContact.email} onChange={e => updateContact('email', e.target.value)} className={fieldClass} />
          </label>
          <label className={rowClass}>
            <span className={labelText}>Contact phone</span>
            <input value={payload.primaryContact.phone ?? ''} onChange={e => updateContact('phone', e.target.value)} className={fieldClass} />
          </label>
          <label className={rowClass}>
            <span className={labelText}>Contact role</span>
            <input value={payload.primaryContact.role ?? ''} onChange={e => updateContact('role', e.target.value)} className={fieldClass} />
          </label>
          {mode === 'signup' && (
            <>
              <label className={rowClass}>
                <span className={labelText}>Password</span>
                <input type="password" value={payload.password ?? ''} onChange={e => update('password', e.target.value)} className={fieldClass} />
              </label>
              <label className={rowClass}>
                <span className={labelText}>Confirm password</span>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={fieldClass} />
              </label>
            </>
          )}
        </div>
      )}

      {step === 'channels' && (
        <div className="space-y-4">
          <label className={rail ? rowClass : 'block max-w-xs space-y-1.5'}>
            <span className={labelText}>Inventory size</span>
            <input
              type="number"
              min={0}
              value={payload.inventorySize ?? ''}
              onChange={e => update('inventorySize', e.target.value ? Number(e.target.value) : null)}
              className={fieldClass}
              autoFocus
            />
          </label>
          <div className={rail ? 'grid grid-cols-1 items-start gap-1.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-4' : undefined}>
            {rail && <span className={`${labelText} sm:pt-2`}>Channels</span>}
            <div className={rail ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 gap-2 md:grid-cols-2'}>
            {CHANNEL_OPTIONS.map(channel => {
              const selected = selectedChannels.has(channel.value);
              return (
                <label
                  key={channel.value}
                  className={rail
                    ? `flex h-10 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-orange-400/25 ${selected ? 'border-orange-400 bg-orange-500/15 text-white' : 'border-white/15 bg-white/[0.04] text-white/75'}`
                    : 'flex items-center gap-2 rounded-md border border-silver-200 bg-surface-inset px-3 py-2 text-sm text-ink-body'}
                >
                  <input
                    type="checkbox"
                    className={rail ? 'h-4 w-4 accent-orange-500' : undefined}
                    checked={selected}
                    onChange={() => toggleChannel(channel.value)}
                  />
                  <span>{channel.label}</span>
                </label>
              );
            })}
            </div>
          </div>
        </div>
      )}

      {step === 'review' && (rail ? (
        <dl className="border-y border-white/10">
          {[
            ['Dealer', payload.legalName || 'Missing'],
            ['Category', payload.businessCategory],
            ['Address', `${payload.rooftopAddress.city || 'Missing'}, ${payload.rooftopAddress.state || 'Missing'}`],
            ['Contact', payload.primaryContact.name || 'Missing'],
            ['Inventory', payload.inventorySize ?? 'Not provided'],
            ['Channels', payload.desiredChannels?.length ? String(payload.desiredChannels.length) : 'None selected'],
            ['Logo', logoFile ? logoFile.name : 'Not selected'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-6 border-b border-white/10 py-3 last:border-b-0">
              <dt className="text-xs text-white/45">{label}</dt>
              <dd className="text-right text-sm font-medium text-white">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
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
      ))}

      {rail ? (
        <div className="flex flex-col gap-4 pt-2">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={() => { setError(null); setStepIndex(i => Math.max(0, i - 1)); }}
              className="text-sm font-medium text-white/55 hover:text-white"
            >
              Back
            </button>
          )}
          {onCancel && (
            <p className="text-center text-sm text-white/50">
              or{' '}
              <button type="button" onClick={onCancel} className="font-semibold text-orange-500 hover:text-orange-600">
                sign in
              </button>
              {' '}instead
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary-operator w-full">
            {submitting ? 'Creating...' : isLastStep ? 'Create dealership' : 'Continue'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 border-t border-silver-200 pt-4">
          <div>
            {onCancel && (
              <button type="button" onClick={onCancel} className="px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink-heading">
                Cancel
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => { setError(null); setStepIndex(i => Math.max(0, i - 1)); }}
                className="rounded-md border border-silver-300 px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink-heading"
              >
                Back
              </button>
            )}
            <button type="submit" disabled={submitting} className="btn-primary-operator">
              {submitting ? 'Creating...' : isLastStep ? 'Create Dealership' : 'Continue'}
            </button>
          </div>
        </div>
      )}
      {footer}
      </div>
    </form>
  );
}
