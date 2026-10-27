import React, { useState, useMemo } from 'react';
import { PROVIDERS_DIRECTORY, PROVIDER_PURPOSES, REGISTRY_PROVENANCE, type ProviderItem, type ProviderPurpose } from '../../data/platformsDirectory.ts';

export const ProvidersDirectory: React.FC = () => {
  const [selectedPurpose, setSelectedPurpose] = useState<ProviderPurpose | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProviders = useMemo(() => {
    return PROVIDERS_DIRECTORY.filter((p) => {
      const matchesPurpose = selectedPurpose === 'ALL' || p.purpose === selectedPurpose;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        p.connectionMethod.toLowerCase().includes(q) ||
        p.publishingMode.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchesPurpose && matchesSearch;
    });
  }, [selectedPurpose, searchQuery]);

  return (
    <section
      id="channels"
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
            INTEGRATIONS & CHANNELS DIRECTORY
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
            Supported Sales Channels & Advertising Providers
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6, marginBottom: '20px' }}>
            Dealerships evaluate platforms by asking: <em>Can StarterGrid work with the destinations I already use?</em> This directory explains connection methods, setup ownership, automated vs. assisted publishing, and what activity StarterGrid actually observes for each platform.
          </p>

          {/* Registry Provenance Callout */}
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px',
              padding: '14px 18px',
              fontSize: '0.8125rem',
              lineHeight: 1.55,
              color: '#cbd5e1',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#60a5fa' }}>
                Registry Provenance ({REGISTRY_PROVENANCE.activeAutomotiveProfiles} Automotive / {REGISTRY_PROVENANCE.totalConfiguredProfiles} Total Channels)
              </span>
            </div>
            <div>
              {REGISTRY_PROVENANCE.note}
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {/* Purpose Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={() => setSelectedPurpose('ALL')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: selectedPurpose === 'ALL' ? '#2563eb' : 'rgba(255, 255, 255, 0.04)',
                color: selectedPurpose === 'ALL' ? '#ffffff' : '#94a3b8',
                border: '1px solid ' + (selectedPurpose === 'ALL' ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'),
              }}
            >
              All Providers ({PROVIDERS_DIRECTORY.length})
            </button>
            {PROVIDER_PURPOSES.map((pur) => {
              const count = PROVIDERS_DIRECTORY.filter((p) => p.purpose === pur.id).length;
              const isSelected = selectedPurpose === pur.id;
              return (
                <button
                  key={pur.id}
                  onClick={() => setSelectedPurpose(pur.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: isSelected ? '#2563eb' : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#ffffff' : '#94a3b8',
                    border: '1px solid ' + (isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'),
                  }}
                >
                  {pur.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '260px' }}>
            <input
              type="text"
              placeholder="Search by provider name or method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '6px',
                background: '#0d131f',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Providers Table / Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredProviders.map((provider: ProviderItem) => (
            <div
              key={provider.id}
              style={{
                background: '#0d131f',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* Header Tag */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#60a5fa',
                    }}
                  >
                    {provider.purposeLabel}
                  </span>

                  <span
                    style={{
                      fontSize: '0.6875rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: provider.integrationMaturity === 'Verified Live'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: provider.integrationMaturity === 'Verified Live'
                        ? '#34d399'
                        : '#94a3b8',
                      fontWeight: 600,
                    }}
                  >
                    {provider.integrationMaturity}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
                  {provider.name}
                </h3>

                <p style={{ fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '18px' }}>
                  {provider.description}
                </p>
              </div>

              {/* Technical Mechanics */}
              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Connection:</span>
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>{provider.connectionMethod}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Setup Ownership:</span>
                  <span style={{ color: '#cbd5e1' }}>{provider.setupOwnership}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Publishing Mode:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{provider.publishingMode}</span>
                </div>
                <div style={{ marginTop: '4px', background: 'rgba(255, 255, 255, 0.02)', padding: '8px 10px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Observed Activity:
                  </span>
                  <span style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                    {provider.observedActivity}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
