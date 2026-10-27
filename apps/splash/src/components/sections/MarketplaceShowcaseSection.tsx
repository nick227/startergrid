import React, { useState } from 'react';
import { MARKETPLACE_MOCK_CARS, type MarketplaceCar } from '../../data/marketplaceMockCars.ts';

interface MarketplaceShowcaseSectionProps {
  onOpenIntake: () => void;
}

export const MarketplaceShowcaseSection: React.FC<MarketplaceShowcaseSectionProps> = ({ onOpenIntake }) => {
  const [selectedBodyStyle, setSelectedBodyStyle] = useState<string>('All');

  const filteredCars = selectedBodyStyle === 'All'
    ? MARKETPLACE_MOCK_CARS
    : MARKETPLACE_MOCK_CARS.filter((c) => c.bodyStyle === selectedBodyStyle);

  return (
    <section
      id="marketplace"
      style={{
        padding: '96px 24px',
        background: '#040c17',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '820px', marginBottom: '40px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#34d399',
              marginBottom: '10px',
            }}
          >
            FIRST-PARTY OWNED DISTRIBUTION
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
            The StarterGrid Consumer Auto Marketplace
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.68)', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            In another vendor model, accessing a nationwide consumer vehicle marketplace is an expensive standalone product ($1,500–$3,500/month). With StarterGrid, every connected dealership receives automatic, instant distribution on our first-party marketplace with <strong>zero syndication lag, zero competitor conquest ads, and zero-commission lead intake</strong>.
          </p>
        </div>

        {/* 4 Marketplace Core Value Pillars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            marginBottom: '48px',
          }}
        >
          <div
            style={{
              background: '#0d1e33',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            <div style={{ fontSize: '1.25rem', marginBottom: '8px' }}>⚡</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              Zero-Minute Syndication Lag
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, margin: 0 }}>
              The moment a vehicle passes pre-flight checks in the operator portal, it is indexed and searchable by car shoppers instantly.
            </p>
          </div>

          <div
            style={{
              background: '#0d1e33',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.25)',
            }}
          >
            <div style={{ fontSize: '1.25rem', marginBottom: '8px' }}>🛡️</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              Zero Competitor Conquest Ads
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, margin: 0 }}>
              Third-party classifieds sell competitor inventory ads directly on your VDPs. On StarterGrid, your shoppers see only your vehicles.
            </p>
          </div>

          <div
            style={{
              background: '#0d1e33',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <div style={{ fontSize: '1.25rem', marginBottom: '8px' }}>📬</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              Direct ADF/XML Lead Routing
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, margin: 0 }}>
              Inquiries route straight into your CDK, Reynolds, or DealerSocket CRM with mail-server acceptance tracking and zero broker fees.
            </p>
          </div>

          <div
            style={{
              background: '#0d1e33',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid rgba(168, 85, 247, 0.25)',
            }}
          >
            <div style={{ fontSize: '1.25rem', marginBottom: '8px' }}>🏷️</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              Full VIN Spec Fidelity
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, margin: 0 }}>
              Presents true Monroney option lists, fuel ratings, verified mileage, and high-resolution photo carousels with no compression artifacts.
            </p>
          </div>
        </div>

        {/* Live Marketplace Vehicle Preview Header & Filters */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              Active Marketplace Inventory Preview
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.55)', margin: 0 }}>
              Live inventory feed served by the Fastify marketplace API layer
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['All', 'SUV', 'Truck', 'Sedan', 'Hybrid', 'EV'].map((style) => (
              <button
                key={style}
                onClick={() => setSelectedBodyStyle(style)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid ' + (selectedBodyStyle === style ? '#2563eb' : 'rgba(255, 255, 255, 0.1)'),
                  background: selectedBodyStyle === style ? '#2563eb' : 'rgba(255, 255, 255, 0.04)',
                  color: selectedBodyStyle === style ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                }}
              >
                {style === 'All' ? 'All Inventory' : style + 's'}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          {filteredCars.map((car: MarketplaceCar) => (
            <div
              key={car.id}
              style={{
                background: '#0d1e33',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
              }}
            >
              {/* Image Container */}
              <div style={{ position: 'relative', height: '200px', background: '#071321' }}>
                <img
                  src={car.imageUrl}
                  alt={`${car.year} ${car.make} ${car.model}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(7, 19, 33, 0.85)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#34d399',
                  }}
                >
                  ✓ {car.badge}
                </div>

                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.9)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#071321',
                  }}
                >
                  ZERO CONQUEST ADS
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>
                      {car.year} {car.make} {car.model}
                    </h4>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399', fontFamily: 'monospace' }}>
                      ${car.price.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.55)', marginBottom: '12px' }}>
                    {car.trim}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'monospace', marginBottom: '16px' }}>
                    <div>Mileage: <strong style={{ color: '#fff' }}>{car.mileage.toLocaleString()} mi</strong></div>
                    <div>Powertrain: <strong style={{ color: '#fff' }}>{car.mpg}</strong></div>
                    <div>Dealership: <strong style={{ color: '#93c5fd' }}>{car.dealershipName}</strong></div>
                    <div>Location: <strong style={{ color: '#fff' }}>{car.location}</strong></div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px' }}>
                  <a
                    href="/marketplace/"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    View Vehicle on Marketplace ↗
                  </a>
                  <button
                    onClick={onOpenIntake}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: '#2563eb',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    List My Inventory
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Marketplace CTA Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
              Ready to give your dealership direct nationwide consumer exposure?
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', margin: 0, maxWidth: '640px' }}>
              Full access to the StarterGrid Consumer Marketplace is included as standard infrastructure in every StarterGrid subscription. No per-listing fees, no lead brokerage fees, and no competitor ads.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <a
              href="/marketplace/"
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Search Live Marketplace →
            </a>
            <button
              onClick={onOpenIntake}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                background: '#2563eb',
                border: 'none',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              }}
            >
              Onboard Dealership
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
