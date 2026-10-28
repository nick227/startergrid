import React from 'react';

interface EditorialHeroProps {
  onRequestAccess: () => void;
}

export const EditorialHero: React.FC<EditorialHeroProps> = ({ onRequestAccess }) => {
  return (
    <section
      style={{
        padding: '80px 24px 88px',
        background: '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Eyebrow & Headline */}
        <div style={{ maxWidth: '820px', marginBottom: '32px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: '#3b82f6',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            STARTERGRID / DEALERSHIP SOFTWARE
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              marginBottom: '20px',
            }}
          >
            One platform for online automotive sales.
          </h1>

          <p
            style={{
              fontSize: '1.25rem',
              lineHeight: 1.55,
              color: '#cbd5e1',
              marginBottom: '28px',
              maxWidth: '720px',
            }}
          >
            Manage your vehicles, connect online sales channels, publish inventory, receive inquiries, and measure results.
          </p>

          {/* Two Core Pillars */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '16px 20px',
              }}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                Dealership platform
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                Inventory, channels, leads and operations
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '16px 20px',
              }}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                Auto marketplace
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                Publish vehicles for shoppers to discover
              </div>
            </div>
          </div>

          {/* Differentiator Statement */}
          <div
            style={{
              fontSize: '0.9375rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              marginBottom: '32px',
              borderLeft: '2px solid #3b82f6',
              paddingLeft: '14px',
            }}
          >
            Use StarterGrid with your existing dealership management system, or manage inventory directly.
          </div>

          {/* Action Row: Distinct Dealership & Shopper Pathways */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={onRequestAccess}
                style={{
                  padding: '13px 24px',
                  borderRadius: '6px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Contact Us
              </button>

              <a
                href="/app/"
                style={{
                  padding: '13px 20px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Explore Operator Portal</span>
                <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>[Live Demo]</span>
              </a>

              <a
                href="/marketplace/"
                style={{
                  padding: '13px 20px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  textDecoration: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span>Browse Marketplace Vehicles ↗</span>
              </a>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <span>• For Dealerships: Manage lot inventory, connect sales channels, and receive buyer inquiries</span>
              <span>• For Shoppers: Discover verified vehicles nationwide with zero competitor ads</span>
            </div>
          </div>
        </div>

        {/* Real Product UI Composition (apps/web) */}
        <div
          style={{
            background: '#0d131f',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Mock App Shell Header */}
          <div
            style={{
              background: '#0a0e17',
              padding: '12px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8125rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              </div>
              <strong style={{ color: '#fff', letterSpacing: '-0.01em' }}>Austin Auto Group</strong>
              <span style={{ color: '#64748b' }}>/</span>
              <span style={{ color: '#94a3b8' }}>Inventory & Distribution Hub</span>
            </div>

            <div style={{ display: 'flex', gap: '16px', color: '#94a3b8', fontSize: '0.75rem' }}>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>Vehicles (148)</span>
              <span>Channels (8)</span>
              <span>Leads (42)</span>
              <span>Reports</span>
              <span>Settings</span>
            </div>
          </div>

          {/* Split Workspace Viewport */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1px',
              background: 'rgba(255, 255, 255, 0.06)',
            }}
          >
            {/* Left: Inventory List */}
            <div style={{ background: '#0d131f', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
                  Lot Inventory (Vehicles)
                </span>
                <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontWeight: 600 }}>
                  148 Units Active
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.8125rem' }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600 }}>2022 Ford F-150 Lariat</div>
                    <div style={{ color: '#64748b', fontSize: '0.6875rem', fontFamily: 'monospace' }}>STK-22084 • 1FTFW1ED4NFA10928</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#10b981', fontWeight: 700 }}>$46,990</div>
                    <span style={{ fontSize: '0.625rem', padding: '2px 6px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>Ready to send</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.8125rem' }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600 }}>2023 Toyota RAV4 XLE</div>
                    <div style={{ color: '#64748b', fontSize: '0.6875rem', fontFamily: 'monospace' }}>STK-23119 • 2T3P1RFV5PW219842</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#10b981', fontWeight: 700 }}>$29,850</div>
                    <span style={{ fontSize: '0.625rem', padding: '2px 6px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>Ready to send</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.8125rem' }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600 }}>2021 BMW 330i xDrive</div>
                    <div style={{ color: '#64748b', fontSize: '0.6875rem', fontFamily: 'monospace' }}>STK-21045 • WBA5R7C56MFA83910</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#10b981', fontWeight: 700 }}>$31,500</div>
                    <span style={{ fontSize: '0.625rem', padding: '2px 6px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontWeight: 600 }}>Needs details</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Channels & Leads */}
            <div style={{ background: '#0d131f', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Top: Channels Overview */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
                    Connected Destinations
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 600 }}>
                    Autopilot: Active
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.75rem' }}>
                  <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>Auto Marketplace</div>
                    <div style={{ color: '#34d399', fontSize: '0.6875rem' }}>148 verified live</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>Google Vehicle Ads</div>
                    <div style={{ color: '#38bdf8', fontSize: '0.6875rem' }}>136 compliant</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>Meta Automotive Ads</div>
                    <div style={{ color: '#38bdf8', fontSize: '0.6875rem' }}>142 in catalog</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>eBay Motors</div>
                    <div style={{ color: '#fbbf24', fontSize: '0.6875rem' }}>1 item paused</div>
                  </div>
                </div>
              </div>

              {/* Bottom: Inquiries Inbox */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
                    Recent Buyer Inquiries & CRM Routing
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                    ADF/XML Handshake: OK
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div>
                      <span style={{ color: '#fff', fontWeight: 600 }}>Marcus Vance</span>
                      <span style={{ color: '#64748b', marginLeft: '6px' }}>— STK-22084 Ford F-150</span>
                    </div>
                    <span style={{ color: '#34d399', fontSize: '0.6875rem', fontWeight: 600 }}>✓ CRM Received</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div>
                      <span style={{ color: '#fff', fontWeight: 600 }}>Sarah Jenkins</span>
                      <span style={{ color: '#64748b', marginLeft: '6px' }}>— STK-23119 RAV4 XLE</span>
                    </div>
                    <span style={{ color: '#34d399', fontSize: '0.6875rem', fontWeight: 600 }}>✓ CRM Received</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
