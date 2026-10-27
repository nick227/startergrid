import { OperatorNav } from './OperatorNav.tsx';
import type { OperatorTab, OperatorNavHandlers } from '../../lib/operatorNav.ts';
import { OPERATOR_TABS } from '../../lib/operatorNav.ts';
import { operatorCopy } from '../../lib/copy/operator.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { useAdminView } from '@/contexts/AdminViewContext.tsx';
import { DealerLogo } from './DealerLogo.tsx';
import { OperatorAvatar } from './OperatorAvatar.tsx';
import { isDealerFacingRole, isInternalSupportRole } from '@/lib/operatorAccess.ts';

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
  home: 'Home',
  platforms: 'Channels',
  reports: 'Reports',
  inventory: 'Vehicles',
  leads: 'Leads',
  settings: 'Settings',
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
  const isAdminView = useAdminView();
  const displayDealerName = dealerName?.trim() || dealerId;

  if (isAdminView) {
    const tabHandlers: Record<OperatorTab, () => void> = {
      home: nav.goToHome,
      platforms: nav.goToPlatforms,
      reports: nav.goToReports,
      inventory: () => nav.goToInventory(),
      leads: nav.goToLeads,
      settings: nav.goToSettings,
      help: nav.goToHelp,
    };
    return (
      <div className={footerPad ? 'pb-20' : ''}>
        <div className="flex items-center justify-between gap-4 py-3 border-b border-silver-200">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-4xl font-semibold text-ink-heading truncate">{displayDealerName}</span>
            {user?.role === 'SUPER_ADMIN' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                Viewing as internal user
              </span>
            )}
            {!hideDealerId && (
              <span className="text-xs text-ink-faint font-mono hidden sm:block truncate max-w-[14rem]">{dealerId}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastRefresh && !refreshing && (
              <span className="text-silver-400 text-xs hidden sm:block">Updated {lastRefresh.toLocaleTimeString()}</span>
            )}
            {refreshing && <span className="text-ink-faint text-xs animate-pulse">Refreshing…</span>}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="px-3 py-1.5 text-xs font-medium bg-silver-100 hover:bg-silver-200 text-ink-heading rounded-md transition-colors disabled:opacity-40"
              >
                Refresh
              </button>
            )}
            {headerAction}
          </div>
        </div>
        <div className="flex border-b border-silver-200 mb-6 overflow-x-auto">
          {OPERATOR_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={tabHandlers[tab.id]}
              className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab.id === activeTab
                  ? 'border-orange-600 text-ink-heading'
                  : 'border-transparent text-ink-muted hover:text-ink-body hover:border-silver-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div>{children}</div>
      </div>
    );
  }

  // Internal staff always see which dealership they are acting in, whichever tab they navigate to.
  const isInternalStaff = isInternalSupportRole(user?.role ?? '');
  const isSupportMode = isInternalStaff || (typeof window !== 'undefined' && window.location.hash.includes('support=true'));

  return (
    <div className={`min-h-screen bg-surface-page ${footerPad ? 'pb-20' : ''}`}>
      <div className="sticky top-0 z-30">
      {isSupportMode && (
        <aside aria-label="Support mode" className="bg-amber-950/90 border-b border-amber-500/30 text-amber-200 px-4 sm:px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs font-medium backdrop-blur-md">
          <div className="min-w-0">
            <p className="text-white text-sm font-bold truncate">Helping {displayDealerName}</p>
            <p className="text-amber-100/80 mt-0.5">
              Signed in as {user?.email ?? 'unknown'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => { window.location.hash = `#/admin/dealers/${dealerId}`; }}
              className="text-amber-200 hover:text-white underline font-semibold transition-colors"
            >
              Return to dealership record
            </button>
            <button
              type="button"
              onClick={() => { window.location.hash = '#/admin/dealers'; }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-2.5 py-1 rounded text-xs transition-colors shadow-sm"
            >
              All dealerships
            </button>
          </div>
        </aside>
      )}

      <header className="bg-navy-950 text-white shadow-chrome">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="py-4 flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4 min-w-0">
                <DealerLogo dealershipId={dealerId} />
                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-bold text-base sm:text-lg tracking-tight truncate">{displayDealerName}</h1>
                  </div>
                  {!hideDealerId && !isDealerFacingRole(user?.role ?? '') && (
                    <p className="text-ink-faint text-xs font-mono truncate">{dealerId}</p>
                  )}
                  <p className="text-ink-faint text-xs mt-1 hidden sm:block">
                    {sectionLabel ?? TAB_LABELS[activeTab]}
                    <span className="text-silver-300"> · </span>
                    <span>{categorySchema.label}</span>
                  </p>
                </div>
              </div>
              <OperatorNav active={activeTab} nav={nav} />
            </div>
          </div>

          <div className="pb-3 flex items-center justify-between gap-3 flex-wrap border-t border-navy-800/80 pt-3">
            {!(isDealerFacingRole(user?.role ?? '') && (user?.dealerAccessIds.length ?? 0) <= 1) ? (
              <button
                type="button"
                onClick={nav.changeDealer}
                className="text-xs text-ink-faint hover:text-white transition-colors"
              >
                ← {operatorCopy.scope.changeAction}
              </button>
            ) : <div />}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={nav.goToReports}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-navy-800 text-white shadow-elevation-1'
                    : 'text-silver-300 hover:text-white hover:bg-navy-900/60'
                }`}
              >
                Reports
              </button>
              <button
                type="button"
                onClick={nav.goToSettings}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-navy-800 text-white shadow-elevation-1'
                    : 'text-silver-300 hover:text-white hover:bg-navy-900/60'
                }`}
              >
                Settings
              </button>

              {user && (
                <OperatorAvatar user={user} onAvatarUpdated={refresh} />
              )}
              {lastRefresh && !refreshing && (
                <span className="text-navy-500 text-xs">Updated {lastRefresh.toLocaleTimeString()}</span>
              )}
              {refreshing && <span className="text-ink-faint text-xs animate-pulse">Refreshing…</span>}
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="px-3 py-1.5 text-xs font-medium bg-navy-800 hover:bg-navy-700 text-silver-100 rounded-md transition-colors disabled:opacity-40"
                >
                  Refresh
                </button>
              )}
              {headerAction}
              {user && (
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="px-3 py-1.5 text-xs font-medium text-ink-faint hover:text-white transition-colors"
                >
                  {operatorCopy.auth.signOut}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
