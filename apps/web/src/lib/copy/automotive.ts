/** Automotive vertical copy — v1 adapter strings */

export const automotiveCopy = {
  asset: {
    singular: 'vehicle',
    plural: 'vehicles',
    stockLabel: 'Stock #',
  },
  scope: {
    pickerTitle: 'Choose a dealership',
  },
  queue: {
    subtitle: 'Pending posts, updates, and removals across all listing sites.',
  },
} as const;

export function assetLeadLine(title: string | null, stockNumber: string | null): string {
  if (title && stockNumber) return `${title} · #${stockNumber}`;
  if (title) return title;
  if (stockNumber) return `#${stockNumber}`;
  return 'Unknown vehicle';
}
