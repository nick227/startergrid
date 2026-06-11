import { OperatorNav } from './OperatorNav.tsx';
import type { OperatorTab, OperatorNavHandlers } from '../../lib/operatorNav.ts';
import { OPERATOR_TABS } from '../../lib/operatorNav.ts';
import { operatorCopy } from '../../lib/copy/operator.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { useAdminView } from '@/contexts/AdminViewContext.tsx';

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
  home: 'Overview',
  platforms: 'Platforms',
  queue: 'Queue',
  history: 'History',
  reports: 'Reports',
  inventory: 'Inventory',
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
  const { user, logout } = useAuth();
  const categorySchema = useCategorySchema();
  const isAdminView = useAdminView();

  if (isAdminView) {
    const tabHandlers: Record<OperatorTab, () => void> = {
      home: nav.goToHome,
      platforms: nav.goToPlatforms,
      queue: () => nav.goToQueue(),
      history: () => nav.goToHistory(),
      reports: nav.goToReports,
      inventory: () => nav.goToInventory(),
      help: nav.goToHelp,
    };
    return (
      <div className={footerPad ? 'pb-20' : ''}>
        <div className="flex items-center justify-between gap-4 py-3 border-b border-silver-200">
          <div className="flex items-center gap-3 min-w-0">
            {dealerName ? (
              <span className="text-sm font-semibold text-ink-heading truncate">{dealerName}</span>
            ) : (
              <div className="h-4 w-32 bg-silver-200 rounded animate-pulse" />
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

  return (
    <div className={`min-h-screen bg-surface-page ${footerPad ? 'pb-20' : ''}`}>
      <header className="bg-navy-950 text-white sticky top-0 z-30 shadow-chrome">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="py-4 flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-navy-800 to-navy-700 flex items-center justify-center text-lg shrink-0 shadow-elevation-1">
                  📡
                </div>
                <div className="min-w-0">
                  {dealerName ? (
                    <h1 className="font-bold text-base sm:text-lg tracking-tight truncate">{dealerName}</h1>
                  ) : (
                    <div className="h-5 w-40 bg-navy-800 rounded-md animate-pulse" />
                  )}
                  {!hideDealerId && (
                    <p className="text-ink-faint text-xs font-mono mt-0.5 truncate">{dealerId}</p>
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
            <button
              type="button"
              onClick={nav.changeDealer}
              className="text-xs text-ink-faint hover:text-white transition-colors"
            >
              ← {operatorCopy.scope.changeAction}
            </button>
            <div className="flex items-center gap-2">
              {user && (
                <span className="text-ink-faint text-xs hidden sm:inline truncate max-w-[12rem]">{user.email}</span>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
