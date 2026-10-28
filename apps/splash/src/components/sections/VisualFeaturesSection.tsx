import React, { useState, useId } from 'react';

interface VisualFeaturesSectionProps {
  onOpenPricing?: () => void;
  onContactUs?: () => void;
}

interface PlatformOption {
  id: string;
  name: string;
}

const PLATFORMS: PlatformOption[] = [
  { id: 'facebook', name: 'Facebook Marketplace' },
  { id: 'cargurus', name: 'CarGurus' },
  { id: 'autotrader', name: 'Autotrader' },
  { id: 'carscom', name: 'Cars.com' },
  { id: 'google', name: 'Google Vehicle Ads' },
  { id: 'dealergrid', name: 'DealerGrid Market (0% Fees)' },
];

export const VisualFeaturesSection: React.FC<VisualFeaturesSectionProps> = ({ onOpenPricing, onContactUs }) => {
  const [carCount, setCarCount] = useState<number>(75);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'facebook',
    'cargurus',
    'autotrader',
    'carscom',
    'google',
    'dealergrid',
  ]);
  const sliderId = useId();

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(id)) {
        // Keep at least one platform selected
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== id);
      }
      return [...prev, id];
    });
  };

  // Simple, realistic estimates without buzzwords
  const platformCount = selectedPlatforms.length;
  
  // Turn rate estimate: baseline 32% + ~4.5% per active sales channel
  const turnRate = Math.min(0.75, 0.30 + platformCount * 0.045);
  const estimatedMonthlySales = Math.round(carCount * turnRate);

  // Time spent estimate:
  // Manual listing typically takes ~15 mins per car across multiple portals (~3-4 hours per 20 cars)
  const manualHoursPerWeek = Math.round(3 + (carCount * 0.16) * (platformCount / 3.5));
  const dealerGridHoursPerWeek = Math.max(1, Math.round(carCount * 0.015));
  const hoursSavedPerWeek = Math.max(2, manualHoursPerWeek - dealerGridHoursPerWeek);

  return (
    <section
      id="features-visual"
      style={{
        padding: '88px 32px 104px',
        background: '#070b12',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
      }}
    >
      <style>{`
        .car-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
          transition: transform 0.15s ease;
        }
        .car-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
      `}</style>

      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        {/* Straightforward Title: Expert Online Auto Sales */}
        <div style={{ maxWidth: '1200px', marginBottom: '44px' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: '#3b82f6',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}
          >
            EXPERT ONLINE AUTO SALES
          </div>

          <h2
            style={{
              fontSize: 'clamp(2.2rem, 4vw, 3.75rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginBottom: '16px',
            }}
          >
            Sell more cars online in less time.
          </h2>

          <p
            style={{
              fontSize: 'clamp(1.05rem, 1.4vw, 1.25rem)',
              lineHeight: 1.6,
              color: '#94a3b8',
              margin: 0,
              maxWidth: '820px',
            }}
          >
            Select your lot size and where you want to list. We calculate how many cars you can sell each month and how many hours you save with automated listing.
          </p>
        </div>

        {/* Clean Interactive Calculator Card */}
        <div
          style={{
            background: 'linear-gradient(180deg, #0e1526 0%, #0a0f1d 100%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: '36px',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.5)',
            marginBottom: '40px',
          }}
        >
          {/* Controls: Slider + Platform Multiselect */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '36px',
              paddingBottom: '32px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '32px',
            }}
          >
            {/* Left: Number of Cars Slider */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label
                  htmlFor={sliderId}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: '#e2e8f0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Cars on Your Lot
                </label>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '1.875rem', fontWeight: 900, color: '#38bdf8' }}>
                    {carCount}
                  </span>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 600 }}>vehicles</span>
                </div>
              </div>

              <input
                id={sliderId}
                type="range"
                min="10"
                max="300"
                step="5"
                value={carCount}
                onChange={(e) => setCarCount(parseInt(e.target.value, 10))}
                className="car-slider"
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, #2563eb 0%, #38bdf8 ${((carCount - 10) / (300 - 10)) * 100}%, rgba(255, 255, 255, 0.1) ${((carCount - 10) / (300 - 10)) * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                  marginBottom: '14px',
                }}
              />

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[25, 75, 150, 250].map((preset) => {
                  const isSelected = carCount === preset;
                  return (
                    <button
                      key={preset}
                      onClick={() => setCarCount(preset)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                        border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: isSelected ? '#ffffff' : '#94a3b8',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {preset} cars
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Platform Multiselect */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Platforms to List On
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#34d399' }}>
                  {platformCount} selected
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {PLATFORMS.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: isSelected ? '#ffffff' : '#64748b',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ color: isSelected ? '#60a5fa' : '#64748b' }}>
                        {isSelected ? '✓' : '+'}
                      </span>
                      <span>{platform.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Simple Estimates: Sales, Time, and Fees */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Metric 1: Monthly Sales */}
            <div
              style={{
                padding: '24px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Estimated Monthly Sales
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '2.25rem', fontWeight: 900, color: '#ffffff' }}>
                  ~{estimatedMonthlySales}
                </span>
                <span style={{ fontSize: '0.9375rem', color: '#94a3b8' }}>cars / month</span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.4 }}>
                Based on active reach across {platformCount} online channels.
              </div>
            </div>

            {/* Metric 2: Time Spent Estimate */}
            <div
              style={{
                padding: '24px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Time Spent Managing Listings
                </span>
                <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}>
                  Save {hoursSavedPerWeek} hrs/wk
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '2.25rem', fontWeight: 900, color: '#34d399' }}>
                  ~{dealerGridHoursPerWeek} hr
                </span>
                <span style={{ fontSize: '0.9375rem', color: '#64748b', textDecoration: 'line-through' }}>
                  {manualHoursPerWeek} hrs/wk
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.4 }}>
                Post once from your DMS instead of re-typing specs into separate websites.
              </div>
            </div>

            {/* Metric 3: Marketplace Listing Fee */}
            <div
              style={{
                padding: '24px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                DealerGrid Marketplace Fee
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '2.25rem', fontWeight: 900, color: '#38bdf8' }}>
                  $0
                </span>
                <span style={{ fontSize: '0.9375rem', color: '#94a3b8' }}>listing & sales fees</span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.4 }}>
                0% commissions and no middleman broker charges on buyer inquiries.
              </div>
            </div>
          </div>
        </div>

        {/* Straightforward Side-by-Side Comparison: Legacy Portals vs DealerGrid */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Legacy Portals vs. DealerGrid
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9375rem', margin: 0 }}>
              The clear operational differences between traditional third-party classifieds and DealerGrid.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Left: Legacy Portals */}
            <div
              style={{
                padding: '28px',
                borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.04)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span style={{ color: '#f87171', fontWeight: 800, fontSize: '1.0625rem' }}>
                  Legacy Portals
                </span>
                <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', fontSize: '0.6875rem', fontWeight: 700 }}>
                  THE OLD WAY
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { title: '$3,000 to $6,000+ monthly subscriptions', desc: 'Steep monthly tiers that go up whenever your inventory grows.' },
                  { title: 'Competitors advertised on your listings', desc: 'Portals take money from rival dealers to put their cars on your vehicle pages.' },
                  { title: '15+ hours spent on manual posting', desc: 'Staff forced to log into 5+ portals to re-upload photos and copy descriptions.' },
                  { title: 'Delayed delisting after a sale', desc: 'Sold cars stay online for hours or days, causing frustrated buyer calls and wasted ads.' },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '0.9375rem', marginTop: '2px' }}>✕</span>
                    <div>
                      <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: '0.875rem' }}>{item.title}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: DealerGrid */}
            <div
              style={{
                padding: '28px',
                borderRadius: '16px',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span style={{ color: '#34d399', fontWeight: 800, fontSize: '1.0625rem' }}>
                  DealerGrid
                </span>
                <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#10b981', color: '#ffffff', fontSize: '0.6875rem', fontWeight: 700 }}>
                  EXPERT AUTO SALES
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { title: '0% fees on the DealerGrid Marketplace', desc: 'Your own dealership showcase with direct buyer inquiries and zero sales commissions.' },
                  { title: 'Zero competitor ads on your vehicles', desc: 'Your vehicle pages belong to you. We never let rival dealers buy ad banners on your cars.' },
                  { title: 'Post to every platform in 1 click', desc: 'Photos, pricing, and specs sync automatically from your DMS to Facebook, Google, and portals.' },
                  { title: 'Automatic removal the moment a car sells', desc: 'Listings are taken down immediately when marked sold in your DMS to save ad dollars.' },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: '#10b981', fontWeight: 900, fontSize: '0.9375rem', marginTop: '2px' }}>✓</span>
                    <div>
                      <div style={{ color: '#a7f3d0', fontWeight: 700, fontSize: '0.875rem' }}>{item.title}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Clean Bottom Action Strip */}
        <div
          style={{
            padding: '24px 32px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.0625rem', marginBottom: '4px' }}>
              Ready to simplify your online vehicle sales?
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              Get started with our transparent pricing or talk with our automotive sales team.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={onOpenPricing}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.9375rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2563eb';
              }}
            >
              View Pricing & Plans →
            </button>
            <button
              onClick={onContactUs}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '0.9375rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              }}
            >
              Talk to an Expert
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
