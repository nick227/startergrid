import { useState, type FormEvent } from 'react';
import { submitVehicleLead } from '../../lib/api.ts';
import { queryErrorMessage } from '../../hooks/useQuery.ts';
import {
  EMPTY_LEAD_FORM,
  hasLeadFormErrors,
  toLeadPayload,
  validateLeadForm,
  type LeadFormErrors,
  type LeadFormValues,
} from '../../lib/leadForm.ts';
import { SectionCard } from './SectionCard.tsx';
import { ErrorState } from './ErrorState.tsx';

type Props = {
  listingId: string;
  vehicleLabel: string;
  dealerName: string;
};

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export function LeadInquiryForm({ listingId, vehicleLabel, dealerName }: Props) {
  const [values, setValues] = useState<LeadFormValues>(EMPTY_LEAD_FORM);
  const [fieldErrors, setFieldErrors] = useState<LeadFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [state, setState] = useState<FormState>('idle');

  function updateField<K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) {
    setValues(current => ({ ...current, [key]: value }));
    setFieldErrors(current => {
      if (!current[key] && !current.form) return current;
      const next = { ...current };
      delete next[key];
      delete next.form;
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateLeadForm(values);
    setFieldErrors(errors);
    if (hasLeadFormErrors(errors)) return;

    setState('submitting');
    setSubmitError(null);

    try {
      await submitVehicleLead(listingId, toLeadPayload(values));
      setState('success');
    } catch (error) {
      setSubmitError(queryErrorMessage(error));
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <SectionCard title="Inquiry sent" className="border-emerald-200 bg-emerald-50">
        <p className="text-sm leading-relaxed text-emerald-900">
          Thanks! <span className="font-semibold">{dealerName}</span> received your message about the{' '}
          <span className="font-semibold">{vehicleLabel}</span>.
        </p>
        <p className="mt-2 text-sm text-emerald-800">
          A dealer representative should follow up using the contact details you provided.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Contact dealer">
      <p className="mb-4 text-sm text-ink-muted">
        Send a basic inquiry about this {vehicleLabel} to {dealerName}. No account required.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label="Vehicle inquiry form">
        {fieldErrors.form && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
            {fieldErrors.form}
          </p>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="mp-label">Name</span>
          <input
            type="text"
            value={values.contactName}
            onChange={e => updateField('contactName', e.target.value)}
            autoComplete="name"
            className="mp-input"
            aria-invalid={Boolean(fieldErrors.contactName)}
          />
          {fieldErrors.contactName && (
            <span className="text-xs text-red-600">{fieldErrors.contactName}</span>
          )}
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="mp-label">Email</span>
            <input
              type="email"
              value={values.contactEmail}
              onChange={e => updateField('contactEmail', e.target.value)}
              autoComplete="email"
              className="mp-input"
              aria-invalid={Boolean(fieldErrors.contactEmail)}
            />
            {fieldErrors.contactEmail && (
              <span className="text-xs text-red-600">{fieldErrors.contactEmail}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="mp-label">Phone</span>
            <input
              type="tel"
              value={values.contactPhone}
              onChange={e => updateField('contactPhone', e.target.value)}
              autoComplete="tel"
              className="mp-input"
              aria-invalid={Boolean(fieldErrors.contactPhone)}
            />
            {fieldErrors.contactPhone && (
              <span className="text-xs text-red-600">{fieldErrors.contactPhone}</span>
            )}
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="mp-label">Message <span className="font-normal normal-case text-ink-faint">(optional)</span></span>
          <textarea
            value={values.message}
            onChange={e => updateField('message', e.target.value)}
            rows={4}
            className="mp-input resize-y"
            aria-invalid={Boolean(fieldErrors.message)}
          />
          {fieldErrors.message && (
            <span className="text-xs text-red-600">{fieldErrors.message}</span>
          )}
        </label>

        {state === 'error' && submitError && (
          <ErrorState message={submitError} onRetry={() => setState('idle')} title="Could not send inquiry" />
        )}

        <button
          type="submit"
          disabled={state === 'submitting'}
          className="mp-btn-primary w-full sm:w-auto"
        >
          {state === 'submitting' ? 'Sending…' : 'Send inquiry'}
        </button>
      </form>
    </SectionCard>
  );
}
