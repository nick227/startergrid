import React, { useState } from 'react';
import { FEATURE_INVENTORY, type FeaturePillar } from '../../data/featureInventory.ts';

export const FeatureInventorySection: React.FC = () => {
  const [selectedPillarId, setSelectedPillarId] = useState<string>('inventory-core');

  const selectedPillar = FEATURE_INVENTORY.find((p) => p.id === selectedPillarId) || FEATURE_INVENTORY[0];

  return (
    <section
      id="features"
      style={{
        padding: '96px 24px',
        background: '#040c17',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '780px', marginBottom: '40px' }}>
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
            SOFTWARE CAPABILITY INVENTORY
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
            Comprehensive Feature Inventory
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.68)', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            A transparent inventory of the five foundational software pillars powering StarterGrid across intake, pre-flight validation, marketplace distribution, CRM routing, and attribution.
          </p>
        </div>

        {/* 5 Pillar Navigation Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
            marginBottom: '32px',
          }}
        >
          {FEATURE_INVENTORY.map((pillar: FeaturePillar) => {
            const isSelected = pillar.id === selectedPillarId;
            return (
              <button
                key={pillar.id}
                onClick={() => setSelectedPillarId(pillar.id)}
                style={{
                  padding: '16px 20px',
                  borderRadius: '10px',
                  background: isSelected ? '#0d1e33' : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid ' + (isSelected ? '#2563eb' : 'rgba(255, 255, 255, 0.08)'),
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color: isSelected ? '#60a5fa' : 'rgba(255, 255, 255, 0.4)',
                    }}
                  >
                    PILLAR {pillar.pillarNumber}
                  </span>
                  <span style={{ fontSize: '1rem' }}>{pillar.icon}</span>
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.75)' }}>
                  {pillar.title.split('&')[0].trim()}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Pillar Detailed Capability Cards */}
        <div
          style={{
            background: '#0d1e33',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '36px',
          }}
        >
          <div style={{ marginBottom: '28px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.5rem' }}>{selectedPillar.icon}</span>
              <h3 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#fff' }}>
                Pillar {selectedPillar.pillarNumber}: {selectedPillar.title}
              </h3>
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.9375rem', margin: 0 }}>
              {selectedPillar.subtitle}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {selectedPillar.capabilities.map((cap, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(7, 19, 33, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>
                      {cap.name}
                    </h4>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        background: 'rgba(37, 99, 235, 0.15)',
                        color: '#60a5fa',
                        border: '1px solid rgba(37, 99, 235, 0.3)',
                      }}
                    >
                      {cap.evidenceOrStatus}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, margin: 0 }}>
                    {cap.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
