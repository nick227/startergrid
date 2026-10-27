export type DestinationSupportTone = 'attention' | 'offered' | 'hidden';

export type DestinationSupportInput = {
  siteEnabled: boolean;
  validation: string;
  recentFailures: number;
  blockedDealers: number;
};

export type DestinationSupport = {
  tone: DestinationSupportTone;
  status: string;
};

export function destinationSupport(input: DestinationSupportInput): DestinationSupport {
  if (!input.siteEnabled) return { tone: 'hidden', status: 'Hidden from dealerships' };
  if (input.validation === 'VALIDATION_FAILED') return { tone: 'attention', status: 'Shared credentials failed' };
  if (input.validation === 'NOT_CONFIGURED') return { tone: 'attention', status: 'Needs shared credentials' };
  if (input.validation === 'CONTRACT_MISSING') return { tone: 'attention', status: 'Not set up yet' };
  if (input.recentFailures > 0 || input.blockedDealers > 0) return { tone: 'attention', status: 'Sending problems' };
  if (input.validation === 'READY_TO_VALIDATE') return { tone: 'offered', status: 'Offered — credentials not checked' };
  return { tone: 'offered', status: 'Offered to dealerships' };
}

export function groupDestinationSupport<T extends { tone: DestinationSupportTone }>(rows: T[]): Record<DestinationSupportTone, T[]> {
  const groups: Record<DestinationSupportTone, T[]> = { attention: [], offered: [], hidden: [] };
  for (const row of rows) groups[row.tone].push(row);
  return groups;
}
