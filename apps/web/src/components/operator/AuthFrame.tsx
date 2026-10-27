import type { ReactNode } from 'react';
import { AppHeader, type PublicAuthRoute } from './AppHeader.tsx';

type Props = {
  route: PublicAuthRoute;
  children: ReactNode;
};

const MARK = 'pointer-events-none absolute text-sm leading-none text-orange-500';

export const authFieldClass =
  'w-full rounded-lg border border-white/10 bg-white/[0.06] px-3.5 py-3 text-sm text-white [color-scheme:dark] ' +
  'placeholder:text-white/35 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30';

export const authLabelClass = 'text-xs font-medium text-white/55';

export function AuthFrame({ route, children }: Props) {
  return (
    <div className="relative min-h-screen bg-navy-950 text-white">
      <span aria-hidden="true" className={`${MARK} left-5 top-24 sm:left-8`}>+</span>
      <span aria-hidden="true" className={`${MARK} right-5 top-24 sm:right-8`}>+</span>
      <span aria-hidden="true" className={`${MARK} bottom-8 left-5 sm:left-8`}>+</span>
      <span aria-hidden="true" className={`${MARK} bottom-8 right-5 sm:right-8`}>+</span>
      <AppHeader publicRoute={route} />
      <main className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-12 sm:py-16">
        {children}
      </main>
    </div>
  );
}
