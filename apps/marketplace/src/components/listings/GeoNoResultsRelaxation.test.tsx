// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import { GeoNoResultsRelaxation } from './GeoNoResultsRelaxation.tsx';

function render(ui: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(ui); });
  return container;
}

describe('GeoNoResultsRelaxation', () => {
  it('offers expand radius and nationwide actions', () => {
    const onExpandRadius = vi.fn();
    const onNationwide = vi.fn();
    const el = render(
      <GeoNoResultsRelaxation
        preference={{
          postalCode: '78701',
          lat: 30.27,
          lng: -97.74,
          radiusMiles: 50,
          nationwide: false,
        }}
        onExpandRadius={onExpandRadius}
        onNationwide={onNationwide}
      />,
    );

    expect(el.textContent).toContain('No listings nearby');
    expect(el.textContent).toContain('50 miles of 78701');

    const expand = Array.from(el.querySelectorAll('button')).find(
      button => button.textContent === 'Expand to 100 miles',
    );
    const nationwide = Array.from(el.querySelectorAll('button')).find(
      button => button.textContent === 'Search nationwide',
    );

    expect(expand).toBeTruthy();
    expect(nationwide).toBeTruthy();

    act(() => { expand?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(onExpandRadius).toHaveBeenCalledWith({
      type: 'expand_radius',
      radiusMiles: 100,
      label: 'Expand to 100 miles',
    });

    act(() => { nationwide?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(onNationwide).toHaveBeenCalled();
  });
});
