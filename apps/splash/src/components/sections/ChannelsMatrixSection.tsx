import React, { useState, useMemo } from 'react';
import { CHANNELS_DATA, type ChannelPlatform } from '../../data/channelsData.ts';

export const ChannelsMatrixSection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredChannels = useMemo(() => {
    return CHANNELS_DATA.filter((ch) => {
      const matchesCategory = selectedCategory === 'all' || ch.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.deliveryMethod.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <section
      id="channels"
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
              color: '#38bdf8',
              marginBottom: '10px',
            }}
          >
            SYNDICATION NETWORK
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
            31 Supported Automotive Distribution Channels
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.68)', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            Every channel has unique schema rules, image aspect ratio constraints, and refresh intervals. StarterGrid compiles and verifies compliant payloads for every destination without manual feed editing.
          </p>
        </div>

        {/* Filter Bar & Search */}
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
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[
              { id: 'all', label: 'All Channels (31)' },
              { id: 'owned', label: 'Owned (2)' },
              { id: 'search', label: 'Search & Local (5)' },
              { id: 'social', label: 'Social Dynamic (8)' },
              { id: 'portal', label: 'Auto Marketplaces (7)' },
              { id: 'specialty', label: 'Specialty (7)' },
              { id: 'crm', label: 'CRM Routing (2)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid ' + (selectedCategory === tab.id ? '#2563eb' : 'rgba(255, 255, 255, 0.1)'),
                  background: selectedCategory === tab.id ? '#2563eb' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedCategory === tab.id ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Instant Search */}
          <div style={{ minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Search channels or delivery types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '6px',
                background: '#0d1e33',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Channel Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredChannels.map((ch: ChannelPlatform) => (
            <div
              key={ch.id}
              style={{
                background: '#0d1e33',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.2s ease, transform 0.2s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: ch.category === 'owned' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                      color: ch.category === 'owned' ? '#34d399' : '#60a5fa',
                      border: '1px solid ' + (ch.category === 'owned' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(37, 99, 235, 0.3)'),
                    }}
                  >
                    {ch.categoryLabel}
                  </span>

                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontFamily: 'monospace',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}
                  >
                    Latency: {ch.syncLatency}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                  {ch.name}
                </h3>

                <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, marginBottom: '16px' }}>
                  {ch.description}
                </p>
              </div>

              <div>
                {/* Delivery Method */}
                <div
                  style={{
                    background: 'rgba(7, 19, 33, 0.6)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#93c5fd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>METHOD:</span>
                  <span>{ch.deliveryMethod}</span>
                </div>

                {/* Pre-Flight Validation Gates */}
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
                    Pre-Flight Validation Rules:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ch.validationGates.map((gate, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '0.6875rem',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        ✓ {gate}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
