import type { ReactNode } from 'react';
import { BrandLockup } from './BrandLockup.tsx';

export type PublicAuthRoute = 'login' | 'signup';

type Props = {
  publicRoute?: PublicAuthRoute;
  context?: ReactNode;
  end?: ReactNode;
  nav?: ReactNode;
  sticky?: boolean;
};

const QUIET = 'whitespace-nowrap text-sm font-medium text-white/70 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500';
const PILL = 'whitespace-nowrap rounded-md bg-orange-500 px-3.5 py-1.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-950';

function PublicAuthLinks({ route }: { route: PublicAuthRoute }) {
  const loginActive = route === 'login';
  return (
    <nav aria-label="Account" className="flex shrink-0 items-center gap-4 sm:gap-5">
      <a href="#/" aria-current={loginActive ? 'page' : undefined} className={QUIET}>
        Log in
      </a>
      <a href="#/signup" aria-current={loginActive ? undefined : 'page'} className={PILL}>
        Create account
      </a>
    </nav>
  );
}

export function AppHeader({ publicRoute, context, end, nav, sticky = true }: Props) {
  const blended = Boolean(publicRoute);
  return (
    <header className={`bg-navy-950 text-white ${blended ? '' : 'border-b border-white/10 shadow-chrome'} ${sticky ? 'sticky top-0 z-30' : ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <BrandLockup />
            {context && (
              <>
                <span aria-hidden="true" className="hidden h-4 w-px shrink-0 bg-white/20 sm:block" />
                {context}
              </>
            )}
          </div>
          {publicRoute ? <PublicAuthLinks route={publicRoute} /> : end}
        </div>
        {nav && <div className="border-t border-white/10">{nav}</div>}
      </div>
    </header>
  );
}
