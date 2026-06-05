import { OperatorNav } from './OperatorNav.tsx';
import { WorkflowStrip } from './WorkflowStrip.tsx';
import type { OperatorTab, OperatorNavHandlers } from '../../lib/operatorNav.ts';

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
  const tabTitles: Record<OperatorTab, string> = {
    sync: 'Sync',
    inventory: 'Inventory',
    accounts: 'Platform Accounts',
  };

  return (
    <div className={`min-h-screen bg-[#f4f6f8] ${footerPad ? 'pb-20' : ''}`}>
      <header className="bg-slate-950 text-white sticky top-0 z-30 shadow-lg shadow-slate-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-lg shrink-0 shadow-md">
                📡
              </div>
              <div className="min-w-0">
                {dealerName ? (
                  <h1 className="font-bold text-base sm:text-lg tracking-tight truncate">{dealerName}</h1>
                ) : (
                  <div className="h-5 w-40 bg-slate-800 rounded-lg animate-pulse" />
                )}
                {!hideDealerId && (
                  <p className="text-slate-500 text-xs font-mono mt-0.5 truncate">{dealerId}</p>
                )}
                <p className="text-slate-400 text-xs mt-1 hidden sm:block">{sectionLabel ?? tabTitles[activeTab]}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <WorkflowStrip active={activeTab} />
              <OperatorNav active={activeTab} nav={nav} />
            </div>
          </div>

          <div className="pb-3 flex items-center justify-between gap-3 flex-wrap border-t border-slate-800/80 pt-3">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={nav.changeDealer}
                className="text-xs text-slate-500 hover:text-white transition-colors"
              >
                ← Change dealer
              </button>
              <button
                type="button"
                onClick={nav.goToKnowledge}
                className="text-xs text-slate-500 hover:text-white transition-colors"
              >
                Knowledge base
              </button>
            </div>
            <div className="flex items-center gap-2">
              {lastRefresh && !refreshing && (
                <span className="text-slate-600 text-xs">Updated {lastRefresh.toLocaleTimeString()}</span>
              )}
              {refreshing && <span className="text-slate-500 text-xs animate-pulse">Refreshing…</span>}
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors disabled:opacity-40"
                >
                  Refresh
                </button>
              )}
              {headerAction}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
