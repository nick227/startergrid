export type OperatorTab = 'sync' | 'inventory' | 'accounts' | 'insights';

export type OperatorNavHandlers = {
  goToSync: () => void;
  goToInventory: () => void;
  goToAccounts: () => void;
  goToInsights: () => void;
  goToKnowledge: () => void;
  changeDealer: () => void;
};

export const OPERATOR_TABS: Array<{ id: OperatorTab; label: string; short: string }> = [
  { id: 'sync', label: 'Sync', short: 'Sync' },
  { id: 'inventory', label: 'Inventory', short: 'Inventory' },
  { id: 'accounts', label: 'Accounts', short: 'Accounts' },
  { id: 'insights', label: 'Insights', short: 'Insights' },
];

export function tabFromPage(page: string | null): OperatorTab {
  if (page === 'inventory') return 'inventory';
  if (page === 'accounts') return 'accounts';
  if (page === 'insights') return 'insights';
  if (page === 'knowledge') return 'sync';
  return 'sync';
}
