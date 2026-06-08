// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { CategoryProvider } from '../../contexts/CategoryContext.tsx';
import { FeedItemCard } from './FeedCards.tsx';
import type { MarketplaceFeedItem } from '../../lib/api.ts';
import { MarketplaceVehicleCard, MarketplaceNotice } from '@dealer-marketplace/client';

vi.mock('../../hooks/useTrackVisibleMarketplaceItem.ts', () => ({
  useTrackVisibleMarketplaceItem: () => ({ current: null }),
}));

vi.mock('../ui/FavoriteButton.tsx', () => ({ FavoriteButton: () => null }));
vi.mock('../ui/FeedMediaCarousel.tsx', () => ({ FeedMediaCarousel: () => <div data-testid="carousel" /> }));
vi.mock('../listings/NewArrivalBadge.tsx', () => ({ NewArrivalBadge: () => null }));
vi.mock('../listings/PriceDropBadge.tsx', () => ({ PriceDropBadge: () => null }));
vi.mock('../listings/FulfillmentBadge.tsx', () => ({ FulfillmentBadge: () => null }));

const vehicleCard = {
  listingId: 'v1',
  stockNumber: 'S1',
  year: 2024,
  make: 'Toyota',
  model: 'Camry',
  trim: null,
  condition: MarketplaceVehicleCard.condition.USED,
  priceCents: 2500000,
  mileage: 12000,
  usageUnit: MarketplaceVehicleCard.usageUnit.MILES,
  exteriorColor: 'Black',
  mediaUrls: ['https://cdn.example.com/1.jpg'],
  mediaItems: [],
  dealerId: 'dealer-1',
  dealerName: 'Seller',
  dealerCity: 'Springfield',
  dealerState: 'IL',
  listingUrl: '/marketplace/dealers/dealer-1/S1',
  listedAt: '2026-06-01T00:00:00.000Z',
};

const vehicleItem: Extract<MarketplaceFeedItem, { type: 'vehicle' }> = {
  type: 'vehicle',
  id: 'vehicle:v1',
  impressionKey: 'vehicle:v1',
  vehicle: vehicleCard,
};

const promoItem: Extract<MarketplaceFeedItem, { type: 'dealerPromo' }> = {
  type: 'dealerPromo',
  id: 'promo:1',
  impressionKey: 'promo:1',
  promo: {
    title: 'Sponsored',
    body: 'Visit our lot',
    dealerName: 'Seller',
    dealerId: 'dealer-1',
    ctaLabel: 'Learn more',
    ctaHref: '#/automotive/seller/dealer-1',
    mediaUrl: null,
  },
};

const noticeItem: Extract<MarketplaceFeedItem, { type: 'marketplaceNotice' }> = {
  type: 'marketplaceNotice',
  id: 'notice:1',
  impressionKey: 'notice:1',
  notice: { title: 'Notice', body: 'Inventory changes daily.', tone: MarketplaceNotice.tone.INFO },
};

function renderCard(item: MarketplaceFeedItem, onQuickView?: (id: string) => void) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => {
    root.render(
      <CategoryProvider categoryId="AUTOMOTIVE" slug="automotive">
        <FeedItemCard item={item} index={0} onQuickView={onQuickView} />
      </CategoryProvider>,
    );
  });
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('FeedItemCard quick view gating', () => {
  it('renders Quick view for vehicle items when onQuickView is provided', () => {
    const el = renderCard(vehicleItem, () => undefined);
    expect(el.textContent).toContain('Quick view');
  });

  it('does not render Quick view for vehicle items without onQuickView', () => {
    const el = renderCard(vehicleItem);
    expect(el.textContent).not.toContain('Quick view');
  });

  it('does not render Quick view for dealerPromo items even with onQuickView', () => {
    const el = renderCard(promoItem, () => undefined);
    expect(el.textContent).not.toContain('Quick view');
    expect(el.textContent).toContain('Sponsored dealer');
  });

  it('does not render Quick view for marketplaceNotice items even with onQuickView', () => {
    const el = renderCard(noticeItem, () => undefined);
    expect(el.textContent).not.toContain('Quick view');
    expect(el.textContent).toContain('Marketplace notice');
  });
});
