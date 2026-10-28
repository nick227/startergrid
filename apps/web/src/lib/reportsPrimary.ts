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
  assetSingular?: string;
  assetPlural?: string;
}): ReportsPrimary {
  const singular = input.assetSingular ?? 'vehicle';
  const plural = input.assetPlural ?? 'vehicles';
  const named = (count: number) => (count === 1 ? singular : plural);
  const kind = reportsExperience(input);
  if (kind === 'empty') {
    return {
      kind,
      title: 'Reports are not set up yet',
      why: `There are no ${plural} to measure. This is missing setup, not a healthy set of listings.`,
      action: 'vehicles',
      actionLabel: `Add ${plural}`,
    };
  }
  if (input.blocked > 0) {
    return {
      kind,
      title: `${input.blocked} ${named(input.blocked)} ${input.blocked === 1 ? 'is' : 'are'} missing what a destination requires`,
      why: 'A destination you use will not take them until that is added. They can still be ready for other destinations.',
      action: 'vehicles',
      actionLabel: `Review ${plural}`,
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
      title: `${input.stale} ${named(input.stale)} sitting longer than similar stock`,
      why: 'Check price and photos before changing destinations.',
      action: 'vehicles',
      actionLabel: `Review ${plural}`,
    };
  }
  const workspace = plural.charAt(0).toUpperCase() + plural.slice(1);
  return {
    kind: 'running',
    title: 'Nothing unusual right now',
    why: `Use the lists below if you want more detail. Day-to-day work lives in ${workspace} and Channels.`,
    action: null,
  };
}
