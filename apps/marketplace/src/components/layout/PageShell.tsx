import type { ReactNode } from 'react';
import { listHref } from '../../lib/routes.ts';

type Props = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function PageShell({ children, backHref, backLabel }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <a href="#main-content" className="sr-only mp-focus focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow">
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6" aria-label="Marketplace">
          <a href={listHref()} className="mp-focus shrink-0 text-base font-bold tracking-tight text-blue-600 hover:text-blue-700">
            Vehicle Marketplace
          </a>
          {backHref && (
            <>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <a href={backHref} className="mp-focus truncate text-sm font-medium text-slate-500 hover:text-slate-800">
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
