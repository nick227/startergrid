/** Identifiable local records for the Harborline Motors (demo) acceptance lot. */

export const UX_DEALER_ID = 'dealer_ux_harborline';
export const UX_DEALER_PASSWORD = 'dev-change-me';

export const UX_PEOPLE = [
  { email: 'owner@harborline.example.com', role: 'DEALER_OWNER' as const, access: 'DEALER_OWNER' as const },
  { email: 'priya@harborline.example.com', role: 'DEALER_STAFF' as const, access: 'DEALER_STAFF' as const },
  { email: 'jordan@harborline.example.com', role: 'DEALER_STAFF' as const, access: 'DEALER_STAFF' as const },
];

export function uxDaysAgo(days: number, hour = 10): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date;
}

export type UxVehicleSpec = {
  id: string;
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  priceCents: number;
  exteriorColor: string;
  bodyStyle: string;
  listingStatus: 'READY' | 'DRAFT';
  soldAt: Date | null;
  photos: boolean;
};

export const UX_VEHICLES: UxVehicleSpec[] = [
  { id: 'veh_ux_crv', stockNumber: 'DEMO-4101', vin: '1HGUXDEM441010001', year: 2022, make: 'Honda', model: 'CR-V', trim: 'EX-L', mileage: 28440, priceCents: 2899500, exteriorColor: 'Still Night Blue', bodyStyle: 'SUV', listingStatus: 'READY', soldAt: null, photos: true },
  { id: 'veh_ux_rav4', stockNumber: 'DEMO-4102', vin: '2T3UXDEM541020002', year: 2021, make: 'Toyota', model: 'RAV4', trim: 'XLE', mileage: 41220, priceCents: 2745000, exteriorColor: 'Blueprint', bodyStyle: 'SUV', listingStatus: 'READY', soldAt: null, photos: true },
  { id: 'veh_ux_f150', stockNumber: 'DEMO-4103', vin: '1FTUXDEM441030003', year: 2020, make: 'Ford', model: 'F-150', trim: 'XLT', mileage: 54810, priceCents: 3399500, exteriorColor: 'Rapid Red', bodyStyle: 'Truck', listingStatus: 'READY', soldAt: uxDaysAgo(6, 16), photos: true },
  { id: 'veh_ux_draft', stockNumber: 'DEMO-4104', vin: '2GNUXDEM641040004', year: 2019, make: 'Chevrolet', model: 'Equinox', trim: 'LT', mileage: 67300, priceCents: 0, exteriorColor: '', bodyStyle: 'SUV', listingStatus: 'DRAFT', soldAt: null, photos: false },
];
