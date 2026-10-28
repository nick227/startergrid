import React from 'react';

export const AutomationSection: React.FC = () => {
  return (
    <section
      id="vp-04"
      style={{
        padding: '140px 32px',
        background: '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        position: 'relative',
        scrollMarginTop: '72px',
      }}
    >
      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        {/* Top Text Block */}
        <div style={{ maxWidth: '980px', marginBottom: '64px' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: '#a78bfa',
              textTransform: 'uppercase',
              marginBottom: '20px',
            }}
          >
            AUTOMATION & MONITORING / ZERO SYNDICATION WASTE
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
            Set up automatic posting and real-time monitoring across sales and social media platforms.
          </h2>

          <p
            style={{
              fontSize: 'clamp(1.2rem, 1.9vw, 1.6rem)',
              lineHeight: 1.55,
              color: '#94a3b8',
              margin: 0,
            }}
          >
            Schedule inventory updates, monitor listing activity, and identify issues from one dashboard.
          </p>
        </div>

        {/* Product Demonstration Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '40px',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Focused Capability Narrative */}
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
              Automatic lot sync without silent feed failures.
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6, marginBottom: '24px' }}>
              Dealerships frequently lose sales because listing feeds fail quietly—missing photos, omitted trim specs, or unverified VINs cause portals to drop vehicles without notice. DealerGrid validates listings before transmission and halts advertising the second a unit sells.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9375rem', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ color: '#38bdf8', fontWeight: 700, marginTop: '2px' }}>✓</span>
                <span><strong>Scheduled Autopilot Updates:</strong> Set automated daily or hourly catalog syncs to match your lot’s inventory intake schedule.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ color: '#38bdf8', fontWeight: 700, marginTop: '2px' }}>✓</span>
                <span><strong>Pre-Flight Quality Checks:</strong> Inspects VIN check digits, photo aspect ratios, and mandatory destination fields prior to submission.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ color: '#38bdf8', fontWeight: 700, marginTop: '2px' }}>✓</span>
                <span><strong>Instant Sold Unlisting:</strong> Marking a car sold on your lot halts active campaigns across all channels to prevent wasted ad spend.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Autopilot Activity Monitor Preview */}
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <strong style={{ color: '#ffffff', fontSize: '0.9375rem', display: 'block' }}>
                  Autopilot Monitor & Status Log
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Functional software demonstration
                </span>
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '4px 10px', borderRadius: '4px', fontWeight: 600 }}>
                Autopilot: Scheduled
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>Daily Inventory Sync Schedule</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>Daily 06:00 AM CST</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  Ingests vehicle records from DMS, recalculates photo readiness, and updates destination payloads.
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>Pre-Flight Sentry Verification</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>Checks Active</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  Validates EPA mileage, VIN format, 6-photo minimums, and pricing before pushing to advertising channels.
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>Sold Vehicle Protection</span>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>Immediate Withdrawal</span>
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>
                  Vehicles marked sold in your inventory are withdrawn from all ad platforms immediately to eliminate wasted spend.
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.6875rem', color: '#64748b' }}>
              * Illustrative monitor showing automated feed scheduling and quality verification workflows.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
