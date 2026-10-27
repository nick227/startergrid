import type { ReactNode } from 'react';
import { AppHeader, type PublicAuthRoute } from './AppHeader.tsx';

type Props = {
  route: PublicAuthRoute;
  children: ReactNode;
};

export const authFieldClass =
  'h-10 w-full rounded-md border border-white/15 bg-white/[0.06] px-3 text-sm text-white [color-scheme:dark] ' +
  'placeholder:text-white/35 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/25';

export const authLabelClass = 'text-sm font-medium text-white/70';

export const authRowClass =
  'grid grid-cols-1 items-center gap-1.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-4';

export function AuthFrame({ route, children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-navy-950 text-white">
      <AppHeader publicRoute={route} />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5">
        <div className="my-auto flex w-full flex-col py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
