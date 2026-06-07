export type OperatorTab = 'platforms' | 'queue' | 'history' | 'reports' | 'inventory' | 'help';

export type OperatorNavHandlers = {
  goToPlatforms: () => void;
  goToQueue: () => void;
  goToHistory: () => void;
  goToReports: () => void;
  goToInventory: () => void;
  goToHelp: () => void;
  goToPlatformQueue: (platformSlug: string) => void;
  goToPlatformHistory: (platformSlug: string) => void;
  /** @deprecated use goToPlatforms */
  goToSync: () => void;
  /** @deprecated use Platforms drawer */
  goToAccounts: () => void;
  /** @deprecated use goToReports */
  goToInsights: () => void;
  /** @deprecated use goToHelp */
  goToKnowledge: () => void;
  changeDealer: () => void;
};

export const OPERATOR_TABS: Array<{ id: OperatorTab; label: string; short: string }> = [
  { id: 'platforms', label: 'Platforms', short: 'Platforms' },
  { id: 'queue', label: 'Queue', short: 'Queue' },
  { id: 'history', label: 'History', short: 'History' },
  { id: 'reports', label: 'Reports', short: 'Reports' },
  { id: 'inventory', label: 'Inventory', short: 'Inventory' },
  { id: 'help', label: 'Help', short: 'Help' },
];

export type OperatorPageSegment =
  | 'platforms'
  | 'queue'
  | 'history'
  | 'reports'
  | 'inventory'
  | 'help'
  | 'knowledge';

export function tabFromPage(page: OperatorPageSegment | null): OperatorTab {
  if (page === 'queue') return 'queue';
  if (page === 'history') return 'history';
  if (page === 'reports') return 'reports';
  if (page === 'inventory') return 'inventory';
  if (page === 'help' || page === 'knowledge') return 'help';
  return 'platforms';
}
