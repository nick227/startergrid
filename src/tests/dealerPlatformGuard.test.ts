import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isDealerPlatformAccessible } from '../server/dealerPlatformGuard.js';

function makePrisma(opts: {
  businessCategory?: string | null;
  siteAvailability?: Array<{ platformSlug: string; siteEnabled: boolean }>;
}) {
  return {
    dealershipProfile: {
      findUnique: async () => ({ businessCategory: opts.businessCategory ?? 'AUTOMOTIVE' }),
    },
    platformSiteAvailability: {
      findMany: async () => opts.siteAvailability ?? [],
    },
  };
}

describe('isDealerPlatformAccessible', () => {
  it('allows offered platforms in the dealer category', async () => {
    const ok = await isDealerPlatformAccessible(
      makePrisma({}) as never,
      'dealer-1',
      'consumer-marketplace',
    );
    assert.equal(ok, true);
  });

  it('rejects admin-disabled platforms', async () => {
    const ok = await isDealerPlatformAccessible(
      makePrisma({
        siteAvailability: [{ platformSlug: 'consumer-marketplace', siteEnabled: false }],
      }) as never,
      'dealer-1',
      'consumer-marketplace',
    );
    assert.equal(ok, false);
  });

  it('rejects platforms outside the dealer category', async () => {
    const ok = await isDealerPlatformAccessible(
      makePrisma({ businessCategory: 'EBOOKS' }) as never,
      'dealer-1',
      'cars-com',
    );
    assert.equal(ok, false);
  });
});
