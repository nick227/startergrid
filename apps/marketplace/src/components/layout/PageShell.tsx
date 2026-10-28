import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useOptionalCategoryContext } from '../../contexts/CategoryContext.tsx';
import { categoryHomeHref, favoritesHref, listHref, parseRoute, profileHref, sitesHref } from '../../lib/routes.ts';
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
  const { user, authReady, openLoginModal, logout } = useAuth();
  const category = useOptionalCategoryContext();
  const homeHref = category && showCategoryNav ? categoryHomeHref(category.slug) : sitesHref();
  const savedHref = category ? favoritesHref(category.slug) : favoritesHref('automotive');
  const accountHref = category ? profileHref(category.slug) : profileHref('automotive');
  const route = typeof window === 'undefined' ? null : parseRoute();
  const activeTab = route && category && 'slug' in route && route.slug === category.slug
    ? route.page
    : null;
  const tabs = category && showCategoryNav
    ? [
        { key: 'list', label: 'Browse', href: listHref(category.slug) },
        { key: 'favorites', label: 'Saved', href: savedHref },
        { key: 'profile', label: 'Profile', href: accountHref },
      ] as const
    : [];

  return (
    <div className="min-h-screen bg-surface-page flex flex-col justify-between">
      <a href="#main-content" className="sr-only mp-focus focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow-elevation-2">
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-silver-200 bg-surface-card/95 backdrop-blur shadow-sm">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6" aria-label="Marketplace">
          <div className="flex min-w-0 shrink items-center gap-3 sm:gap-6">
            <a href={homeHref} className="mp-focus flex items-center gap-2.5 group shrink-0" title="DealerGrid Marketplace">
              <DealerGridMark size={32} />
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-navy-950 group-hover:text-cta transition-colors">
                    DEALERGRID
                  </span>
                  <span className="rounded bg-navy-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-navy-800">
                    MARKETPLACE
                  </span>
                </div>
              </div>
            </a>

            {backHref && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-silver-300" aria-hidden="true">/</span>
                <a href={backHref} className="mp-focus truncate text-sm font-medium text-ink-muted hover:text-ink-heading">
                  {backLabel ?? 'Back'}
                </a>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a
              href="http://localhost:5173/app/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-silver-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-900 shadow-sm hover:bg-silver-100 transition"
              title="Seller & Merchant Portal"
            >
              <span>Seller Portal</span>
              <span className="text-[10px] text-cta font-bold">↗</span>
            </a>

            {authReady && (
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                {user ? (
                  <>
                    <a
                      href={savedHref}
                      className="mp-focus flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium text-ink-muted hover:bg-silver-100 hover:text-ink-heading"
                      aria-label="Saved listings"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 shrink-0 text-cta" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                      <span className="hidden sm:inline">Saved</span>
                    </a>

                    <a
                      href={accountHref}
                      className="mp-focus hidden rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium text-ink-muted hover:bg-silver-100 hover:text-ink-heading md:block"
                      aria-label="Your profile"
                    >
                      {user.displayName ?? user.email}
                    </a>

                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="mp-focus rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium text-ink-muted hover:bg-silver-100 hover:text-ink-heading"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={openLoginModal}
                    className="mp-btn-primary py-1.5 px-3.5 text-xs sm:text-sm shadow-sm"
                  >
                    Shopper Sign in
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>
        {tabs.length > 0 && (
          <nav className="border-t border-silver-100 bg-white/80 py-2.5" aria-label={`${category!.schema.label} sections`}>
            <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 sm:px-6">
              {tabs.map(tab => {
                const active = activeTab === tab.key;
                return (
                  <a
                    key={tab.key}
                    href={tab.href}
                    aria-current={active ? 'page' : undefined}
                    className={active ? 'mp-btn-primary py-1 px-3 text-xs sm:text-sm' : 'mp-btn-secondary py-1 px-3 text-xs sm:text-sm'}
                  >
                    {tab.label}
                  </a>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      <main id="main-content" className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
