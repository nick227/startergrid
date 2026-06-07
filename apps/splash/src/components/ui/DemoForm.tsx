import { useState } from 'react';
import type { SplashContent } from '../../types/content.ts';

interface DemoFormProps {
  content: SplashContent;
  onClose: () => void;
}

interface FormState {
  name: string;
  email: string;
  company: string;
  phone: string;
}

export function DemoForm({ content, onClose }: DemoFormProps) {
  const [form, setForm] = useState<FormState>({ name: '', email: '', company: '', phone: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { brand, audience } = content;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // UI-only: simulate a brief network delay then show success
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 700);
  }

  // Close on overlay click
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-form-title"
      onClick={handleOverlayClick}
    >
      <div className="modal-box">
        {submitted ? (
          <div className="form-success">
            <div className="form-success__icon" aria-hidden="true">✓</div>
            <p className="form-success__title">You're on the list.</p>
            <p className="form-success__body">
              Thanks — we'll reach out within one business day to schedule your{' '}
              {brand.name} walkthrough.
            </p>
            <button
              className="btn btn-outline w-full"
              style={{ marginTop: 'var(--space-6)' }}
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="modal-box__header">
              <div>
                <p className="t-label mb-2" style={{ color: 'var(--accent)' }}>
                  {brand.name}
                </p>
                <h2 className="modal-box__title" id="demo-form-title">
                  Book your demo
                </h2>
              </div>
              <button
                className="modal-box__close"
                onClick={onClose}
                type="button"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-field">
                <label className="form-label" htmlFor="demo-name">
                  Full name <span aria-hidden="true">*</span>
                </label>
                <input
                  id="demo-name"
                  name="name"
                  type="text"
                  className="form-input"
                  placeholder={`Your name`}
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="demo-email">
                  Work email <span aria-hidden="true">*</span>
                </label>
                <input
                  id="demo-email"
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="you@yourcompany.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="demo-company">
                  {audience.industry.charAt(0).toUpperCase() + audience.industry.slice(1)} business name <span aria-hidden="true">*</span>
                </label>
                <input
                  id="demo-company"
                  name="company"
                  type="text"
                  className="form-input"
                  placeholder={`Your ${audience.label} name`}
                  value={form.company}
                  onChange={handleChange}
                  required
                  autoComplete="organization"
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="demo-phone">
                  Phone (optional)
                </label>
                <input
                  id="demo-phone"
                  name="phone"
                  type="tel"
                  className="form-input"
                  placeholder="(555) 000-0000"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
              </div>

              <button
                id="demo-form-submit"
                type="submit"
                className="btn btn-primary w-full"
                style={{ marginTop: 'var(--space-2)' }}
                disabled={submitting}
              >
                {submitting ? 'Sending…' : 'Request my demo →'}
              </button>

              <p className="t-caption text-center" style={{ marginTop: 'var(--space-3)' }}>
                No commitment. No credit card. We'll follow up within 1 business day.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
