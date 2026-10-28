import React from 'react';

export const WhyChooseSection: React.FC = () => {
  return (
    <section
      id="why-choose"
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
            WHY DEALERSHIPS CHOOSE STARTERGRID
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
            Built for Real Dealership Operations
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            Eliminate wasted marketing budget, protect your in-store traffic from competitor conquest ads, and keep your inventory organized without switching accounting systems.
          </p>
        </div>

        {/* 4 Outcome Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '28px',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '16px' }}>🛑</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
              Stop Paying for Sold Cars
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
              The moment a vehicle is marked sold on your lot, StarterGrid unlists it across all connected channels. You stop wasting ad budget on inventory you no longer have in stock.
            </p>
          </div>

          {/* Card 2 */}
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '28px',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '16px' }}>🛡️</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
              Zero Conquest Ads
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
              On our consumer marketplace, competitors cannot pay to place their vehicles on your vehicle detail pages. Shoppers viewing your cars see only your dealership contact info.
            </p>
          </div>

          {/* Card 3 */}
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '28px',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '16px' }}>📊</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
              Sales Tracking by Channel
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
              Third-party ad portals love to claim credit for every in-store sale. StarterGrid relies on your sales desk confirmations and verified buyer inquiries to report what actually sold.
            </p>
          </div>

          {/* Card 4 */}
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '28px',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '16px' }}>🔌</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
              Coexists With Your DMS
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
              Works alongside CDK Global, Reynolds & Reynolds, Dealertrack, Frazer, and standard CSV exports. Your DMS remains the system of record for accounting, deals, and flooring.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
