import type { ContentPackage, DistributionContext } from './types.js';

export type VehicleInput = {
  id: string;
  vin?: string | null;
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  priceCents: number;
  condition: string;
  mileage: number;
  exteriorColor: string;
  stockNumber: string;
  media?: Array<{ url: string; sortOrder: number }>;
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatMileage(miles: number): string {
  return `${miles.toLocaleString('en-US')} mi`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export const ContentPackageBuilder = {
  fromVehicle(vehicle: VehicleInput, context: DistributionContext): ContentPackage {
    const condition = capitalize(vehicle.condition);
    const trim = vehicle.trim ? ` ${vehicle.trim}` : '';
    const headline = `${vehicle.year} ${vehicle.make} ${vehicle.model}${trim}`;
    const price = formatPrice(vehicle.priceCents);
    const mileage = formatMileage(vehicle.mileage);

    const body = [
      `🚗 ${condition} ${headline}`,
      `💰 ${price}  •  ${mileage}  •  ${vehicle.exteriorColor}`,
      '',
      'Tap the link to see full details, photos, and financing options.',
    ].join('\n');

    const summary = `${condition} ${headline} — ${price}`;

    const sortedMedia = vehicle.media
      ? [...vehicle.media].sort((a, b) => a.sortOrder - b.sortOrder)
      : [];
    const imageUrls = sortedMedia.map(m => m.url);

    const link = `${context.listingBaseUrl}/vehicles/${vehicle.stockNumber}`;

    return {
      objectType: 'VEHICLE',
      objectId: vehicle.id,
      headline,
      body,
      summary,
      imageUrls,
      link,
      price: vehicle.priceCents,
      structuredData: {
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim ?? null,
        condition: vehicle.condition,
        mileage: vehicle.mileage,
        exteriorColor: vehicle.exteriorColor,
        stockNumber: vehicle.stockNumber,
        vin: vehicle.vin ?? null,
      },
      tags: [vehicle.make, vehicle.model, condition, 'automotive'],
    };
  },
};
