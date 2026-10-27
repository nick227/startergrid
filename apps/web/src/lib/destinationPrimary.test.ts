import { describe, expect, it } from 'vitest';
import { channelCardCopy } from './destinationPrimary.ts';

describe('channelCardCopy', () => {
  it('never says live or syndicating', () => {
    const cases = [
      channelCardCopy({ connected: true, hasErrors: false, sentCount: 2, firstParty: true }),
      channelCardCopy({ connected: true, hasErrors: false, sentCount: 0, firstParty: false }),
      channelCardCopy({ connected: false, hasErrors: false, sentCount: 0, firstParty: false }),
    ];
    for (const copy of cases) {
      expect(`${copy.status} ${copy.description}`).not.toMatch(/published live|syndicat|0 live/i);
    }
    expect(channelCardCopy({ connected: true, hasErrors: false, sentCount: 2, firstParty: false }).status).toBe('2 sent');
  });
});
