import { useState } from 'react';
import { MarketplaceListingReportRequest } from '@dealer-marketplace/client';
import { submitListingReport } from '../../lib/api.ts';

type Reason = MarketplaceListingReportRequest.reason;
const { reason: ReasonEnum } = MarketplaceListingReportRequest;

const REASONS: { value: Reason; label: string }[] = [
  { value: ReasonEnum.PRICE_MISMATCH,         label: 'Price doesn\'t match listing' },
  { value: ReasonEnum.SOLD_OR_UNAVAILABLE,    label: 'Already sold or unavailable' },
  { value: ReasonEnum.SUSPECTED_FRAUD,        label: 'Suspected fraud or scam' },
  { value: ReasonEnum.INACCURATE_DESCRIPTION, label: 'Inaccurate description or photos' },
  { value: ReasonEnum.INAPPROPRIATE_CONTENT,  label: 'Inappropriate content' },
  { value: ReasonEnum.OTHER,                  label: 'Other' },
];

type Props = {
  listingId: string;
  onClose: () => void;
};

export function ReportListingModal({ listingId, onClose }: Props) {
  const [reason,    setReason]    = useState<Reason>(ReasonEnum.SOLD_OR_UNAVAILABLE);
  const [details,   setDetails]   = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await submitListingReport(listingId, { reason, details: details.trim() || undefined });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-elevation-4">
        {submitted ? (
          <div className="space-y-4 text-center">
            <p className="text-3xl">✓</p>
            <h2 className="text-lg font-semibold text-ink-heading">Report submitted</h2>
            <p className="text-sm text-ink-muted">
              Thank you for helping us keep the marketplace accurate.
              We review all reports within 1–2 business days.
            </p>
            <button type="button" onClick={onClose} className="mp-btn-secondary w-full">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <h2 id="report-modal-title" className="text-lg font-semibold text-ink-heading">
                Report this listing
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="mp-focus shrink-0 rounded-lg p-1 text-ink-muted hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="mp-label text-ink-faint">Reason</p>
              {REASONS.map(r => (
                <label key={r.value} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-surface-inset">
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-navy-700"
                  />
                  <span className="text-sm text-ink-body">{r.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="mp-label block text-ink-faint" htmlFor="report-details">
                Additional details <span className="font-normal">(optional)</span>
              </label>
              <textarea
                id="report-details"
                rows={3}
                maxLength={1000}
                value={details}
                onChange={e => setDetails(e.target.value)}
                className="mp-input mt-1 w-full resize-none"
                placeholder="Any extra context that helps us review the report…"
              />
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="mp-btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="mp-btn-primary flex-1">
                {loading ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
