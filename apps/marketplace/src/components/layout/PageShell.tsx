import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { favoritesHref, listHref } from '../../lib/routes.ts';

type Props = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function PageShell({ children, backHref, backLabel }: Props) {
  const { user, authReady, openLoginModal, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface-page-bright">
      <a href="#main-content" className="sr-only mp-focus focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow-elevation-2">
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-silver-200 bg-surface-card/95 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6" aria-label="Marketplace">
          <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
            <a href={listHref()} className="mp-focus shrink-0 text-base font-bold tracking-tight text-navy-900 hover:text-navy-800">
              Vehicle Marketplace
            </a>
            {backHref && (
              <>
                <span className="text-silver-300" aria-hidden="true">/</span>
                <a href={backHref} className="mp-focus truncate text-sm font-medium text-ink-muted hover:text-ink-heading">
                  {backLabel ?? 'Back'}
                </a>
              </>
            )}
          </div>

          {authReady && (
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {user ? (
                <>
                  <a
                    href={favoritesHref()}
                    className="mp-focus flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-muted hover:bg-silver-100 hover:text-ink-heading"
                    aria-label="Saved vehicles"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 shrink-0" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                    <span className="hidden sm:inline">Saved</span>
                  </a>

                  <span className="hidden text-sm text-ink-muted sm:block" aria-hidden="true">
                    {user.displayName ?? user.email}
                  </span>

                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="mp-focus rounded-lg px-2 py-1.5 text-sm font-medium text-ink-muted hover:bg-silver-100 hover:text-ink-heading"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="mp-btn-primary py-1.5 text-sm"
                >
                  Sign in
                </button>
              )}
            </div>
          )}
        </nav>
      </header>

      <main id="main-content" className="mp-page">
        {children}
      </main>
    </div>
  );
}
