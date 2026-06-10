export type OperatorTab = 'platforms' | 'queue' | 'history' | 'reports' | 'inventory' | 'help';

import type { RowNavScope } from './rowNavScope.ts';

export type OperatorNavHandlers = {
  goToPlatforms: () => void;
  goToQueue: (scope?: RowNavScope) => void;
  goToHistory: (scope?: RowNavScope) => void;
  goToReports: () => void;
  goToInventory: (scope?: RowNavScope) => void;
  goToHelp: () => void;
  goToPlatformQueue: (platformSlug: string, scope?: RowNavScope) => void;
  goToPlatformHistory: (platformSlug: string, scope?: RowNavScope) => void;
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
  | 'knowledge'
  | 'admin';

export function tabFromPage(page: OperatorPageSegment | null): OperatorTab {
  if (page === 'queue') return 'queue';
  if (page === 'history') return 'history';
  if (page === 'reports') return 'reports';
  if (page === 'inventory') return 'inventory';
  if (page === 'help' || page === 'knowledge') return 'help';
  return 'platforms';
}
