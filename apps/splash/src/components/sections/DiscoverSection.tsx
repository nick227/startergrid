import React from 'react';
import { TOP_TEN_VALUE_PROPOSITIONS } from '../../data/topTenValueProps.ts';

export const DiscoverSection: React.FC = () => {
  return (
    <section
      id="discover"
      style={{
        padding: '120px 32px 140px',
        background: '#06090f',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        {/* Header Block */}
        <div style={{ maxWidth: '1200px', marginBottom: '64px' }}>
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
            DISCOVER DEALERGRID
          </div>

          <h2
            style={{
              fontSize: 'clamp(2.4rem, 4.8vw, 4.25rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              marginBottom: '24px',
            }}
          >
            Explore what DealerGrid offers.
          </h2>

          <p
            style={{
              fontSize: 'clamp(1.125rem, 1.8vw, 1.45rem)',
              lineHeight: 1.6,
              color: '#94a3b8',
              margin: 0,
              maxWidth: '880px',
            }}
          >
            Twelve operational advantages designed to expand your vehicle reach, protect your showroom traffic, and keep your lot organized.
          </p>
        </div>

        {/* 12 Benefits Compact Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '24px',
          }}
        >
          {TOP_TEN_VALUE_PROPOSITIONS.map((vp) => (
            <a
              key={vp.number}
              href={`#${vp.id}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px',
                padding: '24px 28px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  color: '#38bdf8',
                  paddingTop: '2px',
                }}
              >
                {vp.number}
              </span>

              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontSize: '1.0625rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    lineHeight: 1.4,
                    marginBottom: '8px',
                  }}
                >
                  {vp.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.875rem',
                    lineHeight: 1.55,
                    color: '#94a3b8',
                    marginBottom: '12px',
                  }}
                >
                  {vp.summary}
                </p>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#60a5fa',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Explore in detail</span>
                  <span>↓</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
