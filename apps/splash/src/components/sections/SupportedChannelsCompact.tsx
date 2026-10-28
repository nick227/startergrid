import React, { useState } from 'react';

interface ChannelBadge {
  name: string;
  category: string;
  type: string;
  note: string;
}

const PRIMARY_CHANNELS: { category: string; description: string; items: ChannelBadge[] }[] = [
  {
    category: 'Search & Social Advertising',
    description: 'Dynamic inventory ads reaching in-market automotive buyers on search and social feeds.',
    items: [
      { name: 'Google Vehicle Ads', category: 'Search', type: 'Merchant Center Feed', note: 'EPA specs and clean VIN schema' },
      { name: 'Meta Automotive Ads', category: 'Social', type: 'Catalog API / Feed', note: 'Facebook & Instagram dynamic ads' },
      { name: 'Microsoft Auto Ads', category: 'Search', type: 'Bing Auto Feed', note: 'Bing desktop and mobile vehicle listings' },
      { name: 'TikTok Automotive Ads', category: 'Social', type: 'Product Catalog', note: 'Short-form dynamic inventory video ads' },
    ],
  },
  {
    category: 'Auto Marketplaces',
    description: 'Syndicate your stock across established third-party vehicle classifieds and consumer sites.',
    items: [
      { name: 'StarterGrid Marketplace', category: 'Owned', type: 'Real-time Instant', note: 'Zero competitor conquest ads on your VDPs' },
      { name: 'CarGurus', category: 'Marketplace', type: 'Automated Batch Feed', note: 'Deal rating compliance and price specs' },
      { name: 'AutoTrader / KBB', category: 'Marketplace', type: 'Dealer-Assisted Feed', note: 'Cox Automotive dealer inventory export' },
      { name: 'Cars.com', category: 'Marketplace', type: 'Automated Batch Feed', note: 'Certified dealer network distribution' },
      { name: 'eBay Motors', category: 'Marketplace', type: 'Automated Catalog', note: 'Vehicles and collector classification' },
      { name: 'TrueCar Network', category: 'Marketplace', type: 'Direct Ingestion Bridge', note: 'Affinity partner and upfront pricing network' },
    ],
  },
  {
    category: 'Dealership CRM Routing',
    description: 'Deliver buyer inquiries straight into your existing dealership sales CRM via email.',
    items: [
      { name: 'ADF 1.0 XML Routing', category: 'CRM', type: 'Direct SMTP / Email', note: 'Standard Auto-lead Data Format delivery' },
      { name: 'Elead / CDK CRM', category: 'CRM', type: 'Standard Ingestion', note: 'Routes to sales reps and showroom desk' },
      { name: 'VinSolutions CRM', category: 'CRM', type: 'Standard Ingestion', note: 'Cox Automotive dealership CRM format' },
      { name: 'DriveCentric / Reynolds', category: 'CRM', type: 'Standard Ingestion', note: 'Dealership sales pipeline and inbox' },
    ],
  },
];

const ALL_31_CHANNELS = [
  'Google Vehicle Ads', 'Meta Automotive Inventory Ads', 'StarterGrid Consumer Marketplace',
  'CarGurus', 'AutoTrader / Kelley Blue Book', 'Cars.com', 'eBay Motors', 'TrueCar Dealer Network',
  'CARFAX for Dealers', 'Facebook Marketplace', 'Microsoft Advertising Auto Ads',
  'Google Business Profile', 'Apple Business Connect', 'Nextdoor Automotive Ads',
  'TikTok Automotive Ads', 'TikTok Shop', 'Pinterest Automotive Shopping', 'Reddit Dynamic Ads',
  'Snapchat Dynamic Ads', 'X Dynamic Automotive Ads', 'LinkedIn Lead Gen Forms',
  'RV Trader', 'Cycle Trader', 'ATV Trader', 'Trailer Trader', 'Boat Trader',
  'YachtWorld', 'Boats.com', 'Dealer Storefront XML Feed', 'ADF 1.0 XML CRM Dispatch',
  'TrueCar Direct CRM Bridge'
];

export const SupportedChannelsCompact: React.FC = () => {
  const [showAll, setShowAll] = useState(false);

  return (
    <section
      id="channels"
      style={{
        padding: '80px 24px',
        background: '#06090f',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '780px', marginBottom: '40px' }}>
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
            INTEGRATIONS & CHANNELS
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
            Connect With Where Buyers Actually Shop
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            Publish compliant listings to search ads, social feeds, and major vehicle marketplaces from a single lot export, with buyer inquiries delivered straight to your CRM.
          </p>
        </div>

        {/* 3 Channel Categories Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '24px',
            marginBottom: '32px',
          }}
        >
          {PRIMARY_CHANNELS.map((group, idx) => (
            <div
              key={idx}
              style={{
                background: '#0d131f',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                  {group.category}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '20px' }}>
                  {group.description}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {group.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {item.note}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          color: '#38bdf8',
                          background: 'rgba(56, 189, 248, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          fontWeight: 500,
                        }}
                      >
                        {item.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Collapsible 31 Channels Drawer */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong style={{ color: '#ffffff', fontSize: '0.875rem' }}>31 Supported Advertising & Distribution Channels</strong>
              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                Including auto marketplaces, search ads, social catalogs, CRM lead routing, and specialty markets.
              </div>
            </div>
            <button
              onClick={() => setShowAll(!showAll)}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#60a5fa',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {showAll ? 'Hide Full Channel List ↑' : 'View All 31 Channels ↓'}
            </button>
          </div>

          {showAll && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '8px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {ALL_31_CHANNELS.map((ch, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: '0.75rem',
                    color: '#cbd5e1',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ color: '#10b981', fontSize: '0.625rem' }}>●</span>
                  <span>{ch}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
