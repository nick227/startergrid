import React from 'react';

export const AdvertisingSection: React.FC = () => {
  return (
    <section
      id="vp-03"
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
              color: '#38bdf8',
              textTransform: 'uppercase',
              marginBottom: '20px',
            }}
          >
            PAID ADVERTISING / MEASURED CONVERSION
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
            Advertise your vehicles across social media, Google, Facebook, Instagram, and more.
          </h2>

          <p
            style={{
              fontSize: 'clamp(1.2rem, 1.9vw, 1.6rem)',
              lineHeight: 1.55,
              color: '#94a3b8',
              margin: 0,
            }}
          >
            See which advertising platforms generate actual buyers.
          </p>
        </div>

        {/* Distinct Visual Layout: Platform Badges & Campaign Performance Screen */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '40px',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Platform Ecosystem & Strategic Approach */}
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
              Dynamic catalogs built to platform specifications.
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6, marginBottom: '28px' }}>
              Instead of manually building individual ads, DealerGrid generates and updates live inventory feeds tailored to each advertising network’s strict schema requirements. When prices drop or vehicles sell, ads update automatically.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '32px' }}>
              {[
                { name: 'Google Vehicle Ads', tag: 'Search Intent Ads', desc: 'Appears at top of Google Search with photo, price, and distance.' },
                { name: 'Meta Automotive Ads', tag: 'Facebook & Instagram', desc: 'Dynamic multi-vehicle carousels retargeting local in-market shoppers.' },
                { name: 'Microsoft Auto Ads', tag: 'Bing Search Network', desc: 'Desktop and mobile vehicle inventory ads reaching mature car buyers.' },
                { name: 'TikTok Automotive', tag: 'Short-Form Video', desc: 'Dynamic video catalog units engaging younger vehicle shoppers.' },
              ].map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                    {p.tag}
                  </div>
                  <strong style={{ color: '#ffffff', fontSize: '0.9375rem', display: 'block', marginBottom: '6px' }}>
                    {p.name}
                  </strong>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    {p.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Campaign Measurement Screen Preview */}
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
                  Advertising Campaign Performance
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Sample dealer reporting view • Q3 Period
                </span>
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.12)', padding: '4px 10px', borderRadius: '4px', fontWeight: 600 }}>
                Sample Data
              </span>
            </div>

            {/* Metrics summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ad Spend</span>
                <strong style={{ fontSize: '1.25rem', color: '#ffffff' }}>$1,620</strong>
              </div>
              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Inquiries</span>
                <strong style={{ fontSize: '1.25rem', color: '#38bdf8' }}>104 Leads</strong>
              </div>
              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Attributed Sales</span>
                <strong style={{ fontSize: '1.25rem', color: '#34d399' }}>14 Units</strong>
              </div>
            </div>

            {/* Performance breakdown rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)' }}>
                <div>
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>Google Vehicle Ads</span>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>62 Leads • 8 Confirmed Sales</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#38bdf8', fontWeight: 700 }}>$15.81 CPL</div>
                  <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>$122.50 / sale</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)' }}>
                <div>
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>Meta Automotive Ads</span>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>42 Leads • 6 Confirmed Sales</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#60a5fa', fontWeight: 700 }}>$15.24 CPL</div>
                  <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>$106.67 / sale</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.6875rem', color: '#64748b', lineHeight: 1.5 }}>
              * Performance metrics shown are illustrative sample figures demonstrating channel spend vs. buyer inquiries.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
