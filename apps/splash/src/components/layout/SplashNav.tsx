import { useEffect, useState } from 'react';
import type { SplashContent } from '../../types/content.ts';
import { indexHref } from '../../lib/routes.ts';

interface SplashNavProps {
  content: SplashContent;
  onCta: () => void;
}

export function SplashNav({ content, onCta }: SplashNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const { brand } = content;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Split brand name into base + "Grid" suffix for accent coloring
  const name = brand.name;
  const gridIdx = name.lastIndexOf('Grid');
  const nameBase = gridIdx > 0 ? name.slice(0, gridIdx) : name;
  const nameSuffix = gridIdx > 0 ? 'Grid' : '';

  const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';

  return (
    <nav className={`splash-nav${scrolled ? ' scrolled' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="splash-nav__inner">
        <a href={indexHref()} className="splash-nav__brand" aria-label={`${brand.name} home`}>
          <span className="splash-nav__name">
            {nameBase}
            {nameSuffix && <span>{nameSuffix}</span>}
          </span>
          <span className="splash-nav__powered">Powered by StarterGrid</span>
        </a>

        <div className="splash-nav__actions" style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <a href={`${appUrl}/#/login`} className="t-body" style={{ color: 'var(--ink-muted)', textDecoration: 'none', fontWeight: 500 }}>
            Log In
          </a>
          <a href={`${appUrl}/#/signup`} className="t-body" style={{ color: 'var(--ink-muted)', textDecoration: 'none', fontWeight: 500 }}>
            Get Started
          </a>
          <button
            id="nav-cta-btn"
            className="btn btn-primary btn-sm"
            onClick={onCta}
            type="button"
          >
            Request a demo
          </button>
        </div>
      </div>
    </nav>
  );
}
