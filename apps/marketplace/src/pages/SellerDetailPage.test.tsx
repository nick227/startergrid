// @vitest-environment jsdom
import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CategoryProvider } from '../contexts/CategoryContext.tsx';
import SellerDetailPage from './SellerDetailPage.tsx';

const query = vi.hoisted(() => ({ data: null as unknown, loading: false, error: null, reload: vi.fn() }));
vi.mock('../hooks/useQuery.ts', () => ({ useQuery: () => query, queryErrorMessage: () => 'Try again' }));
vi.mock('../hooks/usePageMeta.ts', () => ({ usePageMeta: () => {} }));
vi.mock('../hooks/useTrackMarketplaceEvent.ts', () => ({ useTrackMarketplaceEvent: () => {} }));
vi.mock('../components/layout/PageShell.tsx', () => ({ PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('../components/listing/cards/FeedCards.tsx', () => ({ MarketplaceProductCard: ({ card }: { card: { title: string } }) => <article>{card.title}</article> }));
vi.mock('../features/leadCapture/LeadInquiryForm.tsx', () => ({ LeadInquiryForm: ({ listingId }: { listingId: string }) => {
  const [sent, setSent] = useState(false);
  return <button data-testid="inquiry" onClick={() => setSent(true)}>{listingId}:{sent ? 'sent' : 'ready'}</button>;
} }));
const vehicle = (id: string) => ({ listingId: id, year: 2024, make: 'Toyota', model: 'Camry', priceCents: 2500000, mileage: 12000, condition: 'USED', mediaUrls: [], listedAt: '2026-01-01', dealerId: 'seller', dealerName: 'Seller' });
let root: Root;
let container: HTMLDivElement;
function render(fromListing?: string) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<CategoryProvider categoryId="AUTOMOTIVE" slug="automotive"><SellerDetailPage sellerId="seller" fromListing={fromListing} /></CategoryProvider>));
}
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks(); });

describe('seller storefront', () => {
  it('uses the Browse container and shared product cards, and resets inquiry state on item change', () => {
    query.data = { dealerName: 'Seller', vehicles: [vehicle('one'), vehicle('two')] };
    query.loading = false;
    render('two');
    expect(container.querySelector('.mp-page .mp-grid-vehicles')?.children).toHaveLength(2);
    const inquiry = () => container.querySelector('[data-testid="inquiry"]') as HTMLButtonElement;
    expect(inquiry().textContent).toBe('two:ready');
    act(() => inquiry().click());
    expect(inquiry().textContent).toBe('two:sent');
    const select = container.querySelector('select')!;
    act(() => { select.value = 'one'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(inquiry().textContent).toBe('one:ready');
  });

  it('scrolls to contact without replacing the hash route', () => {
    query.data = { dealerName: 'Seller', vehicles: [vehicle('one')] };
    render();
    window.location.hash = '/automotive/seller/seller';
    const target = container.querySelector('#inquiry') as HTMLElement;
    target.scrollIntoView = vi.fn();
    act(() => (container.querySelector('a[href="#inquiry"]') as HTMLAnchorElement).click());
    expect(window.location.hash).toBe('#/automotive/seller/seller');
    expect(document.activeElement).toBe(target);
    expect(target.scrollIntoView).toHaveBeenCalled();
  });

  it('keeps empty and loading states inside the same width', () => {
    query.data = { dealerName: 'Seller', vehicles: [] };
    render();
    expect(container.querySelector('.mp-page')?.textContent).toContain('No vehicles listed right now');
    expect(container.querySelector('#inquiry')).toBeNull();
    act(() => root.unmount());
    query.data = null;
    query.loading = true;
    render();
    expect(container.querySelector('.mp-page [aria-busy="true"]')).not.toBeNull();
    query.loading = false;
  });
});
