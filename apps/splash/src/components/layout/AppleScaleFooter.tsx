import React from 'react';

export const AppleScaleFooter: React.FC = () => {
  return (
    <footer
      style={{
        background: '#04060a',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '96px 32px 56px',
        color: '#94a3b8',
        fontSize: '0.875rem',
      }}
    >
      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '48px',
          marginBottom: '64px',
        }}
      >
        {/* Col 1: Brand & Positioning */}
        <div>
          <div style={{ color: '#ffffff', fontSize: '1.125rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '14px' }}>
            DEALERGRID
          </div>
          <p style={{ lineHeight: 1.6, color: '#64748b', marginBottom: '16px', maxWidth: '300px' }}>
            Automotive sales channel intelligence and dealership distribution platform. Post your vehicles to 70+ websites from one platform.
          </p>
          <div style={{ color: '#475569', fontSize: '0.75rem' }}>
            Node 22 • Fastify REST API • React 18 Operator Portal
          </div>
        </div>

        {/* Col 2: Products & Surfaces */}
        <div>
          <div style={{ color: '#ffffff', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            Product Surfaces
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li>
              <a href="/app/" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.15s ease' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')} onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}>
                Dealership Operator Portal (/app/)
              </a>
            </li>
            <li>
              <a href="/marketplace/" style={{ color: '#34d399', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                <span>Consumer Marketplace (/marketplace/)</span>
              </a>
            </li>
            <li>
              <a href="/api/health" target="_blank" rel="noreferrer" style={{ color: '#64748b', textDecoration: 'none' }}>
                REST Engine Health Check (/health)
              </a>
            </li>
          </ul>
        </div>

        {/* Col 3: Operational Standards */}
        <div>
          <div style={{ color: '#ffffff', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            Operational Standards
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem', color: '#64748b' }}>
            <li>Non-Disruptive DMS Coexistence</li>
            <li>17-Character VIN Decoding & Check Digit</li>
            <li>Automotive 6-Slot Photo Grid</li>
            <li>Auto-lead Data Format (ADF) 1.0 XML</li>
            <li>Zero Conquest Advertising Standard</li>
          </ul>
        </div>

        {/* Col 4: Dealership Compatibility */}
        <div>
          <div style={{ color: '#ffffff', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            DMS Compatibility
          </div>
          <p style={{ lineHeight: 1.6, color: '#64748b', fontSize: '0.8125rem', marginBottom: '12px' }}>
            Works alongside CDK Global, Reynolds & Reynolds, Dealertrack, Frazer, DealerCenter, Tekion, and standard CSV exports.
          </p>
          <div style={{ fontSize: '0.75rem', color: '#475569' }}>
            Your DMS remains the authority for in-store deals and accounting.
          </div>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          paddingTop: '32px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          fontSize: '0.75rem',
          color: '#475569',
        }}
      >
        <div>
          © {new Date().getFullYear()} DealerGrid Inc. All rights reserved. Dealership software and online automotive sales platform.
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <span>Privacy & Security</span>
          <span>Terms of Service</span>
          <a href="#/dev-categories" style={{ color: '#475569', textDecoration: 'none' }}>
            Category Schemas
          </a>
        </div>
      </div>
    </footer>
  );
};
