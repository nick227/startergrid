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

const LINK = 'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500';

function PublicAuthLinks({ route }: { route: PublicAuthRoute }) {
  const loginActive = route === 'login';
  return (
    <nav aria-label="Account" className="flex shrink-0 items-center gap-1">
      <a
        href="#/"
        aria-current={loginActive ? 'page' : undefined}
        className={loginActive ? `${LINK} bg-navy-800 text-white` : `${LINK} text-silver-300 hover:bg-navy-900/60 hover:text-white`}
      >
        Log in
      </a>
      <a
        href="#/signup"
        aria-current={loginActive ? undefined : 'page'}
        className={loginActive ? `${LINK} text-silver-300 hover:bg-navy-900/60 hover:text-white` : `${LINK} bg-navy-800 text-white`}
      >
        Create dealership
      </a>
    </nav>
  );
}

export function AppHeader({ publicRoute, context, end, nav, sticky = true }: Props) {
  return (
    <header className={`border-b border-navy-800 bg-navy-950 text-white shadow-chrome ${sticky ? 'sticky top-0 z-30' : ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <BrandLockup />
            {context}
          </div>
          {publicRoute ? <PublicAuthLinks route={publicRoute} /> : end}
        </div>
        {nav && <div className="border-t border-navy-800">{nav}</div>}
      </div>
    </header>
  );
}
