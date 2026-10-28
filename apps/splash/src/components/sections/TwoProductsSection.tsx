import React from 'react';

export const TwoProductsSection: React.FC = () => {
  return (
    <section
      id="products"
      style={{
        padding: '80px 24px',
        background: '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '780px', marginBottom: '48px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: '#3b82f6',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            THE STARTERGRID ECOSYSTEM
          </div>
          <h2
            style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 2.75rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: '16px',
            }}
          >
            One Platform. Two High-Value Products.
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            StarterGrid provides a dedicated management portal for your dealership team, plus an independent, ad-free consumer marketplace where buyers browse your inventory without seeing competitor ads.
          </p>
        </div>

        {/* 2 Product Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '28px',
          }}
        >
          {/* Product 1: Operator Portal */}
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '12px',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#60a5fa',
                    background: 'rgba(59, 130, 246, 0.12)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                >
                  DEALERSHIP SOFTWARE
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                  /app/
                </span>
              </div>

              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>
                Dealership Operator Portal
              </h3>

              <p style={{ color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '24px' }}>
                The command center for your lot. Sync with your DMS, review listing quality checks, manage scheduled feed exports, and monitor buyer inquiries in a shared sales inbox.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.875rem', color: '#cbd5e1' }}>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>✓</span>
                  <span><strong>Centralized Lot Inventory:</strong> View active, pending, and sold vehicles synced directly from your DMS.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.875rem', color: '#cbd5e1' }}>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>✓</span>
                  <span><strong>Listing Quality Checks:</strong> Flags missing photos, VIN check-digit errors, and missing prices before feeds export.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.875rem', color: '#cbd5e1' }}>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>✓</span>
                  <span><strong>Sales Tracking by Channel:</strong> Connect verified vehicle sales back to the advertising channel that brought in the buyer.</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '20px' }}>
              <a
                href="/app/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  background: '#2563eb',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                <span>Explore Live Operator Portal</span>
                <span>→</span>
              </a>
            </div>
          </div>

          {/* Product 2: Consumer Marketplace */}
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '12px',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#34d399',
                    background: 'rgba(16, 185, 129, 0.12)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  CONSUMER MARKETPLACE
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                  /marketplace/
                </span>
              </div>

              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>
                StarterGrid Auto Marketplace
              </h3>

              <p style={{ color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '24px' }}>
                A consumer car shopping destination that showcases verified dealership inventory nationwide. Shoppers search your vehicles without conquest advertising.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.875rem', color: '#cbd5e1' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                  <span><strong>Zero Competitor Conquest Ads:</strong> Interested buyers viewing your vehicle see only your car and your dealership info.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.875rem', color: '#cbd5e1' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                  <span><strong>Clean Vehicle Detail Pages:</strong> Fast-loading photo carousels, verified specs, and clear dealership location badges.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.875rem', color: '#cbd5e1' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                  <span><strong>Direct Lead Delivery:</strong> Inquiries, availability questions, and test drive requests route straight into your CRM.</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '20px' }}>
              <a
                href="/marketplace/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                <span>Browse Public Consumer Marketplace</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
