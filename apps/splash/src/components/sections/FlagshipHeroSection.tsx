import React from 'react';

interface FlagshipHeroSectionProps {
  onRequestAccess: () => void;
}

const DISTRIBUTION_CARDS = [
  {
    channel: 'DealerGrid Marketplace',
    category: 'Owned Marketplace',
    activeUnits: '148 vehicles live',
    avgTurn: '12 days avg turn',
    status: 'Active (Instant)',
    badgeColor: '#10b981',
    notes: 'Zero conquest ads • Direct CRM leads',
  },
  {
    channel: 'Google Vehicle Ads',
    category: 'Search Intent',
    activeUnits: '142 vehicles compliant',
    avgTurn: '14 days avg turn',
    status: 'Active (Daily sync)',
    badgeColor: '#38bdf8',
    notes: 'Merchant Center feed • EPA specs decoded',
  },
  {
    channel: 'Meta Automotive (FB/IG)',
    category: 'Social Discovery',
    activeUnits: '148 vehicles in catalog',
    avgTurn: '18 days avg turn',
    status: 'Active (Catalog API)',
    badgeColor: '#60a5fa',
    notes: 'Dynamic retargeting • In-app lead handoff',
  },
  {
    channel: 'CarGurus Feed',
    category: 'Third-Party Marketplace',
    activeUnits: '140 vehicles active',
    avgTurn: '21 days avg turn',
    status: 'Active (Scheduled)',
    badgeColor: '#fbbf24',
    notes: 'Batch feed • Deal rating compliant',
  },
];

export const FlagshipHeroSection: React.FC<FlagshipHeroSectionProps> = ({ onRequestAccess }) => {
  return (
    <section
      id="hero-distribution"
      style={{
        padding: '120px 32px 140px',
        background: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(37, 99, 235, 0.12) 0%, transparent 80%), #080c14',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        {/* Top Text Block: Enormous Typography & Apple-Scale Restraint */}
        <div style={{ maxWidth: '1060px', marginBottom: '64px' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: '#3b82f6',
              textTransform: 'uppercase',
              marginBottom: '24px',
            }}
          >
            DEALERGRID / AUTOMOTIVE SOFTWARE
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.75rem, 5.8vw, 5.75rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.04em',
              lineHeight: 1.04,
              marginBottom: '28px',
            }}
          >
            Post your vehicles to 70+ websites from one platform.
          </h1>

          <p
            style={{
              fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
              lineHeight: 1.5,
              color: '#94a3b8',
              maxWidth: '860px',
              marginBottom: '40px',
            }}
          >
            Compare what sells, where it sells, and how quickly.
          </p>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={onRequestAccess}
              style={{
                padding: '16px 36px',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: '1.0625rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1d4ed8';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2563eb';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Explore DealerGrid
            </button>

            <a
              href="/app/"
              style={{
                padding: '16px 28px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '1.0625rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
              }}
            >
              <span>Explore Live Operator Portal</span>
              <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>[Live Demo]</span>
            </a>

            <a
              href="/marketplace/"
              style={{
                padding: '16px 28px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                textDecoration: 'none',
                fontSize: '1.0625rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <span>Browse Public Marketplace ↗</span>
            </a>
          </div>
        </div>

        {/* Dominant Product Visual: Authentic Channels & Distribution Interface */}
        <div
          style={{
            background: '#0d131f',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.65)',
          }}
        >
          {/* Window Chrome Header */}
          <div
            style={{
              background: '#090d16',
              padding: '16px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              </div>
              <strong style={{ color: '#ffffff', fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>
                Austin Auto Group
              </strong>
              <span style={{ color: '#64748b' }}>/</span>
              <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                Multi-Channel Distribution Hub
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem' }}>
              <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                Autopilot: 70+ Profiles Configured
              </span>
              <span style={{ color: '#64748b' }}>•</span>
              <span style={{ color: '#94a3b8' }}>
                DMS Connection: CDK Global (Verified)
              </span>
            </div>
          </div>

          {/* Interface Content: Real Channels Data Grid */}
          <div style={{ padding: '32px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              {DISTRIBUTION_CARDS.map((card, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
                        {card.category}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: card.badgeColor, fontWeight: 600 }}>
                        ● {card.status}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                      {card.channel}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '14px' }}>
                      {card.notes}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <strong style={{ color: '#ffffff' }}>{card.activeUnits}</strong>
                    <span style={{ color: '#38bdf8' }}>{card.avgTurn}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footnote: Transparent Sample Data Provenance */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#64748b',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: '16px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span>
                Sample dealership distribution layout • Demonstrating 148-unit lot across search, social, and marketplaces.
              </span>
              <span style={{ color: '#38bdf8' }}>
                70+ destinations supported nationwide
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
