import React, { useState } from 'react';
import { getOperatorPortalUrl, getMarketplaceUrl } from '../../lib/navigation.ts';

interface HeroCommandSectionProps {
  onOpenIntake: () => void;
}

export const HeroCommandSection: React.FC<HeroCommandSectionProps> = ({ onOpenIntake }) => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'adf-payload'>('telemetry');

  return (
    <section
      style={{
        position: 'relative',
        padding: '130px 24px 80px',
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(37, 99, 235, 0.22), transparent 70%), #071321',
        overflow: 'hidden',
      }}
    >
      {/* Decorative Grid Lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.8,
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* Telemetry Ticker Strip */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: 'rgba(37, 99, 235, 0.12)',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            marginBottom: '28px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#34d399',
              boxShadow: '0 0 10px #34d399',
            }}
          />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#93c5fd',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}
          >
            StarterGrid Fastify v5 Core • 31 Syndication Channels Online
          </span>
        </div>

        {/* Main 2-Column Hero Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '48px',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Declarative Value Statement */}
          <div>
            <h1
              style={{
                fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                marginBottom: '20px',
              }}
            >
              The Modern Software Layer for{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #60a5fa 0%, #22d3ee 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Online Automotive Sales
              </span>
            </h1>

            <p
              style={{
                fontSize: '1.125rem',
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.72)',
                marginBottom: '32px',
                maxWidth: '560px',
              }}
            >
              StarterGrid connects with your DMS, checks every vehicle before publishing to search, social, and classified channels, and helps you see which channels actually sell cars with <strong>clear evidence badges</strong>.
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '40px' }}>
              <button
                onClick={onOpenIntake}
                style={{
                  padding: '14px 28px',
                  borderRadius: '10px',
                  background: '#2563eb',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(37, 99, 235, 0.45)',
                  transition: 'transform 0.15s ease',
                }}
              >
                Onboard Dealership ($499/mo) →
              </button>

              <a
                href={getOperatorPortalUrl()}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Operator Portal</span>
                <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>[Live Demo]</span>
              </a>

              <a
                href={getMarketplaceUrl()}
                style={{
                  padding: '14px 20px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(96, 165, 250, 0.3)',
                  color: '#93c5fd',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Search Marketplace</span>
                <span>↗</span>
              </a>
            </div>

            {/* 4 Feature Telemetry Badges */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '24px',
              }}
            >
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
                  31 Channels
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                  Catalog APIs, dynamic feeds, and ADF lead routing
                </div>
              </div>

              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
                  17-Point Sentry
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                  Pre-flight checks prevent silent feed rejection
                </div>
              </div>

              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
                  0-Min Delay
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                  Instant consumer marketplace indexing
                </div>
              </div>

              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a78bfa', fontFamily: 'monospace' }}>
                  4-Tier Proof
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                  Verified platform data vs vendor claims
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Command Console */}
          <div>
            <div
              style={{
                background: '#0d1e33',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 30px rgba(37, 99, 235, 0.15)',
                overflow: 'hidden',
              }}
            >
              {/* Window Header */}
              <div
                style={{
                  background: 'rgba(7, 19, 33, 0.95)',
                  padding: '12px 18px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontFamily: 'monospace',
                    }}
                  >
                    apps/web/channels-hub.tsx
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setActiveTab('telemetry')}
                    style={{
                      background: activeTab === 'telemetry' ? '#2563eb' : 'transparent',
                      color: activeTab === 'telemetry' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Syndication Hub
                  </button>
                  <button
                    onClick={() => setActiveTab('adf-payload')}
                    style={{
                      background: activeTab === 'adf-payload' ? '#2563eb' : 'transparent',
                      color: activeTab === 'adf-payload' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ADF/XML Lead Ingress
                  </button>
                </div>
              </div>

              {/* Console Body */}
              <div style={{ padding: '20px' }}>
                {activeTab === 'telemetry' ? (
                  <div>
                    {/* Console Metric Strip */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '8px',
                        marginBottom: '16px',
                        background: 'rgba(7, 19, 33, 0.6)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        fontFamily: 'monospace',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.4)' }}>ACTIVE UNITS</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>148</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.4)' }}>QUEUED SYNC</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#38bdf8' }}>31</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.4)' }}>BUYER LEADS</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#34d399' }}>252</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.4)' }}>AVG TURN</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fbbf24' }}>16.4d</div>
                      </div>
                    </div>

                    {/* Active Syndication Queue Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: '#34d399', fontSize: '0.7rem' }}>●</span>
                          <strong style={{ color: '#fff' }}>Auto Marketplace (Owned)</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.5)' }}>148 published</span>
                          <span style={{ fontSize: '0.6875rem', padding: '2px 6px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>
                            INSTANT
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: '#60a5fa', fontSize: '0.7rem' }}>●</span>
                          <strong style={{ color: '#fff' }}>Google Vehicle Ads</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.5)' }}>Merchant Center API</span>
                          <span style={{ fontSize: '0.6875rem', padding: '2px 6px', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 600 }}>
                            SYNCED 4m ago
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: '#38bdf8', fontSize: '0.7rem' }}>●</span>
                          <strong style={{ color: '#fff' }}>Meta Automotive Inventory Ads</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.5)' }}>Catalog Graph Sync</span>
                          <span style={{ fontSize: '0.6875rem', padding: '2px 6px', borderRadius: '3px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}>
                            SYNCED 11m ago
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: '#f59e0b', fontSize: '0.7rem' }}>●</span>
                          <strong style={{ color: '#fff' }}>eBay Motors Direct Bridge</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.5)' }}>1 item requires trim package</span>
                          <span style={{ fontSize: '0.6875rem', padding: '2px 6px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontWeight: 600 }}>
                            ACTION REQ
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#071321',
                      padding: '14px',
                      borderRadius: '8px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: '0.75rem',
                      lineHeight: 1.5,
                      color: '#93c5fd',
                      overflowX: 'auto',
                    }}
                  >
                    <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>&lt;?xml version="1.0"?&gt;</div>
                    <div style={{ color: '#38bdf8' }}>&lt;adf&gt;</div>
                    <div style={{ paddingLeft: '14px' }}>
                      <span style={{ color: '#38bdf8' }}>&lt;prospect&gt;</span>
                      <div style={{ paddingLeft: '14px' }}>
                        <div><span style={{ color: '#e2e8f0' }}>&lt;id source="StarterGrid"&gt;lead_84029&lt;/id&gt;</span></div>
                        <div><span style={{ color: '#e2e8f0' }}>&lt;vehicle interest="buy" status="live"&gt;</span></div>
                        <div style={{ paddingLeft: '14px' }}>
                          <div style={{ color: '#34d399' }}>&lt;year&gt;2022&lt;/year&gt;</div>
                          <div style={{ color: '#34d399' }}>&lt;make&gt;Ford&lt;/make&gt;</div>
                          <div style={{ color: '#34d399' }}>&lt;model&gt;F-150&lt;/model&gt;</div>
                          <div style={{ color: '#fbbf24' }}>&lt;vin&gt;1FTFW1ED4NFA10928&lt;/vin&gt;</div>
                          <div style={{ color: '#fbbf24' }}>&lt;stock&gt;STK-22084&lt;/stock&gt;</div>
                        </div>
                        <div><span style={{ color: '#e2e8f0' }}>&lt;/vehicle&gt;</span></div>
                        <div><span style={{ color: '#e2e8f0' }}>&lt;customer&gt;</span></div>
                        <div style={{ paddingLeft: '14px' }}>
                          <div style={{ color: '#93c5fd' }}>&lt;contact&gt;&lt;name&gt;Austin Shopper&lt;/name&gt;&lt;/contact&gt;</div>
                        </div>
                        <div><span style={{ color: '#e2e8f0' }}>&lt;/customer&gt;</span></div>
                      </div>
                      <span style={{ color: '#38bdf8' }}>&lt;/prospect&gt;</span>
                    </div>
                    <div style={{ color: '#38bdf8' }}>&lt;/adf&gt;</div>
                    <div style={{ marginTop: '10px', fontSize: '0.6875rem', color: '#34d399' }}>
                      ✓ SMTP handshake accepted by dealership CRM (CDK / Elead) in 1.4s
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
