import React from 'react';

export const EditorialFooter: React.FC = () => {
  return (
    <footer
      style={{
        background: '#06090f',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '64px 24px 40px',
        color: '#94a3b8',
        fontSize: '0.8125rem',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '40px',
          marginBottom: '48px',
        }}
      >
        {/* Col 1 */}
        <div>
          <div style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 800, marginBottom: '12px' }}>
            DEALERGRID
          </div>
          <p style={{ lineHeight: 1.6, color: '#64748b', marginBottom: '16px' }}>
            One platform for online automotive sales. Manage lot inventory, connect advertising channels, route inquiries, and measure performance.
          </p>
          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
            Fastify REST API • React 18 Operator Portal • Auto Marketplace
          </div>
        </div>

        {/* Col 2 */}
        <div>
          <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Application Surfaces
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <a href="/app/" style={{ color: '#94a3b8', textDecoration: 'none' }}>
                Dealership & Operator Portal (/app/)
              </a>
            </li>
            <li>
              <a href="/marketplace/" style={{ color: '#94a3b8', textDecoration: 'none' }}>
                Auto Consumer Marketplace (/marketplace/)
              </a>
            </li>
            <li>
              <a href="/api/health" target="_blank" rel="noreferrer" style={{ color: '#94a3b8', textDecoration: 'none' }}>
                REST Engine Health (/health)
              </a>
            </li>
          </ul>
        </div>

        {/* Col 3 */}
        <div>
          <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Documentation & Standards
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>DMS Coexistence (Accounting & Flooring)</li>
            <li>17-Character VIN Decoding & Check Digit</li>
            <li>Automotive 6-Slot Photo Grid</li>
            <li>Auto-lead Data Format (ADF) 1.0 XML</li>
            <li>4-Tier Evidence Hierarchy</li>
          </ul>
        </div>

        {/* Col 4 */}
        <div>
          <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Dealership Coexistence
          </div>
          <p style={{ lineHeight: 1.6, color: '#64748b', marginBottom: '10px' }}>
            Compatible with inventory outputs from CDK Global, Reynolds & Reynolds, Dealertrack, Frazer, DealerCenter, Tekion, and standard CSV exports.
          </p>
          <div style={{ fontSize: '0.75rem', color: '#475569' }}>
            Your DMS remains the authority for in-store deals and flooring.
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          paddingTop: '24px',
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
          © {new Date().getFullYear()} DealerGrid Inc. All rights reserved. Dealership inventory software and online sales platform.
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="#/dev-categories" style={{ color: '#475569', textDecoration: 'none' }}>
            Internal Category Schemas
          </a>
        </div>
      </div>
    </footer>
  );
};
