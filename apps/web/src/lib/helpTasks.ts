import type { OperatorTab } from './operatorNav.ts';

export const HELP_TOPICS: Record<OperatorTab, string> = {
  activity: 'app/getting-started', team: 'app/team-access',
  home: 'app/getting-started', inventory: 'inventory/inventory-readiness',
  platforms: 'app/channels', leads: 'app/lead-status', settings: 'app/team-access',
  reports: 'app/reports', help: 'app/getting-started',
};
