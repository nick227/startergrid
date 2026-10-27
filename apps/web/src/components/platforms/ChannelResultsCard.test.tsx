import { fireEvent, screen, waitFor, within } from '@testing-library/dom';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChannelResults } from '@/lib/api/sdk.ts';

const api = vi.hoisted(() => ({
  fetchChannelResults: vi.fn(),
  saveChannelCost: vi.fn(),
  saveSaleDetails: vi.fn(),
}));
vi.mock('@/lib/api/sdk.ts', () => api);

import { ChannelResultsCard } from './ChannelResultsCard.tsx';

let root: Root | undefined;
function render(node: ReactNode) {
  const container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container); act(() => root!.render(node));
}
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; document.body.innerHTML = ''; vi.clearAllMocks(); });

const emptyMethods = { DEALER_CONFIRMED: 0, LEAD_MARKED_SOLD: 0 };

function results(): ChannelResults {
  return {
    month: '2026-10',
    sales: { markedSold: 2, attributed: 1, unattributed: 1, withSalePrice: 0, withTransactionDate: 0 },
    inquiries: { recorded: 3, progressed: 1 },
    cost: { channelsWithReportedCost: 1, totalReportedCostCents: 125_000 },
    channels: [
      {
        platformSlug: 'cargurus-dealer', platformName: 'CarGurus', inquiryReporting: 'NOT_REPORTED', inquirySource: null,
        inquiries: null, progressedInquiries: null, attributedSales: 1, attributedByMethod: { ...emptyMethods, DEALER_CONFIRMED: 1 },
        attributedSalesWithPrice: 0, attributedSaleRevenueCents: null,
        cost: { flatFeeCents: 125_000, adSpendCents: null, reportedCostCents: 125_000, sourceConfidence: 'MANUAL_IMPORTED' },
        costPerInquiryCents: null, costPerAttributedSaleCents: 125_000,
      },
      {
        platformSlug: 'consumer-marketplace', platformName: 'DealerGrid Marketplace', inquiryReporting: 'REPORTED', inquirySource: 'OBSERVED_FIRST_PARTY',
        inquiries: 3, progressedInquiries: 1, attributedSales: 0, attributedByMethod: emptyMethods,
        attributedSalesWithPrice: 0, attributedSaleRevenueCents: null, cost: null, costPerInquiryCents: null, costPerAttributedSaleCents: null,
      },
    ] as ChannelResults['channels'],
    saleOutcomes: [
      { vehicleId: 'v1', stockNumber: 'A-1', title: '2022 Honda Accord', markedSoldAt: '2026-10-20T15:00:00.000Z', transactionDate: null, salePriceCents: null,
        attributedChannelSlug: 'cargurus-dealer', attributionMethod: 'DEALER_CONFIRMED', unattributedReason: null, evidenceLeadIds: [] },
      { vehicleId: 'v2', stockNumber: 'A-2', title: '2021 Ford F-150', markedSoldAt: '2026-10-21T15:00:00.000Z', transactionDate: null, salePriceCents: null,
        attributedChannelSlug: null, attributionMethod: null, unattributedReason: 'NO_EVIDENCE', evidenceLeadIds: [] },
    ] as ChannelResults['saleOutcomes'],
  };
}

describe('ChannelResultsCard', () => {
  it('says what is unknown instead of showing zero', async () => {
    api.fetchChannelResults.mockResolvedValue(results());
    render(<ChannelResultsCard dealerId="d1" />);
    const cargurus = (await screen.findAllByText('CarGurus'))[0]!.closest('tr')!;
    expect(within(cargurus).getByText('Not sent to DealerGrid')).toBeTruthy();
    const marketplace = screen.getByText('DealerGrid Marketplace').closest('tr')!;
    expect(within(marketplace).getByText('Not entered')).toBeTruthy();
    const unlinked = screen.getByText('2021 Ford F-150').closest('tr')!;
    expect(within(unlinked).getByText('No evidence yet')).toBeTruthy();
    expect(within(unlinked).getAllByText('Not entered')).toHaveLength(2);
    expect(screen.getByText(/1 sale this month is not linked/)).toBeTruthy();
  });

  it('saves a blank cost field as not reported, not as zero', async () => {
    api.fetchChannelResults.mockResolvedValue(results());
    api.saveChannelCost.mockResolvedValue(null);
    render(<ChannelResultsCard dealerId="d1" />);
    const marketplace = (await screen.findByText('DealerGrid Marketplace')).closest('tr')!;
    fireEvent.click(within(marketplace).getByText('Enter cost'));
    fireEvent.change(await screen.findByLabelText(/Advertising spend/), { target: { value: '450' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(api.saveChannelCost).toHaveBeenCalled());
    expect(api.saveChannelCost.mock.calls[0]![1]).toEqual({
      platformSlug: 'consumer-marketplace', month: expect.stringMatching(/^\d{4}-\d{2}$/), flatFeeCents: null, adSpendCents: 45_000,
    });
  });

  it('records only the sale details entered', async () => {
    api.fetchChannelResults.mockResolvedValue(results());
    api.saveSaleDetails.mockResolvedValue({});
    render(<ChannelResultsCard dealerId="d1" />);
    const unlinked = (await screen.findByText('2021 Ford F-150')).closest('tr')!;
    fireEvent.click(within(unlinked).getByText('Sale details'));
    fireEvent.change(await screen.findByLabelText(/Sale price/), { target: { value: '36800' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(api.saveSaleDetails).toHaveBeenCalled());
    expect(api.saveSaleDetails).toHaveBeenCalledWith('d1', 'v2', { transactionDate: null, salePriceCents: 3_680_000, confirmedChannelSlug: null });
  });
});
