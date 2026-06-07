import { useEffect } from 'react';
import { ALL_SPLASH_SLUGS, SLUG_META } from '../lib/slugMap.ts';
import { splashHref } from '../lib/routes.ts';

export default function IndexPage() {
  useEffect(() => {
    document.title = 'StarterGrid — Sales Landing Pages (Internal)';
  }, []);

  return (
    <div className="index-page">
      {/* Simple top bar */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(7,19,33,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        zIndex: 100,
        paddingInline: 'var(--space-6)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            StarterGrid
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>
            INTERNAL — Sales Landing Pages
          </span>
        </div>
      </header>

      <div className="container">
        <div className="index-page__header">
          <h1 className="index-page__title">
            Category splash sites
          </h1>
          <p className="index-page__sub">
            {ALL_SPLASH_SLUGS.length} categories · {ALL_SPLASH_SLUGS.filter(s => SLUG_META[s].live).length} live · {ALL_SPLASH_SLUGS.filter(s => !SLUG_META[s].live).length} stub
          </p>
        </div>

        <div className="category-index-grid">
          {ALL_SPLASH_SLUGS.map(slug => {
            const meta = SLUG_META[slug];
            return (
              <a
                key={slug}
                href={splashHref(slug)}
                className="category-index-card"
                aria-label={`${meta.label} splash page`}
              >
                <div className="category-index-card__icon" aria-hidden="true">
                  {meta.icon}
                </div>
                <div className="category-index-card__info">
                  <div className="category-index-card__name">{meta.label}</div>
                  <div className="category-index-card__slug">/#/{slug}</div>
                </div>
                <span className={`category-index-card__badge category-index-card__badge--${meta.live ? 'live' : 'stub'}`}>
                  {meta.live ? 'Live' : 'Stub'}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
