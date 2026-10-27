import React, { useState } from 'react';
import { CAPABILITIES_AREAS, type CapabilityArea } from '../../data/capabilitiesMatrix.ts';

export const CapabilitiesDirectory: React.FC = () => {
  const [selectedAreaId, setSelectedAreaId] = useState<string>('inventory-management');

  const selectedArea = CAPABILITIES_AREAS.find((a) => a.id === selectedAreaId) || CAPABILITIES_AREAS[0];

  return (
    <section
      id="capabilities"
      style={{
        padding: '96px 24px',
        background: '#06090f',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '820px', marginBottom: '40px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: '#3b82f6',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            SOFTWARE CAPABILITY INVENTORY
          </div>
          <h2
            style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 2.75rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: '16px',
            }}
          >
            Complete Dealership Software Capabilities
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            A structured inventory of operational features across inventory intake, channel distribution, CRM lead routing, performance reporting, and multi-user access. Each area links directly to our verified operator documentation.
          </p>
        </div>

        {/* 5 Area Tab Switcher */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '32px',
          }}
        >
          {CAPABILITIES_AREAS.map((area: CapabilityArea) => {
            const isSelected = area.id === selectedAreaId;
            return (
              <button
                key={area.id}
                onClick={() => setSelectedAreaId(area.id)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: isSelected ? '#2563eb' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  border: '1px solid ' + (isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'),
                  transition: 'all 0.15s ease',
                }}
              >
                {area.title}
              </button>
            );
          })}
        </div>

        {/* Active Area Card */}
        <div
          style={{
            background: '#0d131f',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '36px',
          }}
        >
          <div style={{ marginBottom: '28px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '20px' }}>
            <h3 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              {selectedArea.title}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9375rem', margin: 0 }}>
              {selectedArea.summary}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {selectedArea.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                    {item.name}
                  </h4>
                  <p style={{ fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '16px' }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px', fontSize: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>Documentation: </span>
                  <span style={{ color: '#60a5fa', fontWeight: 500 }}>
                    {item.docTitle}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
