import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';

export function buildAdminOverviewNav(): OperatorNavHandlers {
  return {
    goToHome: () => { window.location.hash = '#/admin'; },
    goToPlatforms: () => { window.location.hash = '#/admin/platforms'; },
    goToQueue: () => {},
    goToHistory: () => {},
    goToReports: () => { window.location.hash = '#/admin/dealers'; },
    goToInventory: () => { window.location.hash = '#/admin/dealers'; },
    goToInventoryItem: () => { window.location.hash = '#/admin/dealers'; },
    goToLeads: () => { window.location.hash = '#/admin/dealers'; },
    goToHelp: () => { window.location.hash = '#/admin/dealers'; },
    goToPlatformDetail: () => { window.location.hash = '#/admin/platforms'; },
    goToPlatformQueue: () => {},
    goToPlatformHistory: () => {},
    goToSync: () => {},
    goToAccounts: () => {},
    goToInsights: () => { window.location.hash = '#/admin/insights'; },
    goToKnowledge: () => {},
    changeDealer: () => { window.location.hash = '#/admin/dealers'; },
  };
}
