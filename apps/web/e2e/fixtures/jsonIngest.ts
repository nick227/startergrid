/** Minimal vehicle row for snapshot dry-run E2E against demo dealer PRM-24001. */
export const snapshotDryRunPayload = {
  vehicles: [
    {
      stockNumber: 'PRM-24001',
      vin: '1HGCV1F30JA000001',
      year: 2021,
      make: 'Honda',
      model: 'Accord',
      trim: 'EX-L',
      mileage: 37240,
      priceCents: 2399500,
      condition: 'USED',
      exteriorColor: 'Platinum White Pearl',
    },
  ],
};

export function snapshotDryRunJson(): string {
  return JSON.stringify(snapshotDryRunPayload, null, 2);
}
