// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import { BuyerLocationControls } from './BuyerLocationControls.tsx';

function render(ui: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(ui); });
  return container;
}

describe('BuyerLocationControls', () => {
  it('renders ZIP, radius, and nationwide controls', () => {
    const el = render(
      <BuyerLocationControls
        preference={null}
        onApply={vi.fn()}
        onNationwideChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(el.querySelector('[data-testid="buyer-postal-input"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="buyer-radius-select"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="buyer-nationwide-toggle"]')).toBeTruthy();
    expect(el.textContent).toContain('Filter nearby listings by ZIP and radius');
  });

  it('shows active location copy when coordinates resolve', () => {
    const el = render(
      <BuyerLocationControls
        preference={{
          postalCode: '78701',
          lat: 30.27,
          lng: -97.74,
          radiusMiles: 50,
          nationwide: false,
        }}
        onApply={vi.fn()}
        onNationwideChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(el.querySelector('[data-testid="buyer-location-active"]')?.textContent)
      .toContain('Searching within 50 miles of 78701');
  });
});
