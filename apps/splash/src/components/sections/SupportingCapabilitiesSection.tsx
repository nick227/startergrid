import React from 'react';

export const SupportingCapabilitiesSection: React.FC = () => {
  return (
    <section
      id="capabilities-editorial"
      style={{
        padding: '140px 32px',
        background: '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '980px', marginBottom: '88px' }}>
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
            SUPPORTING DEALERSHIP CAPABILITIES
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
            Engineered to fit your dealership operations.
          </h2>

          <p
            style={{
              fontSize: 'clamp(1.2rem, 1.9vw, 1.6rem)',
              lineHeight: 1.55,
              color: '#94a3b8',
              margin: 0,
            }}
          >
            From your accounting DMS to your sales desk CRM, DealerGrid works alongside the systems and people that run your dealership every day.
          </p>
        </div>

        {/* 5 Distinct Editorial Blocks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
          {/* 05: DMS Central Connection */}
          <div
            id="vp-05"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '48px',
              alignItems: 'center',
              scrollMarginTop: '80px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                05 • DMS Integration
              </span>
              <h3 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.25rem)', fontWeight: 800, color: '#ffffff', marginTop: '8px', marginBottom: '16px' }}>
                Connect your existing dealership software to one central inventory system.
              </h3>
              <p style={{ fontSize: '1.0625rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '20px' }}>
                Work alongside CDK, Reynolds & Reynolds, Dealertrack, Tekion, and other DMS platforms to keep vehicle inventory organized and consistent.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', color: '#94a3b8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Your DMS remains the authority for in-store accounting, deals, and floorplanning</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Supports CDK Global, Reynolds & Reynolds, Dealertrack, Frazer, DealerCenter, Tekion, and CSV</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Automatic normalization maps trims and options into consistent standards</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#0d131f',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '28px',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                Coexistence Workflow
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8125rem' }}>
                <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <strong style={{ color: '#ffffff', display: 'block' }}>1. Your Dealership DMS</strong>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>CDK • Reynolds • Dealertrack • Tekion • Frazer (System of Record)</span>
                </div>
                <div style={{ textAlign: 'center', color: '#38bdf8', fontSize: '0.875rem' }}>↓ Automated Ingestion ↓</div>
                <div style={{ padding: '12px 16px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                  <strong style={{ color: '#38bdf8', display: 'block' }}>2. DealerGrid Central Hub</strong>
                  <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>Normalized VINs, specs, photo validation, pricing sync</span>
                </div>
                <div style={{ textAlign: 'center', color: '#38bdf8', fontSize: '0.875rem' }}>↓ Outbound Distribution ↓</div>
                <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <strong style={{ color: '#34d399', display: 'block' }}>3. 70+ Sales Channels & Marketplaces</strong>
                  <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>Google, Meta, CarGurus, AutoTrader, DealerGrid Marketplace</span>
                </div>
              </div>
            </div>
          </div>

          {/* 06: Automotive Specialists */}
          <div
            id="vp-06"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '48px',
              alignItems: 'center',
              scrollMarginTop: '80px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                06 • Expert Support
              </span>
              <h3 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.25rem)', fontWeight: 800, color: '#ffffff', marginTop: '8px', marginBottom: '16px' }}>
                Work with our team of real experts in online auto sales.
              </h3>
              <p style={{ fontSize: '1.0625rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '20px' }}>
                Get personal assistance with listing vehicles, managing advertising, and improving sales performance across platforms.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', color: '#94a3b8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Assisted inventory onboarding and feed format verification tailored to your store</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Hands-on setup for Google Merchant Center and Meta Automotive catalogs</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Practical guidance on fixing rejected listings and optimizing photo grids</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#0d131f',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '28px',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                Dealership Onboarding Support
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8125rem', color: '#cbd5e1' }}>
                <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                  <strong style={{ color: '#ffffff' }}>1. Inventory & DMS Review</strong>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2px' }}>
                    We verify your dealership inventory export format, photo delivery paths, and pricing fields.
                  </div>
                </div>
                <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                  <strong style={{ color: '#ffffff' }}>2. Channel Configuration</strong>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2px' }}>
                    We assist in configuring your advertising accounts, merchant feeds, and marketplace presence.
                  </div>
                </div>
                <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                  <strong style={{ color: '#ffffff' }}>3. CRM Lead Verification</strong>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2px' }}>
                    We verify standard ADF/XML delivery to ensure leads route accurately to your sales reps.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 07: Unified Buyer Inquiries */}
          <div
            id="vp-07"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '48px',
              alignItems: 'center',
              scrollMarginTop: '80px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                07 • Buyer Inquiries & CRM
              </span>
              <h3 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.25rem)', fontWeight: 800, color: '#ffffff', marginTop: '8px', marginBottom: '16px' }}>
                Manage buyer inquiries from every connected source.
              </h3>
              <p style={{ fontSize: '1.0625rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '20px' }}>
                Organize leads, assign salespeople, track follow-ups, and forward inquiries to your existing CRM.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', color: '#94a3b8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Standard ADF 1.0 XML email delivery to any dealership CRM (Elead, VinSolutions, CDK, Reynolds)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Unified inbox organizes leads from the marketplace, search ads, and third-party portals</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Assign leads to specific sales representatives or BDC staff with status tracking</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#0d131f',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <strong style={{ color: '#ffffff', fontSize: '0.875rem' }}>Unified Inquiries Stream</strong>
                <span style={{ fontSize: '0.6875rem', color: '#34d399', fontWeight: 600 }}>ADF/XML Dispatch Active</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                {[
                  { name: 'Marcus Vance', vehicle: '2022 Ford F-150 Lariat', source: 'DealerGrid Marketplace', rep: 'Jake M. (Sales)', status: 'CRM Received' },
                  { name: 'Sarah Jenkins', vehicle: '2023 Toyota RAV4 XLE', source: 'Google Vehicle Ads', rep: 'Dana T. (BDC)', status: 'CRM Received' },
                  { name: 'Carlos Mendez', vehicle: '2021 BMW 330i xDrive', source: 'CarGurus Feed', rep: 'Jake M. (Sales)', status: 'Contacted' },
                ].map((l, idx) => (
                  <div key={idx} style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#ffffff' }}>{l.name}</strong>
                      <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>{l.vehicle} • Source: {l.source}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>{l.status}</span>
                      <div style={{ color: '#64748b', fontSize: '0.625rem' }}>Assigned: {l.rep}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 09: Dealership Team Collaboration */}
          <div
            id="vp-09"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '48px',
              alignItems: 'center',
              scrollMarginTop: '80px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                09 • Team Collaboration
              </span>
              <h3 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.25rem)', fontWeight: 800, color: '#ffffff', marginTop: '8px', marginBottom: '16px' }}>
                Keep your dealership team working together.
              </h3>
              <p style={{ fontSize: '1.0625rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '20px' }}>
                Manage staff access, assign responsibilities, and coordinate inventory, advertising, and customer inquiries.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', color: '#94a3b8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Role-based permissions for General Managers, Inventory Directors, Sales Reps, and BDC Staff</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Audit logs record who made price changes, modified listing descriptions, or updated feeds</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Shared inventory notes keep sales staff informed on customer test drives and showroom holds</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#0d131f',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
                Role-Based Permissions Matrix
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                {[
                  { role: 'General Manager', perms: 'Full store oversight, pricing approval, audit trail', scope: 'All Rooftops' },
                  { role: 'Inventory Director', perms: 'Photo manager, DMS sync settings, channel distribution', scope: 'Lot Inventory' },
                  { role: 'Sales Representatives', perms: 'Assigned customer leads, vehicle notes, showroom holds', scope: 'Sales Pipeline' },
                  { role: 'BDC Coordinator', perms: 'Inquiry dispatch, CRM handoff, response time tracking', scope: 'Lead Inbox' },
                ].map((r, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#ffffff' }}>{r.role}</strong>
                      <div style={{ color: '#94a3b8', fontSize: '0.6875rem' }}>{r.perms}</div>
                    </div>
                    <span style={{ color: '#38bdf8', fontSize: '0.6875rem', fontWeight: 600 }}>{r.scope}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 10: Regional Market Demand */}
          <div
            id="vp-10"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '48px',
              alignItems: 'center',
              scrollMarginTop: '80px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                10 • Market & Inventory Intelligence
              </span>
              <h3 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.25rem)', fontWeight: 800, color: '#ffffff', marginTop: '8px', marginBottom: '16px' }}>
                Find out which vehicles are in demand in your market.
              </h3>
              <p style={{ fontSize: '1.0625rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '20px' }}>
                Compare vehicle types, prices, and sales trends using available market and inventory data.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', color: '#94a3b8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Track lot aging across practical brackets: 0–15d, 16–30d, 31–60d, and 60d+</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Identify slow-moving inventory before floorplan interest and holding costs accumulate</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Minimum sample thresholds (N ≥ 5 units) prevent misleading conclusions from small datasets</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#0d131f',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <strong style={{ color: '#ffffff', fontSize: '0.875rem' }}>Days on Lot & Turn Analysis</strong>
                <span style={{ fontSize: '0.6875rem', color: '#38bdf8' }}>Sample Gated (N ≥ 5)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                {[
                  { segment: 'Compact & Midsize SUVs', units: '54 units', avgDays: '13 days on lot', signal: 'Steady Turn', color: '#34d399' },
                  { segment: 'Half-Ton & Crew Pickups', units: '42 units', avgDays: '16 days on lot', signal: 'Steady Turn', color: '#38bdf8' },
                  { segment: 'Full-Size Sedans', units: '28 units', avgDays: '34 days on lot', signal: 'Review Pricing', color: '#fbbf24' },
                  { segment: 'Luxury & Specialty Sport', units: '14 units', avgDays: '41 days on lot', signal: 'Slow Turn / Older Stock', color: '#f87171' },
                ].map((s, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#ffffff' }}>{s.segment}</strong>
                      <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>{s.units} • Avg {s.avgDays}</div>
                    </div>
                    <span style={{ color: s.color, fontWeight: 600 }}>{s.signal}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', fontSize: '0.6875rem', color: '#64748b' }}>
                * Sample turn analysis demonstrating lot aging across body style categories.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
