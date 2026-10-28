import { useEffect, useId, useRef, useState } from 'react';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import type { OperatorUser } from '@/lib/api/auth.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { documentationUrl } from '@/lib/docs/urls.ts';
import { OperatorAvatar } from './OperatorAvatar.tsx';

type Props = {
  activeReports: boolean;
  activeCompany: boolean;
  showChangeDealer: boolean;
  helpTopic: string;
  user: OperatorUser | null;
  onRefreshUser: () => void;
  nav: OperatorNavHandlers;
  onSignOut: () => void;
};

const ITEM = 'flex min-h-11 w-full items-center px-3 text-left text-sm font-medium text-ink-heading hover:bg-silver-100';

export function OperatorUtilityMenu({ activeReports, activeCompany, showChangeDealer, helpTopic, user, onRefreshUser, nav, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  const go = (action: () => void) => { setOpen(false); action(); };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(value => !value)}
        className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-white hover:bg-navy-800"
      >
        More
      </button>
      {open && (
        <div id={panelId} role="menu" className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-silver-200 bg-white py-1 shadow-elevation-2">
          <button type="button" role="menuitem" className={ITEM} aria-current={activeReports ? 'page' : undefined} onClick={() => go(nav.goToReports)}>Reports</button>
          <button type="button" role="menuitem" className={ITEM} aria-current={activeCompany ? 'page' : undefined} onClick={() => go(nav.goToSettings)}>Company</button>
          <a role="menuitem" href={documentationUrl(helpTopic)} target="_blank" rel="noopener noreferrer" className={ITEM}>Help</a>
          {showChangeDealer && (
            <button type="button" role="menuitem" className={ITEM} onClick={() => go(nav.changeDealer)}>{operatorCopy.scope.changeAction}</button>
          )}
          {user && (
            <div className="border-t border-silver-100 px-3 py-2">
              <OperatorAvatar user={user} onAvatarUpdated={onRefreshUser} labeled />
            </div>
          )}
          {user && (
            <button type="button" role="menuitem" className={ITEM} onClick={() => go(onSignOut)}>{operatorCopy.auth.signOut}</button>
          )}
        </div>
      )}
    </div>
  );
}

export function RefreshIconButton({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      aria-label={refreshing ? 'Refreshing' : 'Refresh'}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-silver-100 hover:bg-navy-800 disabled:opacity-40"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M16.2 10a6.2 6.2 0 1 1-1.5-4.1" strokeLinecap="round" />
        <path d="M16.2 3.6v4h-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
