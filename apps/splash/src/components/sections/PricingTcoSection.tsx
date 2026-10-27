import React from 'react';

interface PricingTcoSectionProps {
  onOpenIntake: () => void;
}

export const PricingTcoSection: React.FC<PricingTcoSectionProps> = ({ onOpenIntake }) => {
  return (
    <section
      id="pricing"
      style={{
        padding: '96px 24px',
        background: '#071321',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '780px', marginBottom: '48px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#34d399',
              marginBottom: '10px',
            }}
          >
            TRANSPARENT COMMERCIAL MODEL
          </div>
          <h2
            style={{
              fontSize: 'clamp(1.8rem, 3.2vw, 2.75rem)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: '16px',
            }}
          >
            Predictable Flat Pricing. No Hidden Per-Lead Tax.
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.68)', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            Automotive software pricing is notoriously opaque with variable per-vehicle fees, insertion costs, and lead markups. StarterGrid operates on a single transparent monthly subscription per rooftop.
          </p>
        </div>

        {/* Pricing & TCO Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            alignItems: 'stretch',
            marginBottom: '48px',
          }}
        >
          {/* Card 1: Flat Subscription */}
          <div
            style={{
              background: '#0d1e33',
              border: '2px solid #2563eb',
              borderRadius: '16px',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 20px 50px rgba(37, 99, 235, 0.15)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    background: 'rgba(37, 99, 235, 0.2)',
                    color: '#60a5fa',
                  }}
                >
                  Unified Rooftop License
                </span>
                <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                  30-Day Evaluation
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '3rem', fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>
                  $499
                </span>
                <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  / month per rooftop
                </span>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6, marginBottom: '24px' }}>
                Covers your complete inventory intake, 17-point pre-flight validation, automated syndication to 31 channels, first-party marketplace listing, and closed-loop sales attribution.
              </p>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px', marginBottom: '28px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.45)', marginBottom: '12px' }}>
                  Included In Every Subscription:
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                  <li>✓ <strong>Unlimited vehicle inventory</strong> (New, Pre-Owned, Fleet)</li>
                  <li>✓ <strong>All 31 syndication destinations</strong> (Search, Social, Classifieds)</li>
                  <li>✓ <strong>First-party Auto Marketplace distribution</strong> (0-min sync, 0 conquest ads)</li>
                  <li>✓ <strong>ADF/XML lead routing</strong> directly to your existing CRM</li>
                  <li>✓ <strong>Deterministic sales attribution</strong> & turn velocity reporting</li>
                  <li>✓ <strong>Unlimited operator accounts</strong> for your dealership sales and BDC staff</li>
                  <li>✓ <strong>Assisted DMS feed configuration</strong> by our automotive engineering team</li>
                </ul>
              </div>
            </div>

            <button
              onClick={onOpenIntake}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                background: '#2563eb',
                border: 'none',
                color: '#fff',
                fontSize: '0.9375rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
              }}
            >
              Get Onboarded Today →
            </button>
          </div>

          {/* Card 2: Total Cost of Ownership (TCO) Comparison */}
          <div
            style={{
              background: '#0d1e33',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', marginBottom: '12px' }}>
                Vendor Consolidation ROI
              </div>

              <h3 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>
                The Fragmented Vendor Stack vs. StarterGrid
              </h3>

              <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.6, marginBottom: '24px' }}>
                Most independent and franchise dealers pay multiple separate vendors for inventory management, feed syndication, third-party marketplace placements, and analytics:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '6px', background: 'rgba(7, 19, 33, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span>Separate Inventory Tool (e.g. vAuto standalone):</span>
                  <strong style={{ color: '#f87171', fontFamily: 'monospace' }}>$650 / mo</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '6px', background: 'rgba(7, 19, 33, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span>Third-Party Feed Syndicator (Homenet):</span>
                  <strong style={{ color: '#f87171', fontFamily: 'monospace' }}>$850 / mo</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '6px', background: 'rgba(7, 19, 33, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span>Marketplace Listing Subscriptions:</span>
                  <strong style={{ color: '#f87171', fontFamily: 'monospace' }}>$1,800 / mo</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '6px', background: 'rgba(7, 19, 33, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span>Attribution & Digital Analytics Add-on:</span>
                  <strong style={{ color: '#f87171', fontFamily: 'monospace' }}>$400 / mo</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', fontWeight: 700 }}>
                  <span style={{ color: '#f87171' }}>Fragmented Stack Total:</span>
                  <strong style={{ color: '#f87171', fontFamily: 'monospace', fontSize: '1rem' }}>$3,700 / mo</strong>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>
                  StarterGrid Unified Savings
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>
                  Save $3,201 / month ($38,400/yr)
                </div>
              </div>
              <span style={{ fontSize: '1.5rem' }}>💰</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
