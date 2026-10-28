import React from 'react';
import { getOperatorPortalUrl, getMarketplaceUrl, getHealthUrl } from '../../lib/navigation.ts';

export const FlagshipFooter: React.FC = () => {
  return (
    <footer
      style={{
        background: '#040c17',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '64px 24px 36px',
        color: '#fff',
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
        {/* Column 1: Platform Overview */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                color: '#fff',
                fontSize: '0.75rem',
              }}
            >
              SG
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 800 }}>StarterGrid</span>
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '0.8125rem', lineHeight: 1.6, marginBottom: '16px' }}>
            The complete platform for online automotive sales. Manage vehicle inventory, connect online sales channels, receive buyer inquiries, and see which channels actually sell cars.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.6)' }}>
              Node 22
            </span>
            <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.6)' }}>
              Fastify v5
            </span>
            <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.6)' }}>
              Prisma ORM
            </span>
            <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.6)' }}>
              React 18
            </span>
          </div>
        </div>

        {/* Column 2: Architecture & Surfaces */}
        <div>
          <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '14px' }}>
            Application Surfaces
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
            <li>
              <a href={getOperatorPortalUrl()} style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'none' }}>
                Dealership & Operator Portal <code style={{ color: '#60a5fa', fontSize: '0.75rem' }}>/app/</code>
              </a>
            </li>
            <li>
              <a href={getMarketplaceUrl()} style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'none' }}>
                Consumer Auto Marketplace <code style={{ color: '#60a5fa', fontSize: '0.75rem' }}>/marketplace/</code>
              </a>
            </li>
            <li>
              <a href={getHealthUrl()} target="_blank" rel="noreferrer" style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'none' }}>
                REST API Health Check <code style={{ color: '#60a5fa', fontSize: '0.75rem' }}>/health</code>
              </a>
            </li>
            <li>
              <a href="#/dev-categories" style={{ color: 'rgba(255, 255, 255, 0.4)', textDecoration: 'none' }}>
                Category Schema Registry (Internal)
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Operational Principles */}
        <div>
          <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '14px' }}>
            Operational Standards
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.75)' }}>
            <li>DMS Coexistence (No replacement threat)</li>
            <li>17-Point Pre-Flight Schema Verification</li>
            <li>Mandatory 6-Slot Automotive Shot Grid</li>
            <li>Zero Conquest Ads on Consumer VDPs</li>
            <li>4-Tier Evidence Hierarchy ([Observed] to [Estimated])</li>
            <li>Statistical Confidence Gating (N ≥ 5 Threshold)</li>
          </ul>
        </div>

        {/* Column 4: DMS Integration */}
        <div>
          <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '14px' }}>
            Supported DMS Platforms
          </h4>
          <p style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '0.8125rem', lineHeight: 1.6, marginBottom: '12px' }}>
            StarterGrid ingests standard inventory exports without requiring modifications to your in-store accounting:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            <span style={{ padding: '3px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>CDK Global</span>
            <span style={{ padding: '3px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>Reynolds & Reynolds</span>
            <span style={{ padding: '3px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>Dealertrack</span>
            <span style={{ padding: '3px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>Frazer</span>
            <span style={{ padding: '3px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>DealerCenter</span>
            <span style={{ padding: '3px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>Tekion</span>
            <span style={{ padding: '3px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>AutoManager</span>
            <span style={{ padding: '3px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>vAuto / HomeNet</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
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
          color: 'rgba(255, 255, 255, 0.4)',
        }}
      >
        <div>
          © {new Date().getFullYear()} StarterGrid Inc. All rights reserved. The Automotive Channel Intelligence Platform.
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <span>Privacy & Security</span>
          <span>Terms of Deployment</span>
          <span>ADF 1.0 Specification</span>
        </div>
      </div>
    </footer>
  );
};
