import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useOptionalCategoryContext } from '../../contexts/CategoryContext.tsx';
import { categoryHomeHref, favoritesHref, profileHref, sitesHref } from '../../lib/routes.ts';
import { DealerGridMark } from '../ui/CategoryIcons.tsx';

type Props = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  showCategoryNav?: boolean;
};

export function PageShell({
  children,
  backHref,
  backLabel,
  showCategoryNav = true,
}: Props) {
  const { user, authReady, logout } = useAuth();
  const category = useOptionalCategoryContext();
  const homeHref = category && showCategoryNav ? categoryHomeHref(category.slug) : sitesHref();
  const savedHref = category ? favoritesHref(category.slug) : favoritesHref('automotive');
  const accountHref = category ? profileHref(category.slug) : profileHref('automotive');
  const signedIn = authReady && user;
  const showHeader = Boolean(backHref) || Boolean(signedIn) || (category != null && showCategoryNav);

  return (
    <div className="min-h-screen bg-surface-page flex flex-col justify-between">
      <a href="#main-content" className="sr-only mp-focus focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow-elevation-2">
        Skip to content
      </a>

      <header className={`${showHeader ? 'block' : 'hidden'} sticky top-0 z-20 border-b border-silver-200 bg-surface-card/95 backdrop-blur`}>
        <nav className="mp-rail flex h-14 items-center justify-between gap-4" aria-label="Marketplace">
          <div className="flex min-w-0 items-center gap-4">
            <a href={homeHref} className="mp-focus flex items-center gap-2.5 group shrink-0" title="DealerGrid Marketplace">
              <DealerGridMark size={24} />
              <span className="text-sm font-semibold tracking-tight text-navy-950 group-hover:text-cta">
                DealerGrid
              </span>
            </a>

            {backHref && (
              <a href={backHref} className="mp-focus truncate text-sm text-ink-muted hover:text-ink-heading">
                {backLabel ?? 'Back'}
              </a>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-5">
            <a
              href="http://localhost:5173/app/"
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm text-ink-muted hover:text-navy-950 md:inline"
            >
              Seller portal
            </a>

            {signedIn && user && (
              <>
                <a href={savedHref} className="mp-focus text-sm text-ink-muted hover:text-navy-950">
                  Saved
                </a>
                <a href={accountHref} className="mp-focus hidden text-sm text-ink-muted hover:text-navy-950 md:inline">
                  {user.displayName ?? user.email}
                </a>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="mp-focus text-sm text-ink-muted hover:text-navy-950"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main id="main-content" className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
