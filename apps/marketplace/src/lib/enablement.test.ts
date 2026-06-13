import { describe, expect, it } from 'vitest';
import {
  isConsumerMarketplaceLive,
  resolveCategorySchema,
} from '@auto-dealer/category-schemas';

describe('consumer marketplace enablement', () => {
  it('gates browse on consumerEnabled only', () => {
    expect(isConsumerMarketplaceLive(resolveCategorySchema('AUTOMOTIVE'))).toBe(true);
    expect(isConsumerMarketplaceLive(resolveCategorySchema('BOATS'))).toBe(true);
    expect(isConsumerMarketplaceLive(resolveCategorySchema('TRAILERS_POWERSPORTS_RV'))).toBe(true);
    expect(isConsumerMarketplaceLive(resolveCategorySchema('SONGS'))).toBe(false);
  });

  it('does not use operator status for consumer browse', () => {
    const songs = resolveCategorySchema('SONGS');
    // SONGS is operator-active but not consumer-marketplace-enabled
    expect(songs.status).toBe('active');
    expect(songs.marketplace.consumerEnabled).toBe(false);
    expect(isConsumerMarketplaceLive(songs)).toBe(false);
  });
});
