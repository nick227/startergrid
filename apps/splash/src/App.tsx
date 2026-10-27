import { useEffect, useState } from 'react';
import { parseRoute, type SplashRoute } from './lib/routes.ts';
import FlagshipSplashPage from './pages/FlagshipSplashPage.tsx';
import SplashPage from './pages/SplashPage.tsx';
import IndexPage from './pages/IndexPage.tsx';

function NotFound({ slug }: { slug: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#071321',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '24px',
        textAlign: 'center',
        color: '#fff',
      }}
    >
      <p style={{ fontSize: '3rem' }}>🔍</p>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
        Page not found
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9375rem' }}>
        No page exists for <code style={{ color: '#60a5fa' }}>/{slug}</code>
      </p>
      <a href="#/" style={{ color: '#60a5fa', textDecoration: 'none', marginTop: '8px', fontSize: '0.875rem' }}>
        ← Back to StarterGrid home
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

  if (route.page === 'flagship') return <FlagshipSplashPage />;
  if (route.page === 'index') return <IndexPage />;
  if (route.page === 'splash') return <SplashPage slug={route.slug} />;
  return <NotFound slug={route.slug} />;
}
