import { OPERATOR_TABS, type OperatorTab, type OperatorNavHandlers } from '../../lib/operatorNav.ts';

type Props = {
  active: OperatorTab;
  nav: OperatorNavHandlers;
};

export function OperatorNav({ active, nav }: Props) {
  const handlers: Record<OperatorTab, () => void> = {
    home: nav.goToHome,
    platforms: nav.goToPlatforms,
    queue: nav.goToQueue,
    history: nav.goToHistory,
    reports: nav.goToReports,
    inventory: nav.goToInventory,
    help: nav.goToHelp,
  };

  return (
    <nav className="flex flex-wrap items-center gap-1 p-1 bg-navy-800/60 rounded-xl" aria-label="Main">
      {OPERATOR_TABS.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={handlers[tab.id]}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              isActive
                ? 'bg-white text-ink-heading shadow-elevation-1'
                : 'text-silver-200 hover:text-white hover:bg-navy-700/50'
            }`}
          >
            {tab.short}
          </button>
        );
      })}
    </nav>
  );
}
