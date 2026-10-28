import React from 'react';

export const WorkflowThreeStep: React.FC = () => {
  return (
    <section
      id="how-it-works"
      style={{
        padding: '80px 24px',
        background: '#06090f',
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
            HOW IT WORKS
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
            From Your Lot to Buyer Inquiries in Three Steps
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            StarterGrid simplifies your online sales operations. Connect your existing inventory, publish across 30+ advertising channels, and route qualified leads directly to your sales desk.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Step 1 */}
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: '#38bdf8',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                  }}
                >
                  STEP 01
                </span>
                <span style={{ fontSize: '1.75rem' }}>🔌</span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px', letterSpacing: '-0.01em' }}>
                Connect Your DMS
              </h3>

              <p style={{ color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '20px' }}>
                Import vehicles from CDK, Reynolds & Reynolds, Dealertrack, Frazer, or standard CSV files. Your DMS remains the authority for accounting and deals.
              </p>
            </div>

            <div
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.8125rem',
                color: '#cbd5e1',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981' }}>✓</span>
                <span>Automatic daily or scheduled inventory sync</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981' }}>✓</span>
                <span>Pre-flight checks fix missing photos and prices</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: '#60a5fa',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: 'rgba(96, 165, 250, 0.1)',
                    border: '1px solid rgba(96, 165, 250, 0.25)',
                  }}
                >
                  STEP 02
                </span>
                <span style={{ fontSize: '1.75rem' }}>🌐</span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px', letterSpacing: '-0.01em' }}>
                Publish Everywhere
              </h3>

              <p style={{ color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '20px' }}>
                Push listings to Google Vehicle Ads, Facebook Marketplace, CarGurus, AutoTrader, and the StarterGrid Consumer Marketplace in one click.
              </p>
            </div>

            <div
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.8125rem',
                color: '#cbd5e1',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981' }}>✓</span>
                <span>Automatic formatting for every channel's rules</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981' }}>✓</span>
                <span>Sold cars are unlisted immediately to save ad spend</span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: '#34d399',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: 'rgba(52, 211, 153, 0.1)',
                    border: '1px solid rgba(52, 211, 153, 0.25)',
                  }}
                >
                  STEP 03
                </span>
                <span style={{ fontSize: '1.75rem' }}>📥</span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px', letterSpacing: '-0.01em' }}>
                Leads Route to Your CRM
              </h3>

              <p style={{ color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '20px' }}>
                Shopper inquiries transmit directly to your dealership inbox and CRM via standard ADF/XML email. You see exactly which channels produce paying buyers.
              </p>
            </div>

            <div
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.8125rem',
                color: '#cbd5e1',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981' }}>✓</span>
                <span>Standard ADF 1.0 XML delivery to any CRM</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981' }}>✓</span>
                <span>Track verified sales by marketing channel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
