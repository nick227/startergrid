import React from 'react';

interface FlagshipHeroSectionProps {
  onContactUs: () => void;
  onOpenPricing: () => void;
}

export const FlagshipHeroSection: React.FC<FlagshipHeroSectionProps> = ({ onContactUs, onOpenPricing }) => {
  return (
    <section
      id="hero-distribution"
      style={{
        padding: '72px 32px 96px',
        background: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(37, 99, 235, 0.12) 0%, transparent 80%), #080c14',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        {/* Top Text Block: Enormous Typography & Apple-Scale Restraint */}
        <div style={{ maxWidth: '1060px', marginBottom: '40px' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: '#3b82f6',
              textTransform: 'uppercase',
              marginBottom: '20px',
            }}
          >
            DEALERGRID / AUTOMOTIVE SOFTWARE
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5.2vw, 5.25rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              marginBottom: '24px',
            }}
          >
            Post your vehicles to 70+ websites from one platform.
          </h1>

          <p
            style={{
              fontSize: 'clamp(1.125rem, 1.8vw, 1.625rem)',
              lineHeight: 1.5,
              color: '#94a3b8',
              maxWidth: '860px',
              marginBottom: '32px',
            }}
          >
            Compare what sells, where it sells, and how quickly.
          </p>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={onContactUs}
              style={{
                padding: '16px 36px',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: '1.0625rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1d4ed8';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2563eb';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Contact Us
            </button>

            <button
              onClick={onOpenPricing}
              style={{
                padding: '16px 28px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                fontSize: '1.0625rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
              }}
            >
              View Proposed Pricing
            </button>

            <a
              href="/app/"
              style={{
                padding: '16px 28px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '1.0625rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
              }}
            >
              <span>Explore Live Operator Portal</span>
              <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>[Live Demo]</span>
            </a>

            <a
              href="/marketplace/"
              style={{
                padding: '16px 28px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                textDecoration: 'none',
                fontSize: '1.0625rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <span>Browse Public Marketplace ↗</span>
            </a>
          </div>
        </div>

        {/* Minimalist Bauhaus Graphic Card */}
        <div
          style={{
            maxWidth: '1080px',
            margin: '0 auto',
            position: 'relative',
            background: '#090d16',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 30px 90px rgba(0, 0, 0, 0.75), 0 0 60px rgba(37, 99, 235, 0.12)',
          }}
        >
          {/* Subtle Top Control Bar */}
          <div
            style={{
              padding: '14px 24px',
              background: 'rgba(8, 12, 20, 0.95)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              </div>
              <span style={{ color: '#ffffff', fontSize: '0.8125rem', fontWeight: 700 }}>
                DealerGrid Distribution Engine
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem' }}>
              <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                70+ Live Syndication Channels
              </span>
              <span style={{ color: '#64748b' }}>•</span>
              <span style={{ color: '#60a5fa' }}>
                Bi-Directional DMS Sync Active
              </span>
            </div>
          </div>

          {/* AI Generated Graphic: Sophisticated Multi-Channel Syndication Network */}
          <div style={{ position: 'relative', width: '100%', lineHeight: 0, background: '#090d16', display: 'flex', justifyContent: 'center' }}>
            <img
              src="/hero-distribution-sleek.jpg"
              alt="DealerGrid Multi-Channel Vehicle Syndication and Connected Automotive Distribution Network"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                maxHeight: '540px',
                objectFit: 'contain',
              }}
              loading="eager"
            />
          </div>

          {/* Bottom Footnote Bar */}
          <div
            style={{
              padding: '14px 24px',
              background: 'rgba(8, 12, 20, 0.95)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#64748b',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <span>
              Real-time vehicle inventory orchestration, automated sold withdrawal, and multi-channel dealer syndication.
            </span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>
              Zero Listing Fees • Zero Commission Cuts
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

