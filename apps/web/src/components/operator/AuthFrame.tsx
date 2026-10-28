import type { ReactNode } from 'react';
import { AppHeader, type PublicAuthRoute } from './AppHeader.tsx';

type Props = {
  route: PublicAuthRoute;
  children: ReactNode;
};

const authControl =
  'h-10 w-full rounded-md border border-white/15 bg-white/[0.06] px-3 text-sm text-white ' +
  'placeholder:text-white/35 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/25';

export const authFieldClass = `${authControl} [color-scheme:dark]`;

/** Closed value stays light on the dark field. The menu is dark text on white. */
export const authSelectClass = `${authControl} auth-select`;

export const authLabelClass = 'text-sm font-medium text-white/70';

export const authRowClass = 'grid gap-1.5 text-left';

export function AuthHeading({ title, slug }: { title: string; slug: string }) {
  return (
    <div className="text-center">
      <h1 className="font-brand text-[1.65rem] font-medium leading-tight tracking-tight">{title}</h1>
      {slug && <p className="mt-2 text-sm leading-relaxed text-white/55">{slug}</p>}
    </div>
  );
}

export function AuthFrame({ route, children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-navy-950 text-white">
      <AppHeader publicRoute={route} />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-5">
        <div className="my-auto flex w-full flex-col py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
