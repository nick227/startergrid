import { OPERATOR_TABS, type OperatorTab, type OperatorNavHandlers } from '../../lib/operatorNav.ts';

type Props = {
  active: OperatorTab;
  nav: OperatorNavHandlers;
};

export function OperatorNav({ active, nav }: Props) {
  const handlers: Record<OperatorTab, () => void> = {
    sync: nav.goToSync,
    inventory: nav.goToInventory,
    accounts: nav.goToAccounts,
    insights: nav.goToInsights,
  };

  return (
    <nav className="flex items-center gap-1 p-1 bg-slate-800/60 rounded-xl" aria-label="Operator sections">
      {OPERATOR_TABS.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={handlers[tab.id]}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              isActive
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {tab.short}
          </button>
        );
      })}
    </nav>
  );
}
