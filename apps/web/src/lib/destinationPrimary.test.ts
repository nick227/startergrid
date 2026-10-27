import { describe, expect, it } from 'vitest';
import { channelCardCopy, channelListGroup, visibleIdleChannels } from './destinationPrimary.ts';

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

describe('channelListGroup', () => {
  it('keeps unused provisioned destinations out of In use', () => {
    expect(channelListGroup({ connected: false, hasErrors: false, sentCount: 0, firstParty: false })).toBe('available');
    expect(channelListGroup({ connected: true, hasErrors: false, sentCount: 0, firstParty: false })).toBe('idle');
    expect(channelListGroup({ connected: true, hasErrors: false, sentCount: 4, firstParty: false })).toBe('inUse');
    expect(channelListGroup({ connected: true, hasErrors: false, sentCount: 0, firstParty: true })).toBe('inUse');
    expect(channelListGroup({ connected: true, hasErrors: true, sentCount: 2, firstParty: false })).toBe('attention');
  });
});

describe('visibleIdleChannels', () => {
  it('hides idle destinations when something is already in use', () => {
    expect(visibleIdleChannels(['a', 'b', 'c'], 1, false)).toEqual([]);
    expect(visibleIdleChannels(['a', 'b', 'c'], 1, true)).toEqual(['a', 'b', 'c']);
    expect(visibleIdleChannels(['a', 'b', 'c'], 0, false)).toEqual(['a']);
    expect(visibleIdleChannels(['a', 'b'], 0, false)).toEqual(['a', 'b']);
  });
});
