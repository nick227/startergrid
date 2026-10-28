import React from 'react';
import { getMarketplaceUrl } from '../../lib/navigation.ts';

export const MarketplaceHeroSection: React.FC = () => {
  return (
    <section
      id="vp-02"
      style={{
        padding: '140px 32px',
        background: '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        position: 'relative',
        scrollMarginTop: '72px',
      }}
    >
      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        {/* Top Text Block */}
        <div style={{ maxWidth: '980px', marginBottom: '64px' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: '#10b981',
              textTransform: 'uppercase',
              marginBottom: '20px',
            }}
          >
            FIRST-PARTY MARKETPLACE / ZERO LISTING FEES
          </div>

          <h2
            style={{
              fontSize: 'clamp(2.4rem, 4.8vw, 4.5rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.035em',
              lineHeight: 1.08,
              marginBottom: '24px',
            }}
          >
            List your vehicles for free on the DealerGrid Marketplace.
          </h2>

          <p
            style={{
              fontSize: 'clamp(1.2rem, 1.9vw, 1.6rem)',
              lineHeight: 1.55,
              color: '#94a3b8',
              marginBottom: '32px',
            }}
          >
            Your own dealership showcase, direct buyer inquiries, and no listing fees or commissions.
          </p>

          <a
            href={getMarketplaceUrl()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 28px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34d399',
              textDecoration: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.35)';
            }}
          >
            <span>Browse the Public Consumer Marketplace</span>
            <span>↗</span>
          </a>
        </div>

        {/* Cinematic Visual Showcase */}
        <div
          style={{
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.65)',
            background: '#0a0e17',
          }}
        >
          {/* Hero Automotive Background */}
          <div style={{ height: '380px', position: 'relative', overflow: 'hidden' }}>
            <img
              src="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1600&auto=format&fit=crop&q=85"
              alt="Luxury vehicle showcase"
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.65)' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, #0a0e17 0%, transparent 60%)',
              }}
            />

            {/* Floating Differentiator Badge */}
            <div
              style={{
                position: 'absolute',
                top: '28px',
                left: '28px',
                background: 'rgba(8, 12, 20, 0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '12px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>🛡️</span>
              <div>
                <strong style={{ color: '#34d399', fontSize: '0.875rem', display: 'block' }}>
                  Zero Conquest Advertising
                </strong>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  Competitors cannot bid or display ads on your vehicle detail pages.
                </span>
              </div>
            </div>
          </div>

          {/* Realistic Marketplace Card Preview */}
          <div style={{ padding: '36px', background: '#0a0e17' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '32px',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Direct Shopper Experience
                </span>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginTop: '6px', marginBottom: '14px' }}>
                  Your cars take center stage.
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6, marginBottom: '20px' }}>
                  Traditional third-party listing platforms charge monthly subscriptions, then sell conquest ads on your vehicle pages to redirect shoppers to rival lots. On DealerGrid, buyers view your inventory with zero competing ads and direct sales desk contact.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', color: '#cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#10b981' }}>✓</span>
                    <span>No per-vehicle listing fees, commissions, or buyer surcharges</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#10b981' }}>✓</span>
                    <span>Inquiries and appointment requests route straight to your CRM</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#10b981' }}>✓</span>
                    <span>Direct phone and address display with Google Maps showroom directions</span>
                  </div>
                </div>
              </div>

              {/* Sample Marketplace Vehicle Detail Layout */}
              <div
                style={{
                  background: '#0d131f',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '24px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '1.125rem', color: '#ffffff' }}>2022 Ford F-150 Lariat 4x4</strong>
                  <strong style={{ fontSize: '1.25rem', color: '#10b981' }}>$46,990</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '16px' }}>
                  STK-22084 • VIN: 1FTFW1ED4NFA10928 • 34,120 miles
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '20px' }}>
                  <div>Dealership: <strong style={{ color: '#ffffff' }}>Austin Auto Group</strong></div>
                  <div>Location: <strong style={{ color: '#ffffff' }}>Austin, TX</strong></div>
                  <div>Engine: <strong style={{ color: '#ffffff' }}>3.5L PowerBoost</strong></div>
                  <div>Transmission: <strong style={{ color: '#ffffff' }}>10-Speed Auto</strong></div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1, padding: '10px', textAlign: 'center', borderRadius: '6px', background: '#2563eb', color: '#ffffff', fontSize: '0.8125rem', fontWeight: 600 }}>
                    Inquire Online (Direct)
                  </div>
                  <div style={{ flex: 1, padding: '10px', textAlign: 'center', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.06)', color: '#cbd5e1', fontSize: '0.8125rem', fontWeight: 600 }}>
                    Call Dealership
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
