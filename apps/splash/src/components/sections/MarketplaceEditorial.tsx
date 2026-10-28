import React from 'react';
import { MARKETPLACE_MOCK_CARS, type MarketplaceCar } from '../../data/marketplaceMockCars.ts';
import { getMarketplaceUrl } from '../../lib/navigation.ts';

export const MarketplaceEditorial: React.FC = () => {
  return (
    <section
      id="marketplace"
      style={{
        padding: '96px 24px',
        background: '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '820px', marginBottom: '48px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: '#10b981',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            CONSUMER VEHICLE DISCOVERY
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 3.8vw, 3rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.12,
              marginBottom: '16px',
            }}
          >
            Your inventory on the StarterGrid Marketplace.
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '1.125rem', lineHeight: 1.6, marginBottom: '24px' }}>
            Vehicles published to our marketplace receive public listing pages that shoppers can search, inspect and inquire about. Dealerships can manage those records from StarterGrid.
          </p>
          <a
            href={getMarketplaceUrl()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '6px',
              background: '#2563eb',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            <span>Browse the Public Marketplace</span>
            <span>↗</span>
          </a>
        </div>

        {/* 3 Core Design Principles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '48px',
          }}
        >
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '28px',
            }}
          >
            <div style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>
              Design Choice: No Conquest Advertising
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
              When an interested buyer views your vehicle on the StarterGrid marketplace, they see only your vehicle, your photos, and your dealership contact information. We do not place competitor inventory banners or conquest ads on your vehicle detail pages.
            </p>
          </div>

          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '28px',
            }}
          >
            <div style={{ color: '#38bdf8', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>
              Direct Buyer Inquiries to Your CRM
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
              Buyer inquiries, availability checks, and showroom visit requests transmit directly into your dealership inbox and existing CRM using industry-standard ADF/XML formatting, with no middleman lead broker fees.
            </p>
          </div>

          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '28px',
            }}
          >
            <div style={{ color: '#a78bfa', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>
              Managed from Your Dealership Workspace
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
              Manage publication status, asking prices, and photo galleries directly from the StarterGrid inventory workspace. When a unit is marked sold on your lot, its marketplace listing is removed promptly.
            </p>
          </div>
        </div>

        {/* Real Marketplace Visual Presentation */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
              Marketplace Listing Presentation (apps/marketplace)
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Real Dealership Stock Layout
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '24px',
            }}
          >
            {MARKETPLACE_MOCK_CARS.slice(0, 3).map((car: MarketplaceCar) => (
              <div
                key={car.id}
                style={{
                  background: '#0d131f',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ height: '220px', background: '#090d16', position: 'relative' }}>
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
                      background: 'rgba(9, 13, 22, 0.9)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    {car.badge}
                  </div>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff' }}>
                        {car.year} {car.make} {car.model}
                      </h4>
                      <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff' }}>
                        ${car.price.toLocaleString()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '14px' }}>
                      {car.trim}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '16px' }}>
                      <div>Mileage: <strong>{car.mileage.toLocaleString()} mi</strong></div>
                      <div>Powertrain: <strong>{car.mpg}</strong></div>
                      <div>Dealership: <strong style={{ color: '#60a5fa' }}>{car.dealershipName}</strong></div>
                      <div>Location: <strong>{car.location}</strong></div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px', display: 'flex', gap: '8px' }}>
                    <a
                      href={getMarketplaceUrl()}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      View on Marketplace ↗
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
