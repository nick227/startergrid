import { HELP_TOPICS } from '@/lib/helpTasks.ts';
import { OperatorNav } from './OperatorNav.tsx';
import type { OperatorTab, OperatorNavHandlers } from '../../lib/operatorNav.ts';
import { operatorCopy } from '../../lib/copy/operator.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { DealerLogo } from './DealerLogo.tsx';
import { OperatorAvatar } from './OperatorAvatar.tsx';
import { isDealerFacingRole, isInternalSupportRole } from '@/lib/operatorAccess.ts';
import { HelpButton } from '@/components/docs/HelpButton.tsx';
import { AppHeader } from './AppHeader.tsx';
import { OperatorUtilityMenu, RefreshIconButton } from './OperatorUtilityMenu.tsx';

type Props = {
  dealerId: string;
  dealerName?: string | null;
  activeTab: OperatorTab;
  nav: OperatorNavHandlers;
  onRefresh?: () => void;
  refreshing?: boolean;
  lastRefresh?: Date;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  footerPad?: boolean;
  hideDealerId?: boolean;
  sectionLabel?: string;
};

const TAB_LABELS: Record<OperatorTab, string> = {
  activity: 'Activity', team: 'Team',
  home: 'Activity',
  platforms: 'Channels',
  reports: 'Reports',
  inventory: 'Vehicles',
  leads: 'Leads',
  settings: 'Company',
  help: 'Help',
};



export function PageShell({
  dealerId,
  dealerName,
  activeTab,
  nav,
  onRefresh,
  refreshing,
  lastRefresh,
  headerAction,
  children,
  footerPad,
  hideDealerId,
  sectionLabel,
}: Props) {
  const { user, logout, refresh } = useAuth();
  const categorySchema = useCategorySchema();
  const displayDealerName = dealerName?.trim() || dealerId;

  // Internal staff always see which dealership they are acting in, whichever tab they navigate to.
  const isInternalStaff = isInternalSupportRole(user?.role ?? '');
  const isSupportMode = isInternalStaff || (typeof window !== 'undefined' && window.location.hash.includes('support=true'));
  const showChangeDealer = !(isDealerFacingRole(user?.role ?? '') && (user?.dealerAccessIds.length ?? 0) <= 1);
  const helpTopic = activeTab === 'activity' && /\/(activity\/)?leads(?:[?]|$)/.test(window.location.hash) ? HELP_TOPICS.leads : HELP_TOPICS[activeTab];

  return (
    <div className={`min-h-screen bg-surface-page ${footerPad ? 'pb-20' : ''}`}>
      <div className="sticky top-0 z-30">
      {isSupportMode && (
        <aside aria-label="Support mode" className="bg-amber-950/95 border-b border-amber-500/40 text-amber-200 px-4 sm:px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs font-medium backdrop-blur-md">
          <div className="min-w-0 flex items-center gap-3">
            <span className="text-base shrink-0" aria-hidden="true">🛠️</span>
            <div className="min-w-0">
              <p className="text-white text-sm font-bold truncate">
                Support mode: Viewing <span className="underline decoration-amber-400">{displayDealerName}</span>
              </p>
              <p className="text-amber-100/80 text-[11px] mt-0.5">
                Signed in as <span className="font-semibold text-white">{user?.email ?? 'unknown'}</span> ({user?.role ? user.role.replace(/_/g, ' ').toLowerCase() : 'support'})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => { window.location.hash = `#/admin/dealers/${dealerId}`; }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Return to dealership record</span>
            </button>
            <button
              type="button"
              onClick={() => { window.location.hash = '#/admin/dealers'; }}
              className="text-amber-200 hover:text-white underline font-semibold transition-colors px-1"
            >
              All dealerships
            </button>
          </div>
        </aside>
      )}

      <AppHeader
        sticky={false}
        context={(
          <div className="flex min-w-0 items-center gap-3">
            <DealerLogo dealershipId={dealerId} />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight sm:text-base">{displayDealerName}</h1>
              <p className="truncate text-[11px] text-silver-200">
                {sectionLabel ?? TAB_LABELS[activeTab]}
                <span className="hidden text-ink-faint sm:inline">
                  <span className="text-silver-300"> · </span>
                  <span>{categorySchema.label}</span>
                  {!hideDealerId && !isDealerFacingRole(user?.role ?? '') && (
                    <span className="font-mono"> · {dealerId}</span>
                  )}
                </span>
              </p>
            </div>
          </div>
        )}
        end={(
          <div className="flex shrink-0 items-center gap-1 sm:hidden">
            {onRefresh && <RefreshIconButton onRefresh={onRefresh} refreshing={Boolean(refreshing)} />}
            <OperatorUtilityMenu
              activeReports={activeTab === 'reports'}
              activeCompany={activeTab === 'settings'}
              showChangeDealer={showChangeDealer}
              helpTopic={helpTopic}
              user={user}
              onRefreshUser={refresh}
              nav={nav}
              onSignOut={() => void logout()}
            />
          </div>
        )}
        nav={(
          <>
            <div className="py-1.5 sm:py-3">
              <OperatorNav active={activeTab} nav={nav} />
            </div>
            <div className="hidden min-w-0 items-center gap-3 border-t border-navy-800/80 py-3 sm:flex">
              {showChangeDealer ? (
                <button
                  type="button"
                  onClick={nav.changeDealer}
                  className="shrink-0 text-xs text-ink-faint transition-colors hover:text-white"
                >
                  ← {operatorCopy.scope.changeAction}
                </button>
              ) : null}
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 [&>*]:shrink-0">
                <HelpButton topic={helpTopic} inverted />
                <button
                  type="button"
                  onClick={nav.goToReports}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    activeTab === 'reports'
                      ? 'bg-navy-800 text-white shadow-elevation-1'
                      : 'text-silver-300 hover:bg-navy-900/60 hover:text-white'
                  }`}
                >
                  Reports
                </button>
                <button
                  type="button"
                  onClick={nav.goToSettings}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-navy-800 text-white shadow-elevation-1'
                      : 'text-silver-300 hover:bg-navy-900/60 hover:text-white'
                  }`}
                >
                  Company
                </button>
                {user && (
                  <OperatorAvatar user={user} onAvatarUpdated={refresh} />
                )}
                {lastRefresh && !refreshing && (
                  <span className="text-xs text-navy-500">Updated {lastRefresh.toLocaleTimeString()}</span>
                )}
                {refreshing && <span className="animate-pulse text-xs text-ink-faint">Refreshing…</span>}
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="rounded-md bg-navy-800 px-3 py-1.5 text-xs font-medium text-silver-100 transition-colors hover:bg-navy-700 disabled:opacity-40"
                  >
                    Refresh
                  </button>
                )}
                {headerAction}
                {user && (
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="px-3 py-1.5 text-xs font-medium text-ink-faint transition-colors hover:text-white"
                  >
                    {operatorCopy.auth.signOut}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
