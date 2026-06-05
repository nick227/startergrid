export type OperatorTab = 'sync' | 'inventory' | 'accounts';

export type OperatorNavHandlers = {
  goToSync: () => void;
  goToInventory: () => void;
  goToAccounts: () => void;
  goToKnowledge: () => void;
  changeDealer: () => void;
};

export const OPERATOR_TABS: Array<{ id: OperatorTab; label: string; short: string }> = [
  { id: 'sync', label: 'Sync', short: 'Sync' },
  { id: 'inventory', label: 'Inventory', short: 'Inventory' },
  { id: 'accounts', label: 'Accounts', short: 'Accounts' },
];

export function tabFromPage(page: string | null): OperatorTab {
  if (page === 'inventory') return 'inventory';
  if (page === 'accounts') return 'accounts';
  if (page === 'knowledge') return 'sync';
  return 'sync';
}
