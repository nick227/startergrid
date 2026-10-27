import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SyndicationSentryCard } from '@/components/platforms/SyndicationSentryCard.tsx';
import { InventorySummaryStrip } from '@/components/inventory/InventorySummaryStrip.tsx';
import { WindowStickerModal } from '@/components/inventory/WindowStickerModal.tsx';
import { LeadCrmHandoffModal } from '@/components/leads/LeadCrmHandoffModal.tsx';
import type { VehicleDetailDto } from '@/lib/api/sdk.ts';

let root: Root | undefined;
function render(node: ReactNode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(node));
}
function cleanup() {
  if (root) act(() => root!.unmount());
  root = undefined;
  document.body.innerHTML = '';
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Commercial Feature 1: Ghost Listing Audit (Sold Vehicle Take-Down)', () => {
  it('uses plain dealership language and avoids jargon like Sentry, ghost listing, tombstone, purge', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/distribution/sentry')) {
        return {
          ok: true,
          json: async () => ({
            dealershipId: 'd1',
            status: 'GHOST_LISTINGS_DETECTED',
            auditedCount: 15,
            activeGhostListingsCount: 1,
            verifiedLiveCount: 10,
            channelsAudited: ['auto_marketplace', 'cargurus'],
            lastAuditedAt: new Date().toISOString(),
            summary: '1 sold vehicle may still be advertised',
            ghostListings: [
              {
                id: 'ghost-1',
                source: 'MARKETPLACE_LISTING',
                dealershipId: 'd1',
                vehicleId: 'v1',
                categoryItemId: null,
                stockNumber: 'STK100',
                title: '2022 Ford F-150 XLT',
                channel: 'cargurus',
                channelDisplayName: 'CarGurus',
                status: 'ACTIVE',
                soldAt: '2026-10-25T10:00:00Z',
                removedAt: null,
                inactiveSince: '2026-10-25T10:00:00Z',
                exposureDays: 2,
                ftcComplianceRisk: 'HIGH',
                nextAction: 'Remove from CarGurus portal or trigger delist',
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(<SyndicationSentryCard dealerId="d1" hideWhenClean={false} />);

    await screen.findByText('1 sold vehicle may still be advertised');
    expect(screen.getByText('Removal needed')).toBeTruthy();
    expect(screen.getByText('Request removal')).toBeTruthy();

    const fullHtml = document.body.innerHTML.toLowerCase();
    expect(fullHtml).not.toContain('sentry');
    expect(fullHtml).not.toContain('ghost listing');
    expect(fullHtml).not.toContain('tombstone');
    expect(fullHtml).not.toContain('purge');
  });

  it('clearly distinguishes removal request from verified removal on submission', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            dealershipId: 'd1',
            status: 'NEEDS_ACTION',
            reconciledCount: 0,
            marketplaceListingsEnded: 0,
            distributionTargetsWithdrawn: 0,
            remaining: [],
            message: 'Removal requested on CarGurus. Awaiting channel confirmation.',
            reconciledAt: new Date().toISOString(),
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          dealershipId: 'd1',
          status: 'GHOST_LISTINGS_DETECTED',
          auditedCount: 5,
          activeGhostListingsCount: 1,
          verifiedLiveCount: 4,
          channelsAudited: ['cargurus'],
          lastAuditedAt: new Date().toISOString(),
          summary: '1 sold vehicle may still be advertised',
          ghostListings: [
            {
              id: 'g1',
              source: 'DISTRIBUTION_TARGET',
              dealershipId: 'd1',
              vehicleId: 'v1',
              categoryItemId: null,
              stockNumber: '1234',
              title: '2021 Honda Civic',
              channel: 'cargurus',
              channelDisplayName: 'CarGurus',
              status: 'ACTIVE',
              soldAt: '2026-10-20T00:00:00Z',
              removedAt: null,
              inactiveSince: '2026-10-20T00:00:00Z',
              exposureDays: 7,
              ftcComplianceRisk: 'HIGH',
              nextAction: 'Awaiting channel removal',
            },
          ],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<SyndicationSentryCard dealerId="d1" hideWhenClean={false} />);
    const btn = await screen.findByText('Request removal');
    fireEvent.click(btn);

    await screen.findByText(/Removal requested: Submitted removal to connected channels/);
  });
});

describe('Commercial Feature 2: Inventory Aging & Repricing', () => {
  it('integrates aging filter chip into InventorySummaryStrip without permanent clutter', () => {
    const onFilterChange = vi.fn();
    render(
      <InventorySummaryStrip
        counts={{ active: 20, ready: 15, needsPhotos: 3, queued: 0, blocked: 2, aging: 4 }}
        activeFilter="All"
        onFilterChange={onFilterChange}
      />
    );

    const agingChip = screen.getByText('Aging 4');
    expect(agingChip).toBeTruthy();
    fireEvent.click(agingChip);
    expect(onFilterChange).toHaveBeenCalledWith('Aging');
  });
});

describe('Commercial Feature 3: Window Sticker & Buyers Guide', () => {
  const dummyVehicle: VehicleDetailDto = {
    id: 'veh-1',
    dealershipId: 'd1',
    businessCategory: 'AUTOMOTIVE',
    vin: '1HGCR2F83HA000000',
    stockNumber: '24001',
    year: 2021,
    make: 'Honda',
    model: 'Accord',
    trim: 'Sport 2.0T',
    mileage: 34500,
    priceCents: 2699500,
    costCents: null,
    condition: 'Used',
    status: 'ACTIVE',
    readinessStatus: 'READY',
    listingStatus: 'READY',
    publishedToMarketplace: true,
    lotLocation: null,
    exteriorColor: 'San Marino Red',
    interiorColor: 'Black Cloth',
    bodyStyle: 'Sedan',
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    engine: '2.0L Turbo',
    doors: 4,
    drivetrain: 'FWD',
    description: 'Clean title one-owner Accord Sport',
    features: ['Apple CarPlay', 'Heated Seats', 'Backup Camera'],
    options: [],
    installedAccessories: [],
    customFields: {},
    lifecycleState: 'IN_STOCK',
    readiness: {
      status: 'READY',
      missingRequiredMediaSlots: [],
      missingRecommendedMediaSlots: [],
      missingFields: [],
      invalidFields: [],
      warnings: [],
      nextAction: null,
    },
    media: [],
    distribution: {
      liveCount: 1,
      queuedCount: 0,
      failedCount: 0,
      blockedCount: 0,
      nextAction: null,
      channelBreakdown: [],
    },
    inventoryDistribution: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('renders separate Window Sticker and Buyers Guide document choices without false compliance claims', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: 'd1',
        legalName: 'Apex Motor Group',
        dbaName: 'Apex Honda',
        websiteUrl: 'https://apexhonda.local',
        rooftopAddress: { street: '100 Main St', city: 'Dallas', state: 'TX', postalCode: '75001' },
        primaryContact: { phone: '(214) 555-0199' },
      }),
    })));

    render(
      <WindowStickerModal
        vehicle={dummyVehicle}
        dealerId="d1"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    // Document tabs
    await screen.findByText('Window Sticker');
    expect(screen.getByText('Buyers Guide')).toBeTruthy();
    expect(screen.getByText('🖨️ Print Document')).toBeTruthy();

    // Sticker shows vehicle and dealer info, but does NOT claim "Official"
    expect(screen.getByText('Vehicle Window Sticker')).toBeTruthy();
    expect(document.body.innerHTML).not.toContain('Official Window Sticker');

    // Switch to Buyers Guide
    act(() => {
      fireEvent.click(screen.getByText('Buyers Guide'));
    });
    expect(await screen.findByText(/Verify warranty disclosures against your state regulations/)).toBeTruthy();
    expect(screen.getByText('Lot display notice:')).toBeTruthy();
    expect(screen.getByText('AS IS - NO DEALER WARRANTY')).toBeTruthy();
    expect(screen.getByText('DEALER WARRANTY')).toBeTruthy();
  });
});

describe('Commercial Feature 4: Lead CRM Handoff Modal', () => {
  it('distinguishes transmission acceptance from confirmed CRM import and provides clear next action', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/delivery')) {
        return {
          ok: true,
          json: async () => ({
            leadId: 'lead-1',
            deliveryStatus: 'SENT_TO_CRM_ADDRESS',
            canSend: true,
            sendBlocker: null,
            sendBlockerMessage: null,
            crmEndpoint: 'leads@vinsolutions.test',
            adfXmlPayload: '<adf><prospect><customer><contact><name>John Doe</name></contact></customer></prospect></adf>',
            attempts: [
              {
                id: 'att-1',
                leadId: 'lead-1',
                destinationAddress: 'leads@vinsolutions.test',
                status: 'SENT',
                errorMessage: null,
                attemptCount: 1,
                lastAttemptAt: '2026-10-27T00:00:00Z',
                deliveredAt: '2026-10-27T00:00:00Z',
                createdAt: '2026-10-27T00:00:00Z',
              },
            ],
            customer: {
              name: 'John Doe',
              email: 'john@example.com',
              phone: '555-123-4567',
            },
            vehicle: {
              stockNumber: '24001',
              year: 2021,
              make: 'Honda',
              model: 'Accord',
              vin: '1HGCR2F83HA000000',
            },
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(
      <LeadCrmHandoffModal
        dealershipId="d1"
        leadId="lead-1"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const matches = await screen.findAllByText('Transmission accepted by mail server');
    expect(matches.length).toBeGreaterThan(0);
    // Notice distinction: confirms mail server handoff, does NOT claim verified CRM import
    expect(screen.getByText(/StarterGrid confirmed transmission handoff, but cannot verify whether your external CRM imported it/)).toBeTruthy();
    // Next action
    expect(screen.getByText(/Check your CRM inbox or activity log to confirm that your CRM imported this lead/)).toBeTruthy();

    // Advanced details contains raw XML and download XML
    expect(screen.getByText(/Advanced: Raw ADF\/XML 1.0 & send history/)).toBeTruthy();
    expect(screen.getByText('Copy raw XML')).toBeTruthy();
    expect(screen.getByText('Download .xml')).toBeTruthy();
  });
});
