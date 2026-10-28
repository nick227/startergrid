import { reportsExperience, type PageExperience } from './pagePrimaryState.ts';

export type ReportsPrimaryAction = 'vehicles' | 'channels';

export type ReportsPrimary = {
  kind: PageExperience;
  title: string;
  why: string;
  action: ReportsPrimaryAction | null;
  actionLabel?: string;
};

export function reportsPrimary(input: {
  vehicleTotal: number;
  blocked: number;
  failedSends: number;
  stale: number;
}): ReportsPrimary {
  const kind = reportsExperience(input);
  if (kind === 'empty') {
    return {
      kind,
      title: 'Reports are not set up yet',
      why: 'There are no vehicles to measure. This is missing setup, not a healthy set of listings.',
      action: 'vehicles',
      actionLabel: 'Add vehicles',
    };
  }
  if (input.blocked > 0) {
    return {
      kind,
      title: `${input.blocked} vehicle${input.blocked === 1 ? '' : 's'} cannot be listed`,
      why: 'Usually a missing price or photos. Destinations cannot receive an incomplete listing.',
      action: 'vehicles',
      actionLabel: 'Review vehicles',
    };
  }
  if (input.failedSends > 0) {
    return {
      kind,
      title: 'A destination did not receive updates',
      why: 'Listings may look stale there until this is fixed.',
      action: 'channels',
      actionLabel: 'Open channels',
    };
  }
  if (input.stale > 0) {
    return {
      kind: 'running',
      title: `${input.stale} vehicle${input.stale === 1 ? '' : 's'} sitting longer than similar stock`,
      why: 'Check price and photos before changing destinations.',
      action: 'vehicles',
      actionLabel: 'Review vehicles',
    };
  }
  return {
    kind: 'running',
    title: 'Nothing unusual right now',
    why: 'Use the lists below if you want more detail. Day-to-day work lives in Vehicles and Channels.',
    action: null,
  };
}
