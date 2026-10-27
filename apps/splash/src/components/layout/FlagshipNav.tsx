interface FlagshipNavProps {
  onOpenIntake: () => void;
}

export const FlagshipNav: React.FC<FlagshipNavProps> = ({ onOpenIntake }) => {

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '70px',
        background: 'rgba(7, 19, 33, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a
            href="#/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                color: '#fff',
                fontSize: '1rem',
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)',
              }}
            >
              SG
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#fff',
                  lineHeight: 1.1,
                }}
              >
                StarterGrid
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  color: 'rgba(255, 255, 255, 0.4)',
                  letterSpacing: '0.04em',
                  fontWeight: 500,
                }}
              >
                AUTO PLATFORM & SYNDICATION
              </span>
            </div>
          </a>

          {/* Engine status pill */}
          <div
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '9999px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '0.6875rem',
              color: '#34d399',
              fontWeight: 600,
            }}
            className="desktop-status-pill"
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
              }}
            />
            31 Channels Live
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '24px',
          }}
          className="desktop-nav"
        >
          <a href="#dms-architecture" style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            DMS Coexistence
          </a>
          <a href="#channels" style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            31 Channels
          </a>
          <a href="#preflight" style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            Pre-Flight Engine
          </a>
          <a href="#marketplace" style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            Consumer Marketplace
          </a>
          <a href="#attribution" style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            ROI Attribution
          </a>
          <a href="#pricing" style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            Pricing
          </a>
        </nav>

        {/* Action CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href="/marketplace/"
            style={{
              color: '#60a5fa',
              textDecoration: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              background: 'rgba(59, 130, 246, 0.08)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Marketplace</span>
            <span style={{ fontSize: '0.7rem' }}>↗</span>
          </a>

          <a
            href="/app/"
            style={{
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              padding: '7px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.06)',
            }}
          >
            Operator Portal
          </a>

          <button
            onClick={onOpenIntake}
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
            }}
          >
            Get Onboarded
          </button>
        </div>
      </div>
    </header>
  );
};
