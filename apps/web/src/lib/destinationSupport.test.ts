import { describe, expect, it } from 'vitest';
import { destinationSupport, groupDestinationSupport } from './destinationSupport.ts';

describe('destinationSupport', () => {
  it('hides a destination that is turned off for the site', () => {
    expect(destinationSupport({
      siteEnabled: false, validation: 'VALID', recentFailures: 0, blockedDealers: 0,
    })).toEqual({ tone: 'hidden', status: 'Hidden from dealerships' });
  });

  it('flags missing or failed shared credentials as attention', () => {
    expect(destinationSupport({
      siteEnabled: true, validation: 'NOT_CONFIGURED', recentFailures: 0, blockedDealers: 0,
    }).status).toBe('Needs shared credentials');
    expect(destinationSupport({
      siteEnabled: true, validation: 'VALIDATION_FAILED', recentFailures: 0, blockedDealers: 0,
    }).status).toBe('Shared credentials failed');
  });

  it('treats a working destination as offered', () => {
    expect(destinationSupport({
      siteEnabled: true, validation: 'VALID', recentFailures: 0, blockedDealers: 0,
    })).toEqual({ tone: 'offered', status: 'Offered to dealerships' });
  });
});

describe('groupDestinationSupport', () => {
  it('keeps attention first in the group map', () => {
    const groups = groupDestinationSupport([
      { tone: 'offered' as const, id: 'a' },
      { tone: 'attention' as const, id: 'b' },
      { tone: 'hidden' as const, id: 'c' },
    ]);
    expect(groups.attention.map(r => r.id)).toEqual(['b']);
    expect(groups.offered.map(r => r.id)).toEqual(['a']);
    expect(groups.hidden.map(r => r.id)).toEqual(['c']);
  });
});
