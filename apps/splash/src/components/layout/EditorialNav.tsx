import React from 'react';
import { getMarketplaceUrl, getOperatorPortalUrl } from '../../lib/navigation.ts';

interface EditorialNavProps {
  onRequestAccess: () => void;
}

export const EditorialNav: React.FC<EditorialNavProps> = ({ onRequestAccess }) => {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        background: '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 1000,
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1280px',
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
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            DEALERGRID
          </span>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: '#64748b',
              textTransform: 'uppercase',
            }}
          >
            / Dealership Software
          </span>
        </a>

        {/* Primary Nav Links */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '24px',
          }}
          className="desktop-nav"
        >
          <a
            href="#top-propositions"
            style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Top 10 Value Props
          </a>
          <a
            href="#vp-01"
            style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
          >
            70+ Websites
          </a>
          <a
            href="#vp-02"
            style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Marketplace
          </a>
          <a
            href="#vp-03"
            style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Paid Ads
          </a>
          <a
            href="#vp-05"
            style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
          >
            DMS Setup
          </a>
          <a
            href="#getting-started"
            style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Get Started
          </a>
        </nav>

        {/* Action CTAs: Obvious Shopper & Dealership Pathways */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Shopper Entrance */}
          <a
            href={getMarketplaceUrl()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '6px',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span>Browse Vehicles ↗</span>
          </a>

          {/* Dealership Sign In */}
          <a
            href={getOperatorPortalUrl()}
            style={{
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.04)',
            }}
          >
            Sign In
          </a>

          {/* Dealership Primary CTA */}
          <button
            onClick={onRequestAccess}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
};
