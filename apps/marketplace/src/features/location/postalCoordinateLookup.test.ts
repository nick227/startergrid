import { describe, expect, it } from 'vitest';
import { lookupPostalCoordinates } from './postalCoordinateLookup.ts';

describe('lookupPostalCoordinates', () => {
  it('resolves fixture Austin ZIP 78701', async () => {
    const coords = await lookupPostalCoordinates('78701');
    expect(coords).not.toBeNull();
    expect(coords!.lat).toBeGreaterThan(30.2);
    expect(coords!.lat).toBeLessThan(30.35);
    expect(coords!.lng).toBeLessThan(-97.6);
    expect(coords!.lng).toBeGreaterThan(-97.85);
  }, 15000);

  it('accepts ZIP+4 and normalizes to five digits', async () => {
    const shortZip = await lookupPostalCoordinates('78701');
    const zipPlus4 = await lookupPostalCoordinates('78701-1234');
    expect(zipPlus4).toEqual(shortZip);
  });

  it('returns null for unknown ZIP codes', async () => {
    expect(await lookupPostalCoordinates('00000')).toBeNull();
  });

  it('returns null for non-US postal patterns', async () => {
    expect(await lookupPostalCoordinates('SW1A 1AA')).toBeNull();
    expect(await lookupPostalCoordinates('12')).toBeNull();
  });
});
