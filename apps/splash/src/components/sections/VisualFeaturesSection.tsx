import React, { useState } from 'react';

interface VisualFeaturesSectionProps {
  onOpenPricing?: () => void;
  onContactUs?: () => void;
}

export const VisualFeaturesSection: React.FC<VisualFeaturesSectionProps> = ({ onOpenPricing, onContactUs }) => {
  const [activeTab, setActiveTab] = useState<'syndication' | 'delist' | 'inbox' | 'marketplace' | 'attribution' | 'dms'>('syndication');

  return (
    <section
      id="features-visual"
      style={{
        padding: '100px 32px 120px',
        background: '#070b12',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '920px', marginBottom: '56px' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: '#3b82f6',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            VISUAL TOOL OVERVIEW
          </div>
          <h2
            style={{
              fontSize: 'clamp(2.4rem, 4.5vw, 4.25rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              marginBottom: '20px',
            }}
          >
            See how DealerGrid works on your lot.
          </h2>
          <p
            style={{
              fontSize: 'clamp(1.0625rem, 1.6vw, 1.375rem)',
              lineHeight: 1.6,
              color: '#94a3b8',
              margin: 0,
            }}
          >
            A graphical look at our core capabilities—built specifically to eliminate manual double-entry, protect your advertising budget, and accelerate vehicle turnover.
          </p>
        </div>

        {/* Feature Tab Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '12px',
            marginBottom: '40px',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { id: 'syndication', label: '1. Multi-Channel Syndication', icon: '📡' },
            { id: 'delist', label: '2. Auto-Delist on Sale', icon: '⚡' },
            { id: 'marketplace', label: '3. 0% Fee Marketplace', icon: '🏷️' },
            { id: 'inbox', label: '4. Unified Lead Inbox', icon: '💬' },
            { id: 'attribution', label: '5. Channel Sales Analytics', icon: '📊' },
            { id: 'dms', label: '6. DMS & VIN Decoding', icon: '🔄' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '10px',
                  background: isActive ? '#2563eb' : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  border: isActive ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 4px 16px rgba(37, 99, 235, 0.35)' : 'none',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Feature Display Stage */}
        <div
          style={{
            background: 'linear-gradient(180deg, #0d1322 0%, #080c14 100%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
            minHeight: '480px',
          }}
        >
          {/* TAB 1: SYNDICATION */}
          {activeTab === 'syndication' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(37, 99, 235, 0.3)', color: '#60a5fa', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '20px' }}>
                  <span>FEATURE 01</span>
                  <span>•</span>
                  <span>70+ SITES IN ONE CLICK</span>
                </div>
                <h3 style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.25rem)', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginBottom: '16px' }}>
                  Post Once. Broadcast to Every Major Sales Channel.
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6, marginBottom: '24px' }}>
                  Stop having your staff re-type descriptions, re-upload photos, and set pricing on five different portal websites. DealerGrid formats and pushes your vehicles automatically across 70+ automotive destinations.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    'Automated image formatting and watermark alignment per channel rules',
                    'Custom price rules (e.g. MSRP on marketplace, special promo price on Facebook)',
                    'Automatic daily feed regeneration and status validation',
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9375rem', color: '#cbd5e1' }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphic Mockup: Central Car Radiating to Channels */}
              <div style={{ background: '#090d16', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '36px', borderRadius: '6px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                      🚗
                    </div>
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.9375rem' }}>2024 Porsche 911 GT3</div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>VIN: WP0AF2A97RS... • $199,000</div>
                    </div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}>
                    72 CHANNELS LIVE
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  {[
                    { name: 'Facebook Marketplace', status: 'Active', leads: '14 Inquiries', color: '#3b82f6' },
                    { name: 'CarGurus', status: 'Great Deal', leads: '28 Inquiries', color: '#10b981' },
                    { name: 'Autotrader', status: 'Live', leads: '31 Inquiries', color: '#f59e0b' },
                    { name: 'Cars.com', status: 'Live', leads: '19 Inquiries', color: '#8b5cf6' },
                    { name: 'Google Vehicle Ads', status: 'Synced', leads: '42 Clicks', color: '#ec4899' },
                    { name: 'DealerGrid Market', status: 'Free Showcase', leads: '0% Commission', color: '#06b6d4' },
                  ].map((ch, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f1f5f9' }}>{ch.name}</span>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ch.color }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>● {ch.status}</span>
                        <span style={{ color: '#94a3b8' }}>{ch.leads}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUTO DELIST */}
          {activeTab === 'delist' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '20px' }}>
                  <span>FEATURE 02</span>
                  <span>•</span>
                  <span>AUTOMATED SOLD PROTECTION</span>
                </div>
                <h3 style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.25rem)', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginBottom: '16px' }}>
                  When It Sells on the Lot, It Vanishes Everywhere Else.
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6, marginBottom: '24px' }}>
                  Never get an angry call about a car you sold yesterday. As soon as your finance manager marks the vehicle pending or sold in your DMS, DealerGrid sends withdrawal webhooks to all 72 sites in under two seconds.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    'Eliminate wasted pay-per-click ad dollars on unavailable inventory',
                    'Prevent customer frustration and negative Google reviews',
                    'Automatic audit trail of exactly when each channel took the listing down',
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9375rem', color: '#cbd5e1' }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphic Mockup: 3-Step Delist Timeline */}
              <div style={{ background: '#090d16', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '28px' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
                  Real-Time Delist Sequence
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '1.5rem' }}>📝</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.9375rem' }}>1. Vehicle Marked "SOLD" in DMS</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Contract finalized in CDK Global • 10:42:15 AM</div>
                    </div>
                    <span style={{ color: '#60a5fa', fontSize: '0.75rem', fontFamily: 'monospace' }}>0.0s</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ color: '#475569', fontSize: '1.25rem' }}>↓</span>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '1.5rem' }}>⚡</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.9375rem' }}>2. DealerGrid Intercepts Webhook</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Broadcasts removal payload to 72 syndication APIs</div>
                    </div>
                    <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontFamily: 'monospace' }}>+0.6s</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ color: '#475569', fontSize: '1.25rem' }}>↓</span>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.9375rem' }}>3. Delisted Across All 72 Sites</div>
                      <div style={{ color: '#34d399', fontSize: '0.75rem' }}>Facebook, CarGurus, Autotrader, Google updated</div>
                    </div>
                    <span style={{ color: '#10b981', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>+1.4s Total</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MARKETPLACE */}
          {activeTab === 'marketplace' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '20px' }}>
                  <span>FEATURE 03</span>
                  <span>•</span>
                  <span>FREE BUYER SHOWROOM</span>
                </div>
                <h3 style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.25rem)', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginBottom: '16px' }}>
                  Your Own Dealership Showcase. Zero Listing Fees.
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6, marginBottom: '24px' }}>
                  Unlike legacy portals that slap rival dealer ads on top of your own inventory, the DealerGrid Marketplace is clean and commission-free. Buyers browse your vehicles and connect straight to your sales floor.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    'Zero listing fees and zero commission cuts on closed deals',
                    'Direct buyer telephone, email, and live chat inquiries',
                    'Clean vehicle showroom pages with no conquest ads from competitors',
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9375rem', color: '#cbd5e1' }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphic Mockup: Dealership Showcase Card */}
              <div style={{ background: '#090d16', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '24px' }}>
                <div style={{ borderRadius: '12px', background: '#131b2e', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.125rem' }}>Apex Automotive Group</span>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#2563eb', color: '#ffffff', fontSize: '0.6875rem', fontWeight: 700 }}>
                      VERIFIED DEALER
                    </span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8125rem', marginBottom: '16px' }}>
                    Austin, TX • 148 Vehicles In Stock • ★★★★★ 4.9 (128 reviews)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', background: 'rgba(0, 0, 0, 0.25)', padding: '12px', borderRadius: '8px' }}>
                    <div>
                      <div style={{ color: '#10b981', fontWeight: 800, fontSize: '1.125rem' }}>$0</div>
                      <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>Listing Fees</div>
                    </div>
                    <div>
                      <div style={{ color: '#10b981', fontWeight: 800, fontSize: '1.125rem' }}>0%</div>
                      <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>Commission</div>
                    </div>
                    <div>
                      <div style={{ color: '#60a5fa', fontWeight: 800, fontSize: '1.125rem' }}>100%</div>
                      <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>Direct Leads</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                    Direct Buyer Chat
                  </button>
                  <button style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.06)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.12)', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                    Call Showroom
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INBOX */}
          {activeTab === 'inbox' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '20px' }}>
                  <span>FEATURE 04</span>
                  <span>•</span>
                  <span>UNIFIED COMMUNICATION</span>
                </div>
                <h3 style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.25rem)', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginBottom: '16px' }}>
                  All Inquiries from Every Channel in One Clean Inbox.
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6, marginBottom: '24px' }}>
                  Whether a customer messages you through Facebook Messenger, emails from CarGurus, or calls via the Marketplace, every conversation streams into one simple dashboard—or routes straight to your CRM.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    'Instant push notifications to your sales reps via mobile and email',
                    'Bi-directional sync with Elead, VinSolutions, and DriveCentric',
                    'Pre-built 1-click replies for window stickers, trade appraisals, and test drives',
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9375rem', color: '#cbd5e1' }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphic Mockup: Unified Lead Stream */}
              <div style={{ background: '#090d16', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.875rem' }}>Live Lead Queue (8 New Today)</span>
                  <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>● Instant Delivery</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#60a5fa', fontSize: '0.75rem', fontWeight: 700 }}>🔵 Facebook Marketplace</span>
                      <span style={{ color: '#64748b', fontSize: '0.6875rem' }}>2 min ago</span>
                    </div>
                    <div style={{ color: '#f1f5f9', fontSize: '0.8125rem', fontWeight: 600 }}>Michael S. • 2024 Ford F-150 Lightning</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>"Is this available for a test drive this afternoon? Have trade-in."</div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}>🟢 CarGurus Lead</span>
                      <span style={{ color: '#64748b', fontSize: '0.6875rem' }}>14 min ago</span>
                    </div>
                    <div style={{ color: '#f1f5f9', fontSize: '0.8125rem', fontWeight: 600 }}>Sarah K. • 2023 BMW M4 Competition</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>"Can you send out-the-door price sheet including dealer fees?"</div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 700 }}>🌐 DealerGrid Marketplace</span>
                      <span style={{ color: '#64748b', fontSize: '0.6875rem' }}>38 min ago</span>
                    </div>
                    <div style={{ color: '#f1f5f9', fontSize: '0.8125rem', fontWeight: 600 }}>David R. • 2024 Porsche 911 GT3</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>"Cash buyer looking to finalize deposit today."</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ATTRIBUTION */}
          {activeTab === 'attribution' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '20px' }}>
                  <span>FEATURE 05</span>
                  <span>•</span>
                  <span>TRUE SALES ATTRIBUTION</span>
                </div>
                <h3 style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.25rem)', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginBottom: '16px' }}>
                  Know Exactly Which Channels Sell Cars—and How Fast.
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6, marginBottom: '24px' }}>
                  Stop guessing whether your $5,000 monthly portal subscription is generating real buyers. DealerGrid compares days to sell, inquiry-to-close rates, and true advertising costs across every channel.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    'Compare sales velocity: see which sites move inventory 2x faster',
                    'Accurate cost per sold unit without fuzzy attribution formulas',
                    'Identify underperforming channels to trim unnecessary subscription spend',
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9375rem', color: '#cbd5e1' }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphic Mockup: Channel Comparison Table */}
              <div style={{ background: '#090d16', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.875rem' }}>Channel Performance & Turn Velocity</span>
                  <span style={{ color: '#38bdf8', fontSize: '0.75rem' }}>Past 30 Days</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { channel: 'Facebook Marketplace', days: '12 Days', close: '18% Close', cost: '$85 / car', highlight: true },
                    { channel: 'DealerGrid Market', days: '10 Days', close: '22% Close', cost: '$0 Fee', highlight: true },
                    { channel: 'CarGurus', days: '19 Days', close: '11% Close', cost: '$410 / car', highlight: false },
                    { channel: 'Autotrader', days: '22 Days', close: '9% Close', cost: '$520 / car', highlight: false },
                  ].map((row, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: row.highlight ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: row.highlight ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                        fontSize: '0.8125rem',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ color: '#ffffff', fontWeight: 700 }}>{row.channel}</span>
                      <span style={{ color: '#38bdf8' }}>{row.days}</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>{row.close}</span>
                      <span style={{ color: '#94a3b8' }}>{row.cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DMS & VIN */}
          {activeTab === 'dms' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '20px' }}>
                  <span>FEATURE 06</span>
                  <span>•</span>
                  <span>PLUG-AND-PLAY INTEGRATION</span>
                </div>
                <h3 style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.25rem)', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginBottom: '16px' }}>
                  Connects with Your Existing DMS. No Complex IT Overhauls.
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6, marginBottom: '24px' }}>
                  DealerGrid syncs seamlessly with CDK, Reynolds & Reynolds, Dealertrack, Frazer, and custom FTP feeds. Just type or paste any 17-character VIN, and all packages, options, and factory specs decode instantly.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    'Instant 17-digit VIN decode with factory options and window stickers',
                    'Automated high-res photo sequencing and thumbnail generation',
                    'Zero duplicate data entry—updates flow continuously from your DMS',
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9375rem', color: '#cbd5e1' }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphic Mockup: Supported DMS Systems */}
              <div style={{ background: '#090d16', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '24px' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                  Supported Dealership DMS & Inventory Feeds
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { name: 'CDK Global', status: 'Bi-Directional Certified' },
                    { name: 'Reynolds & Reynolds', status: 'Certified Ingress' },
                    { name: 'Dealertrack', status: 'Live Daily Sync' },
                    { name: 'Frazer & Wayne Reaves', status: 'Instant Ingestion' },
                    { name: 'DealerSocket / Solera', status: 'Direct Integration' },
                    { name: 'Custom CSV / FTP', status: 'Auto-Detect Schema' },
                  ].map((dms, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.875rem' }}>{dms.name}</div>
                      <div style={{ color: '#10b981', fontSize: '0.6875rem', marginTop: '2px' }}>✓ {dms.status}</div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#93c5fd', fontSize: '0.8125rem', fontWeight: 600 }}>VIN Decoder Coverage</span>
                  <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.875rem' }}>99.8% US & Canadian Makes</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA Strip */}
        <div
          style={{
            marginTop: '40px',
            padding: '24px 32px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.0625rem', marginBottom: '4px' }}>
              Ready to see DealerGrid with your own inventory?
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              Sign up today in under 2 minutes with an email and credit card, or reach out to our team.
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
              }}
            >
              View Pricing & Sign Up Now →
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
              }}
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
