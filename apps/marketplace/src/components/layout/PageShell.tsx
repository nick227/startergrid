import type { ReactNode } from 'react';
import { listHref } from '../../lib/routes.ts';

type Props = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function PageShell({ children, backHref, backLabel }: Props) {
  return (
    <div className="min-h-screen bg-surface-page-bright">
      <a href="#main-content" className="sr-only mp-focus focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow-elevation-2">
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-silver-200 bg-surface-card/95 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6" aria-label="Marketplace">
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
        </nav>
      </header>

      <main id="main-content" className="mp-page">
        {children}
      </main>
    </div>
  );
}
