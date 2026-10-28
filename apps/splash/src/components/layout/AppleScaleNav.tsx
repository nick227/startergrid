import React, { useState, useEffect } from 'react';

interface AppleScaleNavProps {
  onOpenPricing: () => void;
  onContactUs: () => void;
}

export const AppleScaleNav: React.FC<AppleScaleNavProps> = ({ onOpenPricing, onContactUs }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        background: scrolled ? 'rgba(8, 12, 20, 0.9)' : 'rgba(8, 12, 20, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${scrolled ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)'}`,
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand */}
        <a
          href="#/"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'baseline',
            gap: '10px',
          }}
        >
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: '#ffffff',
            }}
          >
            DEALERGRID
          </span>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.12em',
              color: '#64748b',
              textTransform: 'uppercase',
            }}
          >
            Automotive Software
          </span>
        </a>

        {/* Right Actions: Clean, Restrained, Confident */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Marketplace */}
          <a
            href="/marketplace/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              padding: '7px 14px',
              borderRadius: '9999px',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)';
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            <span>Marketplace ↗</span>
          </a>

          {/* Pricing (Opens Pricing & Mock Stripe Modal) */}
          <button
            type="button"
            onClick={onOpenPricing}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e2e8f0',
              fontSize: '0.8125rem',
              fontWeight: 600,
              padding: '7px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#38bdf8';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#e2e8f0';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Pricing
          </button>

          {/* Sign In */}
          <a
            href="/app/"
            style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              padding: '7px 12px',
              borderRadius: '6px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            Sign In
          </a>

          {/* Contact Us (Changed from Request Access) */}
          <button
            type="button"
            onClick={onContactUs}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)',
              transition: 'background 0.15s ease, transform 0.15s ease',
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
        </div>
      </div>
    </header>
  );
};
