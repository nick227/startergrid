import { describe, it, expect } from 'vitest';
import { channelExperience, dealerSetupIncomplete } from './pagePrimaryState.ts';

describe('channelExperience', () => {
  it('treats no destinations as empty', () => {
    expect(channelExperience({ connected: 0, attention: 0, setup: 0, total: 0 })).toBe('empty');
  });

  it('treats nothing connected as empty, not a filter dashboard', () => {
    expect(channelExperience({ connected: 0, attention: 0, setup: 4, total: 4 })).toBe('empty');
  });

  it('puts a broken destination ahead of setup', () => {
    expect(channelExperience({ connected: 1, attention: 1, setup: 2, total: 4 })).toBe('attention');
  });

  it('is setup when some destinations work and others still need connecting', () => {
    expect(channelExperience({ connected: 1, attention: 0, setup: 3, total: 4 })).toBe('setup');
  });

  it('is running when connected destinations have no fixes', () => {
    expect(channelExperience({ connected: 3, attention: 0, setup: 0, total: 3 })).toBe('running');
  });
});

describe('dealerSetupIncomplete', () => {
  it('is first-time until vehicles, a ready listing, a channel, and a contact exist', () => {
    expect(dealerSetupIncomplete({
      vehicleTotal: 0, vehicleReady: 0, channelConnected: false, missingPrimaryContact: true,
    })).toBe(true);
    expect(dealerSetupIncomplete({
      vehicleTotal: 2, vehicleReady: 1, channelConnected: true, missingPrimaryContact: false,
    })).toBe(false);
  });
});
