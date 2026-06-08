// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import { CategoryProvider } from '../../contexts/CategoryContext.tsx';
import { QuickDetailDrawer } from './QuickDetailDrawer.tsx';

vi.mock('../../lib/api.ts', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api.ts')>('../../lib/api.ts');
  return {
    ...actual,
    fetchVehicle: vi.fn(async (_listingId: string, _category?: string) => ({
      vehicle: {
        core: { listingId: 'v1', stockNumber: 'S1', vin: 'VIN', year: 2024, make: 'Toyota', model: 'Camry', trim: null, condition: 'USED', title: '2024 Toyota Camry' },
        commerce: { priceCents: 2500000, originalPriceCents: null, priceLastChangedAt: null, estimatedMonthlyPaymentCents: null, availabilityStatus: 'AVAILABLE', shippingPriceCents: null, estimatedArrival: null, listedAt: '2026-06-01T00:00:00.000Z' },
        location: { dealerId: 'dealer-1', dealerName: 'Seller', dealerStoreName: null, dealerCity: 'Springfield', dealerState: 'IL', dealerZip: null, dealerPhone: null, dealerWebsiteUrl: null },
        classification: { mileage: 12000, usageUnit: 'miles', unitType: null, lengthFt: null, engineHours: null, bodyStyle: null, vehicleType: null, vehicleSize: null, doorCount: null, seatCount: null, priorUse: null },
        colors: { exteriorColor: null, interiorColor: null, upholsteryMaterial: null },
        engine: { engineSize: null, engineType: null, fuelType: null, cylinders: null, horsepower: null, torque: null, transmission: null, drivetrain: null },
        efficiency: { cityMpg: null, highwayMpg: null, combinedMpg: null, mpge: null, electricRangeMiles: null, batteryCapacityKwh: null, chargingType: null },
        conditionHistory: { titleStatus: null, accidentHistory: null, ownersCount: null, serviceRecordsCount: null, openRecalls: null, inspectionCompleted: false, inspectionSummaryUrl: null, frameDamageReported: false },
        features: { highlights: [], categories: { comfort: [], technology: [], safety: [], exterior: [], performance: [], utility: [], entertainment: [], other: [] } },
        warranty: { factoryWarrantyRemaining: null, warrantyDescription: null, certifiedProgramName: null, returnPolicyDays: null, protectionPlansAvailable: false },
        media: { items: [], tour: null },
        content: { fullDescription: null, sellerNotes: null, includedItems: null, knownIssues: null },
      },
      promotion: { status: 'ACTIVE', syndicationStatus: 'LIVE', lastSyncedAt: '2026-06-01T00:00:00.000Z', primaryChannelSlug: 'marketplace_web', channels: [] },
      ctas: { primary: { action: 'INQUIRY', label: 'Send inquiry' }, secondary: [] },
    })),
  };
});

vi.mock('../vdp/MediaSection.tsx', () => ({ MediaSection: () => <div data-testid="media" /> }));
vi.mock('../vdp/AvailabilitySection.tsx', () => ({ AvailabilitySection: () => <div data-testid="availability" /> }));
vi.mock('../vdp/FulfillmentSection.tsx', () => ({ FulfillmentSection: () => <div data-testid="fulfillment" /> }));
vi.mock('./ShareListingButton.tsx', () => ({ ShareListingButton: () => <button type="button">Share</button> }));
vi.mock('../ui/FavoriteButton.tsx', () => ({ FavoriteButton: () => <button type="button">Favorite</button> }));

function render(ui: React.ReactElement) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('QuickDetailDrawer', () => {
  it('fetches and renders a quick view with a full-details link', async () => {
    const { fetchVehicle } = await import('../../lib/api.ts');

    const { el, root } = render(
      <CategoryProvider categoryId="AUTOMOTIVE" slug="automotive">
        <QuickDetailDrawer open listingId="v1" onClose={() => undefined} />
      </CategoryProvider>,
    );

    // allow async effect to resolve
    await act(async () => { await Promise.resolve(); });

    expect(fetchVehicle).toHaveBeenCalledWith('v1', 'AUTOMOTIVE');
    expect(el.textContent).toContain('2024 Toyota Camry');
    const link = el.querySelector('a[href^="#/automotive/listing/"]') as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toBe('#/automotive/listing/v1');

    act(() => root.unmount());
  });
});

