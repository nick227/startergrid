import { describe, expect, it } from 'vitest';
import { reportDetailHash, parseReportRoute } from './reportRoutes.ts';
import { movementActionCount } from './reportPresentation.ts';
import type { VehiclePerformanceItem } from './types.ts';

describe('parseReportRoute', () => {
  it('parses hub path', () => {
    expect(parseReportRoute('#/d1/reports')).toEqual({
      family: null,
      slug: null,
      range: 'now',
    });
  });

  it('parses detail with default range from catalog', () => {
    expect(parseReportRoute('#/d1/reports/platform/engagement')).toEqual({
      family: 'platform',
      slug: 'engagement',
      range: '30d',
    });
  });

  it('parses range query override', () => {
    expect(parseReportRoute('#/d1/reports/inventory/movement?range=7d')).toEqual({
      family: 'inventory',
      slug: 'movement',
      range: '7d',
    });
  });
});

describe('reportDetailHash', () => {
  it('builds detail hash with range', () => {
    expect(reportDetailHash('d1', 'inventory', 'movement', '7d')).toBe(
      '#/d1/reports/inventory/movement?range=7d',
    );
  });
});

describe('movementActionCount', () => {
  it('counts stale and slow signals', () => {
    const rows = [
      { movementSignal: 'STALE' },
      { movementSignal: 'SLOW' },
      { movementSignal: 'FAST' },
    ] as VehiclePerformanceItem[];
    expect(movementActionCount(rows)).toBe(2);
  });
});
