import React from 'react';

export const InventoryHubSection: React.FC = () => {
  return (
    <section
      id="vp-08"
      style={{
        padding: '140px 32px',
        background: '#06090f',
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
              color: '#34d399',
              textTransform: 'uppercase',
              marginBottom: '20px',
            }}
          >
            INVENTORY MANAGEMENT / ROOFTOP LOT CONTROL
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
            Manage your entire vehicle inventory from one dashboard.
          </h2>

          <p
            style={{
              fontSize: 'clamp(1.2rem, 1.9vw, 1.6rem)',
              lineHeight: 1.55,
              color: '#94a3b8',
              margin: 0,
            }}
          >
            Import vehicles, update prices, organize photos, edit listings in bulk, and track availability.
          </p>
        </div>

        {/* Dominant Lot Control Showcase */}
        <div
          style={{
            background: '#0d131f',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.65)',
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              background: '#090d16',
              padding: '16px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <strong style={{ color: '#ffffff', fontSize: '0.9375rem' }}>Lot Inventory Hub</strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>148 Active Units on Lot</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem' }}>
              <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontWeight: 600 }}>
                Filter: All Body Styles
              </span>
              <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.04)', color: '#94a3b8' }}>
                Sort: Days on Lot (High to Low)
              </span>
            </div>
          </div>

          {/* Roster Table */}
          <div style={{ padding: '28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                {
                  stk: 'STK-22084',
                  vin: '1FTFW1ED4NFA10928',
                  title: '2022 Ford F-150 Lariat 4x4 Crew Cab',
                  price: '$46,990',
                  photos: '22 photos',
                  days: '14d on lot',
                  status: 'Active on 5 Channels',
                  statusColor: '#34d399',
                  channels: ['Marketplace', 'Google Ads', 'Meta', 'CarGurus', 'AutoTrader'],
                },
                {
                  stk: 'STK-23119',
                  vin: '2T3P1RFV5PW219842',
                  title: '2023 Toyota RAV4 XLE AWD',
                  price: '$29,850',
                  photos: '18 photos',
                  days: '9d on lot',
                  status: 'Active on 5 Channels',
                  statusColor: '#34d399',
                  channels: ['Marketplace', 'Google Ads', 'Meta', 'CarGurus', 'AutoTrader'],
                },
                {
                  stk: 'STK-21045',
                  vin: 'WBA5R7C56MFA83910',
                  title: '2021 BMW 330i xDrive Sedan',
                  price: '$31,500',
                  photos: '24 photos',
                  days: '28d on lot',
                  status: 'Active on 4 Channels',
                  statusColor: '#38bdf8',
                  channels: ['Marketplace', 'Google Ads', 'Meta', 'CarGurus'],
                },
                {
                  stk: 'STK-20188',
                  vin: '1GKS1GKD4LR198231',
                  title: '2020 GMC Yukon SLT 4WD',
                  price: '$38,200',
                  photos: '16 photos',
                  days: '42d on lot',
                  status: 'Price Review Suggested',
                  statusColor: '#fbbf24',
                  channels: ['Marketplace', 'Google Ads', 'Meta'],
                },
              ].map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
                      <strong style={{ color: '#ffffff', fontSize: '1rem' }}>{row.title}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{row.stk}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: '#94a3b8' }}>
                      <span>VIN: {row.vin}</span>
                      <span>•</span>
                      <span>{row.photos}</span>
                      <span>•</span>
                      <span style={{ color: '#38bdf8' }}>{row.days}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginBottom: '2px' }}>
                      {row.price}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: row.statusColor, fontWeight: 600 }}>
                      ● {row.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#64748b',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span>Demonstration lot manager showing real-time stock status, photo counts, and multi-channel synchronization.</span>
              <span style={{ color: '#38bdf8' }}>Manage stock, update pricing, and unlist sold units in one click</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
