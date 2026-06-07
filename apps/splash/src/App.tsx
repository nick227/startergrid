import { useEffect, useState } from 'react';
import { parseRoute, type SplashRoute } from './lib/routes.ts';
import SplashPage from './pages/SplashPage.tsx';
import IndexPage from './pages/IndexPage.tsx';

function NotFound({ slug }: { slug: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--navy-950)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-6)',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '3rem' }}>🔍</p>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
        Page not found
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9375rem' }}>
        No splash page exists for <code style={{ color: 'var(--accent)' }}>/{slug}</code>
      </p>
      <a href="#/" className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-2)' }}>
        ← Back to index
      </a>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<SplashRoute>(parseRoute);

  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (route.page === 'index') return <IndexPage />;
  if (route.page === 'splash') return <SplashPage slug={route.slug} />;
  return <NotFound slug={route.slug} />;
}
