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

const QUIET = 'whitespace-nowrap px-2 py-1.5 text-[13px] font-medium tracking-wide text-silver-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500';
const PILL = 'whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500';

function PublicAuthLinks({ route }: { route: PublicAuthRoute }) {
  const loginActive = route === 'login';
  return (
    <nav aria-label="Account" className="flex shrink-0 items-center gap-1 sm:gap-2">
      <a
        href="#/"
        aria-current={loginActive ? 'page' : undefined}
        className={loginActive ? `${PILL} bg-white text-navy-950` : QUIET}
      >
        Log in
      </a>
      <a
        href="#/signup"
        aria-current={loginActive ? undefined : 'page'}
        className={loginActive ? `${PILL} border border-white/20 text-white hover:border-white/50` : `${PILL} bg-white text-navy-950`}
      >
        Create dealership
      </a>
    </nav>
  );
}

export function AppHeader({ publicRoute, context, end, nav, sticky = true }: Props) {
  return (
    <header className={`border-b border-white/10 bg-navy-950 text-white shadow-chrome ${sticky ? 'sticky top-0 z-30' : ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <BrandLockup />
            {context && (
              <>
                <span aria-hidden="true" className="hidden h-5 w-px shrink-0 bg-white/15 sm:block" />
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
