import React, { useState } from 'react';

export const DmsArchitectureSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'coexistence' | 'architecture'>('coexistence');

  return (
    <section
      id="dms-architecture"
      style={{
        padding: '96px 24px',
        background: '#071321',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '780px', marginBottom: '48px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#60a5fa',
              marginBottom: '10px',
            }}
          >
            ARCHITECTURE & COEXISTENCE
          </div>
          <h2
            style={{
              fontSize: 'clamp(1.8rem, 3.2vw, 2.75rem)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: '16px',
            }}
          >
            Keep Your DMS. We Are Your Digital Distribution & Attribution Layer.
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.68)', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            Legacy Dealership Management Systems (CDK, Reynolds & Reynolds, Dealertrack, Frazer, DealerCenter) are essential for floorplanning, accounting, and deal jackets—but were never designed for modern multi-channel advertising, catalog APIs, or real-time sales attribution. StarterGrid bridges that operational gap.
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          <button
            onClick={() => setActiveTab('coexistence')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: activeTab === 'coexistence' ? '#2563eb' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'coexistence' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
              border: '1px solid ' + (activeTab === 'coexistence' ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'),
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            DMS vs. StarterGrid Responsibility Matrix
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: activeTab === 'architecture' ? '#2563eb' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'architecture' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
              border: '1px solid ' + (activeTab === 'architecture' ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'),
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Data Ingestion & Closed-Loop Attribution Flow
          </button>
        </div>

        {activeTab === 'coexistence' ? (
          /* Responsibility Matrix Table */
          <div
            style={{
              background: '#0d1e33',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              overflowX: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: 'rgba(7, 19, 33, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', width: '28%' }}>
                    Operational Domain
                  </th>
                  <th style={{ padding: '16px 20px', color: '#93c5fd', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', width: '36%' }}>
                    Dealership DMS (CDK / Reynolds / Frazer)
                  </th>
                  <th style={{ padding: '16px 20px', color: '#34d399', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', width: '36%' }}>
                    StarterGrid Distribution Platform
                  </th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem', color: '#fff' }}>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}>System of Record</td>
                  <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.75)' }}>
                    Authoritative for Floorplanning, In-Store Deals, Titling, and Accounting
                  </td>
                  <td style={{ padding: '16px 20px', color: '#34d399', background: 'rgba(16, 185, 129, 0.04)' }}>
                    Authoritative for Public Advertising Copy, Syndication Feeds, and Media
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}>Validation Before Send</td>
                  <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.75)' }}>
                    Minimal field checking; feeds fail silently after export
                  </td>
                  <td style={{ padding: '16px 20px', color: '#34d399', background: 'rgba(16, 185, 129, 0.04)' }}>
                    <strong>17-point pre-flight schema inspection</strong> across 31 destination rules
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}>Multi-Channel Publishing</td>
                  <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.75)' }}>
                    Slow overnight batch exports; separate vendor setup required
                  </td>
                  <td style={{ padding: '16px 20px', color: '#34d399', background: 'rgba(16, 185, 129, 0.04)' }}>
                    Continuous catalog API syncs (&lt;15m latency) across Search &amp; Social
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}>Consumer Marketplace</td>
                  <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.75)' }}>
                    None (Relies entirely on third-party commercial classifieds)
                  </td>
                  <td style={{ padding: '16px 20px', color: '#34d399', background: 'rgba(16, 185, 129, 0.04)' }}>
                    <strong>First-party Auto Marketplace</strong> with zero lag and zero conquest ads
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}>Lead Ingress & Routing</td>
                  <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.75)' }}>
                    Receives leads into CRM if formatted correctly
                  </td>
                  <td style={{ padding: '16px 20px', color: '#34d399', background: 'rgba(16, 185, 129, 0.04)' }}>
                    ADF/XML dispatch with mail-server acceptance tracking & webhooks
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '16px 20px', fontWeight: 600 }}>Channel ROI & Attribution</td>
                  <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.75)' }}>
                    Gross profit on vehicle sale, but zero marketing channel linkage
                  </td>
                  <td style={{ padding: '16px 20px', color: '#34d399', background: 'rgba(16, 185, 129, 0.04)' }}>
                    <strong>Deterministic lead-to-VIN attribution</strong> yielding true CPL & CPS
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          /* Architecture Blueprint Diagram */
          <div
            style={{
              background: '#0d1e33',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '36px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '24px',
                position: 'relative',
              }}
            >
              {/* Step 1: Ingestion */}
              <div
                style={{
                  background: 'rgba(7, 19, 33, 0.8)',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', marginBottom: '8px' }}>
                  STEP 1: INGESTION
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                  DMS Inventory Feed Intake
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5 }}>
                  Continuous intake from CDK, Reynolds, Dealertrack, Frazer, or DealerCenter via CSV, XML, or API. Normalizes stock numbers, VINs, and lot arrivals.
                </p>
                <div style={{ marginTop: '14px', fontSize: '0.6875rem', fontFamily: 'monospace', color: '#93c5fd' }}>
                  → Preserves stock number identity
                </div>
              </div>

              {/* Step 2: Pre-Flight */}
              <div
                style={{
                  background: 'rgba(7, 19, 33, 0.8)',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  boxShadow: '0 0 20px rgba(37, 99, 235, 0.1)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                  STEP 2: PRE-FLIGHT
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                  17-Point Schema Sentry
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5 }}>
                  Decodes 17-char VINs, enforces the 6-slot media taxonomy (Front 3/4, Odometer, Cockpit), checks title disclosures, and audits rules for 31 destinations.
                </p>
                <div style={{ marginTop: '14px', fontSize: '0.6875rem', fontFamily: 'monospace', color: '#34d399' }}>
                  ✓ Catches errors before export
                </div>
              </div>

              {/* Step 3: Distribution */}
              <div
                style={{
                  background: 'rgba(7, 19, 33, 0.8)',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>
                  STEP 3: DISTRIBUTION
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                  31-Channel Syndication
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5 }}>
                  Syncs with Google Vehicle Ads, Meta AIA, TikTok, eBay, CarGurus, AutoTrader, and the StarterGrid first-party consumer marketplace.
                </p>
                <div style={{ marginTop: '14px', fontSize: '0.6875rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                  → Sub-15m API catalog refresh
                </div>
              </div>

              {/* Step 4: Closed Loop */}
              <div
                style={{
                  background: 'rgba(7, 19, 33, 0.8)',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>
                  STEP 4: ATTRIBUTION
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                  Deterministic Sale Match
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5 }}>
                  When marked sold in your DMS, StarterGrid resolves the sold VIN to originating platform leads—reporting true Cost Per Sale (CPS) and turn days.
                </p>
                <div style={{ marginTop: '14px', fontSize: '0.6875rem', fontFamily: 'monospace', color: '#c084fc' }}>
                  ★ 4-tier audited evidence badge
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
