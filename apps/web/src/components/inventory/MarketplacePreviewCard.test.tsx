import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MarketplacePreviewCard } from './MarketplacePreviewCard.tsx';

vi.mock('@/lib/api/sdk.ts', () => ({
  fetchMarketplaceVehicleDetail: vi.fn(),
}));

import { fetchMarketplaceVehicleDetail } from '@/lib/api/sdk.ts';

const mockFetch = vi.mocked(fetchMarketplaceVehicleDetail);

describe('MarketplacePreviewCard UI states', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('shows operator-only ineligibility when price is not set', () => {
    render(<MarketplacePreviewCard vehicle={{ id: 'v1', priceCents: 0 }} />);
    expect(screen.getByText('Operator only')).toBeTruthy();
    expect(screen.getByText(/Consumer preview is hidden/)).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('renders consumer preview without operator performance wording', async () => {
    mockFetch.mockResolvedValue({
      vehicle: {
        listingId: 'v1',
        stockNumber: 'PRM-1',
        year: 2021,
        make: 'Honda',
        model: 'Accord',
        trim: null,
        condition: 'USED',
        priceCents: 2000000,
        mileage: 12000,
        exteriorColor: 'White',
        mediaUrls: [],
        dealerId: 'd1',
        dealerName: 'Demo Dealer',
        dealerCity: 'Plano',
        dealerState: 'TX',
        listingUrl: '/marketplace/dealers/d1/PRM-1',
        listedAt: '2026-06-01T12:00:00.000Z',
      },
      fullDescription: null,
      additionalMediaUrls: [],
    });

    render(<MarketplacePreviewCard vehicle={{ id: 'v1', priceCents: 2000000 }} />);

    await waitFor(() => {
      expect(screen.getByText('$20,000')).toBeTruthy();
    });

    const text = document.body.textContent ?? '';
    expect(text.toLowerCase()).not.toContain('benchmark');
    expect(text.toLowerCase()).not.toContain('movement signal');
    expect(text.toLowerCase()).not.toContain('observed assist');
  });

  it('shows error state with retry when SDK fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Not found'));

    render(<MarketplacePreviewCard vehicle={{ id: 'v1', priceCents: 100000 }} />);

    await waitFor(() => {
      expect(screen.getByText('Could not load marketplace preview')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'Retry preview' })).toBeTruthy();
  });
});
