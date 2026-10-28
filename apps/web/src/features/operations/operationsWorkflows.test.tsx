import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DealerAttentionSection } from '@/components/home/DealerAttentionSection.tsx';
import { BulkEditModal } from '@/components/inventory/BulkEditModal.tsx';
import type { AttentionResponse } from '@/lib/api/attentionApi.ts';
import type { PrintableVehicle } from '@/components/inventory/WindowStickerModal.tsx';
import * as bulkEditApi from '@/lib/api/bulkEditApi.ts';
import { parseOperatorRoute } from '@/lib/routes.ts';
import LeadsPage from '@/pages/LeadsPage.tsx';
import { AuthProvider } from '@/contexts/AuthContext.tsx';
import { CategoryProvider } from '@/contexts/CategoryContext.tsx';
import { DocReaderProvider } from '@/components/docs/DocReaderContext.tsx';
import { automotiveSchema } from '@auto-dealer/category-schemas';

let root: Root | undefined;
function render(node: ReactNode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <AuthProvider>
        <CategoryProvider schema={automotiveSchema}>
          <DocReaderProvider>{node}</DocReaderProvider>
        </CategoryProvider>
      </AuthProvider>
    );
  });
}
function cleanup() {
  if (root) {
    act(() => {
      root!.unmount();
    });
  }
  root = undefined;
  document.body.innerHTML = '';
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mockNav = {
  goToHome: vi.fn(),
  goToPlatforms: vi.fn(),
  goToQueue: vi.fn(),
  goToHistory: vi.fn(),
  goToReports: vi.fn(),
  goToInventory: vi.fn(),
  goToInventoryItem: vi.fn(),
  goToLeads: vi.fn(),
  goToSettings: vi.fn(),
  goToHelp: vi.fn(),
  goToPlatformDetail: vi.fn(),
  goToPlatformQueue: vi.fn(),
  goToPlatformHistory: vi.fn(),
  goToSync: vi.fn(),
  goToAccounts: vi.fn(),
  goToInsights: vi.fn(),
  changeDealer: vi.fn(),
};

describe('Attention List Interface: DealerAttentionSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseAttention: AttentionResponse = {
    dealershipId: 'dealer-123',
    generatedAt: '2026-10-27T10:00:00Z',
    counts: { total: 3, blocking: 1, dealershipActions: 2, waiting: 1 },
    items: [
      {
        key: 'vehicles-fix',
        area: 'VEHICLES',
        kind: 'VEHICLE_INFORMATION_MISSING',
        severity: 'BLOCKING',
        owner: 'DEALERSHIP',
        ownerId: null,
        count: 2,
        summary: '2 vehicles cannot be published due to missing information',
        nextAction: 'Set listing price and verify required fields',
        action: {
          kind: 'FIX_VEHICLES',
          enabled: true,
          disabledReason: null,
          channel: null,
        },
        records: [
          { type: 'VEHICLE', id: 'v1', label: '2022 Honda Civic', detail: 'Missing price', channel: null, vehicleId: 'v1' },
          { type: 'VEHICLE', id: 'v2', label: '2021 Toyota RAV4', detail: 'Missing trim', channel: null, vehicleId: 'v2' },
        ],
      },
      {
        key: 'crm-delivery-failed',
        area: 'LEADS',
        kind: 'CRM_DELIVERY_FAILED',
        severity: 'WARNING',
        owner: 'DEALERSHIP',
        ownerId: null,
        count: 1,
        summary: 'Lead delivery to CRM failed for John Doe',
        nextAction: 'Verify dealership CRM address or retry delivery',
        action: {
          kind: 'RETRY_CRM_DELIVERY',
          enabled: false,
          disabledReason: 'No CRM delivery address configured in Settings',
          channel: null,
        },
        records: [
          { type: 'LEAD', id: 'l1', label: 'John Doe', detail: 'SMTP timeout', channel: null, vehicleId: null },
        ],
      },
      {
        key: 'channel-review',
        area: 'CHANNELS',
        kind: 'CHANNEL_SETUP_INCOMPLETE',
        severity: 'WAITING',
        owner: 'PARTNER',
        ownerId: null,
        count: 1,
        summary: 'CarGurus partner account approval in progress',
        nextAction: 'CarGurus review takes approximately 1-2 business days',
        action: {
          kind: 'NONE',
          enabled: false,
          disabledReason: null,
          channel: 'cargurus',
        },
        records: [],
      },
    ],
    unavailableAreas: [],
  };

  it('renders blocking and warning attention items with proper severity indicators', () => {
    render(<DealerAttentionSection dealerId="dealer-123" attention={baseAttention} nav={mockNav} posture="attention" />);

    expect(screen.getByText('Needs Attention')).toBeTruthy();
    expect(screen.getByText(/1 blocking/)).toBeTruthy();
    expect(screen.getByText('2 vehicles cannot be published due to missing information')).toBeTruthy();
    expect(screen.getByText('Lead delivery to CRM failed for John Doe')).toBeTruthy();
  });

  it('routes action buttons according to action.kind and lands on affected records with filters and IDs', () => {
    render(<DealerAttentionSection dealerId="dealer-123" attention={baseAttention} nav={mockNav} posture="attention" />);

    // Compact target preview is displayed on Home
    expect(screen.getByText(/2022 Honda Civic, 2021 Toyota RAV4/)).toBeTruthy();

    const fixBtn = screen.getByRole('button', { name: 'Review vehicles' });
    act(() => {
      fireEvent.click(fixBtn);
    });
    expect(mockNav.goToInventory).toHaveBeenCalledWith({
      filter: 'Blocked',
      ids: ['v1', 'v2'],
    });
  });

  it('routes lead attention actions directly to the targeted lead ID', () => {
    const leadAttention: AttentionResponse = {
      ...baseAttention,
      items: [
        {
          key: 'crm-delivery-failed',
          area: 'LEADS',
          kind: 'CRM_DELIVERY_FAILED',
          severity: 'WARNING',
          owner: 'DEALERSHIP',
          ownerId: null,
          count: 1,
          summary: 'Lead delivery to CRM failed for John Doe',
          nextAction: 'Retry delivery or export ADF/XML',
          action: {
            kind: 'RETRY_CRM_DELIVERY',
            enabled: true,
            disabledReason: null,
            channel: null,
          },
          records: [
            { type: 'LEAD', id: 'l1', label: 'John Doe', detail: 'SMTP timeout', channel: null, vehicleId: null },
          ],
        },
      ],
    };

    render(<DealerAttentionSection dealerId="dealer-123" attention={leadAttention} nav={mockNav} posture="attention" />);

    const retryBtn = screen.getByRole('button', { name: 'Review leads & retry' });
    act(() => {
      fireEvent.click(retryBtn);
    });
    expect(mockNav.goToLeads).toHaveBeenCalledWith({
      leadId: 'l1',
    });
  });

  it('respects action.enabled: false and displays the disabledReason without clickable action', () => {
    render(<DealerAttentionSection dealerId="dealer-123" attention={baseAttention} nav={mockNav} posture="attention" />);

    expect(screen.getByText(/No CRM delivery address configured in Settings/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Review leads & retry' })).toBeNull();
  });

  it('expands and collapses affected records', () => {
    render(<DealerAttentionSection dealerId="dealer-123" attention={baseAttention} nav={mockNav} posture="attention" />);

    expect(screen.queryByText('2022 Honda Civic')).toBeNull();
    const viewRecordsBtn = screen.getByRole('button', { name: 'View records (2)' });
    act(() => {
      fireEvent.click(viewRecordsBtn);
    });

    expect(screen.getByText('2022 Honda Civic')).toBeTruthy();
    expect(screen.getByText('Missing price')).toBeTruthy();
    expect(screen.getByText('2021 Toyota RAV4')).toBeTruthy();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Hide records' }));
    });
    expect(screen.queryByText('2022 Honda Civic')).toBeNull();
  });

  it('keeps WAITING items collapsed under secondary section', () => {
    render(<DealerAttentionSection dealerId="dealer-123" attention={baseAttention} nav={mockNav} posture="attention" />);

    expect(screen.getByText(/Waiting on external actions/)).toBeTruthy();
    expect(screen.queryByText('CarGurus partner account approval in progress')).toBeNull();

    act(() => {
      fireEvent.click(screen.getByText(/Waiting on external actions/));
    });
    expect(screen.getByText('CarGurus partner account approval in progress')).toBeTruthy();
    expect(screen.getByText('Channel Partner')).toBeTruthy();
  });

  it('displays warning when unavailableAreas is non-empty and does not claim all clean', () => {
    const incompleteAttention: AttentionResponse = {
      ...baseAttention,
      items: [],
      unavailableAreas: ['VEHICLES'],
    };

    render(<DealerAttentionSection dealerId="dealer-123" attention={incompleteAttention} nav={mockNav} posture="attention" />);

    expect(screen.getByText(/Partial status inspection/)).toBeTruthy();
    expect(screen.getByText(/Could not check records for VEHICLES/)).toBeTruthy();
    expect(screen.queryByText(/All clear/i)).toBeNull();
  });
});

describe('Bulk Vehicle Correction Interface: BulkEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleVehicles: PrintableVehicle[] = [
    {
      id: 'veh-1',
      vin: '1HGCR2F83HA000001',
      stockNumber: '1001',
      year: 2022,
      make: 'Honda',
      model: 'Accord',
      trim: 'Sport',
      mileage: 28000,
      priceCents: 2600000,
      condition: 'USED',
      exteriorColor: 'White',
    },
    {
      id: 'veh-2',
      vin: '4T1B11HK5JU000002',
      stockNumber: '1002',
      year: 2021,
      make: 'Toyota',
      model: 'Camry',
      trim: 'LE',
      mileage: 41000,
      priceCents: 2350000,
      condition: 'USED',
      exteriorColor: 'Blue',
    },
  ];

  it('runs previewBulkEdit and displays changes diff table per vehicle', async () => {
    vi.spyOn(bulkEditApi, 'previewBulkEdit').mockResolvedValueOnce({
      counts: { WILL_CHANGE: 2, NO_CHANGE: 0, REJECTED: 0 },
      rows: [
        {
          vehicleId: 'veh-1',
          stockNumber: '1001',
          label: '2022 Honda Accord',
          status: 'WILL_CHANGE',
          changes: [{ field: 'priceCents', from: 2600000, to: 2499500 }],
          reason: null,
          incidentId: null,
          updatedAt: '2026-10-27T08:00:00Z',
        },
        {
          vehicleId: 'veh-2',
          stockNumber: '1002',
          label: '2021 Toyota Camry',
          status: 'WILL_CHANGE',
          changes: [{ field: 'priceCents', from: 2350000, to: 2499500 }],
          reason: null,
          incidentId: null,
          updatedAt: '2026-10-27T08:05:00Z',
        },
      ],
    });

    render(
      <BulkEditModal
        dealerId="dealer-123"
        isOpen={true}
        onClose={vi.fn()}
        vehicles={sampleVehicles}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Bulk Vehicle Correction \(2 Vehicles Selected\)/)).toBeTruthy();

    // Select listing price
    const priceCheckbox = screen.getByLabelText(/Listing Price/);
    act(() => {
      fireEvent.click(priceCheckbox);
    });

    const priceInput = screen.getByPlaceholderText('e.g. 24,995');
    act(() => {
      fireEvent.change(priceInput, { target: { value: '24995' } });
    });

    // Click preview
    const previewBtn = screen.getByRole('button', { name: /Preview Changes/ });
    await act(async () => {
      fireEvent.click(previewBtn);
    });

    expect(bulkEditApi.previewBulkEdit).toHaveBeenCalledWith('dealer-123', [
      { vehicleId: 'veh-1', fields: { priceCents: 2499500 } },
      { vehicleId: 'veh-2', fields: { priceCents: 2499500 } },
    ]);

    await waitFor(() => {
      expect(screen.getByText(/2 will update/)).toBeTruthy();
      expect(screen.getByText(/2022 Honda Accord/)).toBeTruthy();
      expect(screen.getByText(/\$26,000/)).toBeTruthy();
      expect(screen.getAllByText(/\$24,995/).length).toBe(2);
    });
  });

  it('applies edits with expectedUpdatedAt and provides safe batch undo', async () => {
    vi.spyOn(bulkEditApi, 'previewBulkEdit').mockResolvedValueOnce({
      counts: { WILL_CHANGE: 1, NO_CHANGE: 0, REJECTED: 0 },
      rows: [
        {
          vehicleId: 'veh-1',
          stockNumber: '1001',
          label: '2022 Honda Accord',
          status: 'WILL_CHANGE',
          changes: [{ field: 'condition', from: 'USED', to: 'CPO' }],
          reason: null,
          incidentId: null,
          updatedAt: '2026-10-27T09:00:00Z',
        },
      ],
    });

    vi.spyOn(bulkEditApi, 'applyBulkEdit').mockResolvedValueOnce({
      batchId: 'batch-999',
      undoAvailable: true,
      counts: { APPLIED: 1 },
      rows: [
        {
          vehicleId: 'veh-1',
          stockNumber: '1001',
          label: '2022 Honda Accord',
          status: 'APPLIED',
          changes: [{ field: 'condition', from: 'USED', to: 'CPO' }],
          reason: null,
          incidentId: null,
          updatedAt: '2026-10-27T09:10:00Z',
        },
      ],
    });

    vi.spyOn(bulkEditApi, 'undoBulkEdit').mockResolvedValueOnce({
      batchId: 'batch-999',
      counts: { RESTORED: 1 },
      note: 'Restored values reach channels on their next update. DealerGrid cannot recall what a channel already showed.',
      rows: [
        {
          vehicleId: 'veh-1',
          stockNumber: '1001',
          status: 'RESTORED',
          changes: [{ field: 'condition', from: 'CPO', to: 'USED' }],
          reason: null,
          incidentId: null,
        },
      ],
    });

    const onSuccess = vi.fn();

    render(
      <BulkEditModal
        dealerId="dealer-123"
        isOpen={true}
        onClose={vi.fn()}
        vehicles={[sampleVehicles[0]]}
        onSuccess={onSuccess}
      />
    );

    // Toggle Condition
    act(() => {
      fireEvent.click(screen.getByLabelText(/Vehicle Condition/));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preview Changes/ }));
    });

    // Apply Changes
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Apply Changes/ })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply Changes/ }));
    });

    expect(bulkEditApi.applyBulkEdit).toHaveBeenCalledWith('dealer-123', [
      {
        vehicleId: 'veh-1',
        fields: { condition: 'USED' },
        expectedUpdatedAt: '2026-10-27T09:00:00Z',
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText(/Safe Batch Undo Available/)).toBeTruthy();
      expect(screen.getAllByText(/Applied/i).length).toBeGreaterThan(0);
    });

    // Trigger Undo
    const undoBtn = screen.getByRole('button', { name: /Undo this bulk update/ });
    await act(async () => {
      fireEvent.click(undoBtn);
    });

    expect(bulkEditApi.undoBulkEdit).toHaveBeenCalledWith('dealer-123', 'batch-999');
    await waitFor(() => {
      expect(screen.getByText(/Batch Restored/)).toBeTruthy();
      expect(screen.getByText(/Restored values reach channels on their next update/)).toBeTruthy();
      expect(screen.getByText(/DealerGrid Lot Inventory/)).toBeTruthy();
      expect(screen.getByText(/Restored in Database/)).toBeTruthy();
      expect(screen.getByText(/Connected Marketplaces/)).toBeTruthy();
      expect(screen.getByText(/Sync Pending/)).toBeTruthy();
    });
  });
});

describe('Three Remaining UX Considerations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves filters and record IDs in rowNavScope and routes', () => {
    const hash = '#/dealer-123/inventory?filter=Blocked&ids=v1,v2&search=Civic';
    const parsed = parseOperatorRoute(hash);
    expect(parsed.page).toBe('inventory');
    expect(parsed.scope?.filter).toBe('Blocked');
    expect(parsed.scope?.ids).toEqual(['v1', 'v2']);
    expect(parsed.scope?.search).toBe('Civic');

    const leadHash = '#/dealer-123/leads?leadId=lead-456';
    const parsedLead = parseOperatorRoute(leadHash);
    expect(parsedLead.page).toBe('leads');
    expect(parsedLead.scope?.leadId).toBe('lead-456');
  });

  it('lands directly on targeted lead and displays contextual focus banner', async () => {
    window.location.hash = '#/dealer-123/leads?leadId=lead-456';

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/crm-detail')) {
        return {
          ok: true,
          json: async () => ({
            leadId: 'lead-456',
            canSend: true,
            status: 'FAILED',
            lastAttemptAt: '2026-10-27T10:05:00Z',
            errorMessage: 'SMTP timeout connecting to crm.example.com',
            customer: { name: 'Alice Buyer', email: 'alice@example.com' },
            vehicle: { stockNumber: 'STK-456', year: 2023, make: 'Toyota', model: 'Tacoma' },
            attempts: [],
          }),
        };
      }
      if (url.includes('/api/dealers/dealer-123/leads')) {
        return {
          ok: true,
          json: async () => ({
            leads: [
              {
                id: 'lead-456',
                contactName: 'Alice Buyer',
                contactEmail: 'alice@example.com',
                platformSlug: 'autotrader',
                createdAt: '2026-10-27T10:00:00Z',
                crmDeliverySummary: {
                  status: 'FAILED',
                  lastAttemptAt: '2026-10-27T10:05:00Z',
                  errorMessage: 'SMTP timeout connecting to crm.example.com',
                },
                vehicle: {
                  stockNumber: 'STK-456',
                  year: 2023,
                  make: 'Toyota',
                  model: 'Tacoma',
                },
              },
            ],
            total: 1,
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(<LeadsPage dealerId="dealer-123" nav={mockNav} />);

    await waitFor(() => {
      expect(screen.getByText(/Focused on inquiry needing attention/)).toBeTruthy();
      expect(screen.getByText(/CRM handoff details opened for this inquiry/)).toBeTruthy();
      expect(screen.getByText('Alice Buyer')).toBeTruthy();
      // LeadCrmHandoffModal is automatically opened
      expect(screen.getAllByText(/Send to CRM/i).length).toBeGreaterThan(0);
    });
  });

  it('keeps Home Needs Attention compact and uncluttered without overloading the dashboard', () => {
    const compactAttention: AttentionResponse = {
      dealershipId: 'dealer-123',
      generatedAt: '2026-10-27T10:00:00Z',
      counts: { total: 2, blocking: 1, dealershipActions: 1, waiting: 1 },
      items: [
        {
          key: 'veh-attention',
          area: 'VEHICLES',
          kind: 'VEHICLE_INFORMATION_MISSING',
          severity: 'BLOCKING',
          owner: 'DEALERSHIP',
          ownerId: null,
          count: 2,
          summary: '2 vehicles cannot be published due to missing prices',
          nextAction: 'Set prices in Vehicles workspace to resume syndication',
          action: {
            kind: 'FIX_VEHICLES',
            enabled: true,
            disabledReason: null,
            channel: null,
          },
          records: [
            { type: 'VEHICLE', id: 'veh-1', label: '2022 Honda Accord', detail: 'Missing price', channel: null, vehicleId: 'veh-1' },
            { type: 'VEHICLE', id: 'veh-2', label: '2021 Toyota Camry', detail: 'Missing price', channel: null, vehicleId: 'veh-2' },
          ],
        },
        {
          key: 'partner-waiting',
          area: 'CHANNELS',
          kind: 'CHANNEL_SETUP_INCOMPLETE',
          severity: 'WAITING',
          owner: 'PARTNER',
          ownerId: null,
          count: 1,
          summary: 'CarGurus partner account approval in progress',
          nextAction: 'CarGurus review takes approximately 1-2 business days',
          action: { kind: 'NONE', enabled: false, disabledReason: null, channel: 'cargurus' },
          records: [],
        },
      ],
      unavailableAreas: [],
    };

    render(<DealerAttentionSection dealerId="dealer-123" attention={compactAttention} nav={mockNav} posture="attention" />);

    // 1. Shows compact target preview without taking over Home
    expect(screen.getByText(/Target:/)).toBeTruthy();
    expect(screen.getByText(/2022 Honda Accord, 2021 Toyota Camry/)).toBeTruthy();

    // 2. Action button links directly to Vehicles workspace
    const reviewBtn = screen.getByRole('button', { name: 'Review vehicles' });
    fireEvent.click(reviewBtn);
    expect(mockNav.goToInventory).toHaveBeenCalledWith({
      filter: 'Blocked',
      ids: ['veh-1', 'veh-2'],
    });

    // 3. Waiting items remain collapsed under secondary toggle
    expect(screen.getByText(/Waiting on external actions/)).toBeTruthy();
    expect(screen.queryByText(/CarGurus partner account approval in progress/)).toBeNull();
  });
});
