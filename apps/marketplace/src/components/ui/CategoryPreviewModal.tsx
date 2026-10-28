import React, { useState, useEffect } from 'react';
import type { CategoryVerticalMeta } from '../../data/productVerticals.ts';
import { CategoryIcon } from './CategoryIcons.tsx';

type Props = {
  meta: CategoryVerticalMeta | null;
  onClose: () => void;
};

const STORAGE_KEY = 'dealergrid_category_alerts';

type SavedAlert = {
  email: string;
  categoryId: string;
  timestamp: string;
};

function getSavedAlerts(): SavedAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAlert(alert: SavedAlert): void {
  try {
    const existing = getSavedAlerts().filter(
      (a) => !(a.email === alert.email && a.categoryId === alert.categoryId),
    );
    existing.push(alert);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Non-fatal if localStorage is restricted
  }
}

export const CategoryPreviewModal: React.FC<Props> = ({ meta, onClose }) => {
  const [email, setEmail] = useState('');
  const [recordedAlert, setRecordedAlert] = useState<SavedAlert | null>(null);

  useEffect(() => {
    if (!meta) return;
    const existing = getSavedAlerts().find((a) => a.categoryId === meta.id);
    if (existing) {
      setRecordedAlert(existing);
    } else {
      setRecordedAlert(null);
      setEmail('');
    }
  }, [meta]);

  if (!meta) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;

    const alert: SavedAlert = {
      email: cleanEmail,
      categoryId: meta.id,
      timestamp: new Date().toISOString(),
    };
    saveAlert(alert);
    setRecordedAlert(alert);
  };

  const handleClearAlert = () => {
    try {
      const remaining = getSavedAlerts().filter((a) => a.categoryId !== meta.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
      setRecordedAlert(null);
      setEmail('');
    } catch {
      // Non-fatal
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-silver-200 transition-all max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 bg-gradient-to-r ${meta.gradient} text-white relative`}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 rounded-full bg-black/20 p-2 text-white/80 hover:bg-black/40 hover:text-white transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-white">
              <CategoryIcon name={meta.iconKey} size={24} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                Coming Soon — Category in Preparation
              </div>
              <h2 id="category-preview-title" className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                {meta.name}
              </h2>
            </div>
          </div>
          <p className="text-sm text-white/90 max-w-lg mt-2">
            {meta.shortDesc}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-ink-body">
          {/* Overview */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
              Category Scope &amp; Purpose
            </h3>
            <p className="leading-relaxed text-sm">
              {meta.fullDesc}
            </p>
          </div>

          {/* Standards & Structured Attributes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-silver-100/70 p-4 border border-silver-200">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
                Standard Identifier
              </div>
              <div className="font-semibold text-navy-900 text-sm">
                {meta.primaryIdentifier}
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Standard product identifier schema (e.g. VIN, HIN, ISBN, Serial #).
              </p>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
                Supported Product Types
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {meta.typicalItems.map((item, idx) => (
                  <span key={idx} className="rounded bg-white px-2 py-0.5 text-[11px] font-medium text-navy-900 border border-silver-200">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Standardized Specifications */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
              Standardized Schema Attributes
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {meta.keyAttributes.map((attr, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg bg-surface-page px-3 py-2 border border-silver-200/80">
                  <span className="text-cta font-bold">✓</span>
                  <span className="font-medium text-navy-900">{attr}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Planned Launch Notification Section */}
          <div className="border-t border-silver-200 pt-5 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Launch Notifications (Planned Feature)
                </span>
                <span className="text-[10px] rounded bg-silver-200 px-1.5 py-0.5 font-semibold text-slate-700">
                  In Development
                </span>
              </div>
              <p className="text-xs text-ink-muted mb-3 leading-relaxed">
                Public consumer listings for this vertical are in preparation. Record your email below to save your preference locally; automated email delivery is planned to activate once listings launch.
              </p>

              {recordedAlert ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      Preference Saved
                    </span>
                    <button
                      type="button"
                      onClick={handleClearAlert}
                      className="text-[11px] text-emerald-700 hover:text-red-600 underline font-normal"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Your interest for <strong>{meta.name}</strong> was recorded for <em>{recordedAlert.email}</em>.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email for launch updates"
                    className="mp-input text-xs py-2 flex-1"
                    required
                  />
                  <button type="submit" className="mp-btn-primary shrink-0 text-xs py-2 px-4 shadow-sm">
                    Record Interest
                  </button>
                </form>
              )}
            </div>

            {/* Merchant / Seller Link */}
            <div className="rounded-xl border border-silver-200 bg-surface-page p-3.5 flex items-center justify-between text-xs text-ink-muted">
              <span>Are you a business, merchant, or dealership in this industry?</span>
              <a
                href="http://localhost:5173/app/"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-cta hover:underline shrink-0 ml-2"
              >
                Seller Portal ↗
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-silver-100/80 px-6 py-3 border-t border-silver-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="mp-btn-secondary text-xs py-1.5 px-4"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
