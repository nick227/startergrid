import React from 'react';
import { TOP_TEN_VALUE_PROPOSITIONS } from '../../data/topTenValueProps.ts';
import { getOperatorPortalUrl, getMarketplaceUrl } from '../../lib/navigation.ts';

interface TopTenHeroOverviewProps {
  onRequestAccess: () => void;
}

export const TopTenHeroOverview: React.FC<TopTenHeroOverviewProps> = ({ onRequestAccess }) => {
  return (
    <section
      style={{
        padding: '72px 24px 64px',
        background: '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header Block */}
        <div style={{ maxWidth: '920px', marginBottom: '40px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: '#3b82f6',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            DEALERGRID / ONLINE AUTOMOTIVE SALES PLATFORM
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 4.5vw, 3.75rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginBottom: '18px',
            }}
          >
            DealerGrid — Top 10 Core Value Propositions
          </h1>

          <p
            style={{
              fontSize: '1.25rem',
              lineHeight: 1.55,
              color: '#cbd5e1',
              marginBottom: '28px',
              maxWidth: '820px',
            }}
          >
            These are our ten primary selling points, ordered from our strongest differentiators to our broader dealership management capabilities.
          </p>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={onRequestAccess}
              style={{
                padding: '12px 24px',
                borderRadius: '6px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.9375rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Contact Us
            </button>

            <a
              href={getOperatorPortalUrl()}
              style={{
                padding: '12px 20px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '0.9375rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Explore Live Operator Portal</span>
              <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>[Live Demo]</span>
            </a>

            <a
              href={getMarketplaceUrl()}
              style={{
                padding: '12px 20px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                textDecoration: 'none',
                fontSize: '0.9375rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <span>Browse Public Marketplace ↗</span>
            </a>
          </div>
        </div>

        {/* Top 10 Propositions - Literally Listed on Top of Page */}
        <div
          style={{
            background: '#0d131f',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Executive Summary — Top 10 Core Selling Points
              </h2>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Click any proposition to jump directly to its detailed breakdown and live software example.
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 600 }}>
              10 Primary Selling Points
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '16px',
            }}
          >
            {TOP_TEN_VALUE_PROPOSITIONS.map((vp) => (
              <a
                key={vp.number}
                href={`#${vp.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  padding: '16px 18px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                }}
              >
                <div
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    color: '#38bdf8',
                    lineHeight: 1,
                    paddingTop: '2px',
                  }}
                >
                  {vp.number}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.4, marginBottom: '6px' }}>
                    {vp.title}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '8px' }}>
                    {vp.summary}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#60a5fa', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>Explore details & live example</span>
                    <span>↓</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
