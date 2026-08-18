export type OperatorTab = 'home' | 'platforms' | 'reports' | 'inventory' | 'leads' | 'settings' | 'help';

import type { RowNavScope } from './rowNavScope.ts';

export type OperatorNavHandlers = {
  goToHome: () => void;
  goToPlatforms: () => void;
  /** @deprecated Queue is retired. Direct users to Platforms or Home to see operational issues. */
  goToQueue: (scope?: RowNavScope) => void;
  /** @deprecated History is retired. Direct users to Platforms to see operational audit trails. */
  goToHistory: (scope?: RowNavScope) => void;
  goToReports: () => void;
  goToInventory: (scope?: RowNavScope) => void;
  goToInventoryItem: (
    item: {
      assetTitle?: string | null;
      assetRef?: string | null;
      stockNumber?: string | null;
      year?: number | null;
      make?: string | null;
      model?: string | null;
    },
    scope?: RowNavScope
  ) => void;
  goToLeads: () => void;
  goToSettings: () => void;
  goToHelp: () => void;
  goToPlatformDetail: (platformSlug: string, scope?: RowNavScope) => void;
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
  { id: 'home', label: 'Home', short: 'Home' },
  { id: 'inventory', label: 'Inventory', short: 'Inventory' },
  { id: 'leads', label: 'Leads', short: 'Leads' },
  { id: 'platforms', label: 'Platforms', short: 'Platforms' },
  { id: 'settings', label: 'Settings', short: 'Settings' },
];

export type OperatorPageSegment =
  | 'platforms'
  | 'queue'
  | 'history'
  | 'reports'
  | 'inventory'
  | 'leads'
  | 'settings'
  | 'help'
  | 'knowledge'
  | 'admin'
  | 'signup';

export function tabFromPage(page: OperatorPageSegment | null): OperatorTab {
  if (!page) return 'home';
  if (page === 'reports') return 'reports';
  if (page === 'inventory') return 'inventory';
  if (page === 'leads') return 'leads';
  if (page === 'settings') return 'settings';
  if (page === 'help' || page === 'knowledge') return 'help';
  return 'platforms';
}
