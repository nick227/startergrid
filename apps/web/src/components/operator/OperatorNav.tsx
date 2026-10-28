import { workspaceHash } from '@/lib/routes.ts';
import { OPERATOR_TABS, type OperatorTab, type OperatorNavHandlers } from '../../lib/operatorNav.ts';

type Props = {
  active: OperatorTab;
  nav: OperatorNavHandlers;
};

export function OperatorNav({ active, nav }: Props) {
  const handlers: Record<OperatorTab, () => void> = {
    activity: nav.goToHome,
    team: () => { const id = window.location.hash.split('/')[1]; window.location.hash = workspaceHash(id, 'team'); },
    home: nav.goToHome,
    platforms: nav.goToPlatforms,
    reports: nav.goToReports,
    inventory: () => nav.goToInventory(),
    leads: nav.goToLeads,
    settings: nav.goToSettings,
    help: nav.goToHelp,
  };

  return (
    <nav className="flex flex-nowrap items-center gap-1 rounded-xl bg-navy-800/60 p-1 sm:flex-wrap" aria-label="Main">
      {OPERATOR_TABS.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={handlers[tab.id]}
            aria-current={isActive ? 'page' : undefined}
            className={`min-h-11 flex-1 whitespace-nowrap rounded-lg px-2 text-sm font-semibold transition-all sm:flex-none sm:px-3 sm:py-2 sm:text-xs ${
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
