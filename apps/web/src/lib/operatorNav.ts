export type OperatorTab = 'activity' | 'team' | 'home' | 'platforms' | 'reports' | 'inventory' | 'leads' | 'settings' | 'help';

import type { RowNavScope } from './rowNavScope.ts';

export type OperatorNavHandlers = {
  goToHome: () => void;
  goToPlatforms: (scope?: RowNavScope) => void;
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
  goToLeads: (scope?: RowNavScope) => void;
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
  goToKnowledge?: () => void;
  goToVehicles?: (scope?: RowNavScope) => void;
  goToChannels?: (scope?: RowNavScope) => void;
  changeDealer: () => void;
};

export const OPERATOR_TABS: Array<{ id: OperatorTab; label: string; short: string }> = [
  { id: 'activity', label: 'Activity', short: 'Activity' },
  { id: 'platforms', label: 'Channels', short: 'Channels' },
  { id: 'inventory', label: 'Vehicles', short: 'Vehicles' },
  { id: 'team', label: 'Team', short: 'Team' },
];

export type OperatorPageSegment =
  | 'activity'
  | 'team'
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
  if (!page || page === 'activity' || page === 'leads') return 'activity';
  if (page === 'team') return 'team';
  if (page === 'reports') return 'reports';
  if (page === 'inventory') return 'inventory';
  if (page === 'settings') return 'settings';
  if (page === 'help' || page === 'knowledge') return 'help';
  return 'platforms';
}
