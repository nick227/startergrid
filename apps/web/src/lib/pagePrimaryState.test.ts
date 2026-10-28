import { describe, it, expect } from 'vitest';
import { channelExperience, dealerSetupIncomplete, operatingPosture, platformLooksConnected, reportsExperience } from './pagePrimaryState.ts';
import { reportsPrimary } from './reportsPrimary.ts';
import { listingStatusText } from './listingStatus.ts';

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

describe('platformLooksConnected', () => {
  it('requires an active destination, not a default scheduled feed', () => {
    expect(platformLooksConnected({ state: 'Scheduled', accountState: 'ACCOUNT_NEEDED', platformSlug: 'cargurus-dealer' })).toBe(false);
    expect(platformLooksConnected({ state: 'Ready', accountState: 'ACCOUNT_NEEDED' })).toBe(false);
    expect(platformLooksConnected({ state: 'Active', accountState: 'ACTIVE' })).toBe(true);
    expect(platformLooksConnected({ state: 'Ready', platformSlug: 'consumer-marketplace' })).toBe(true);
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

describe('operatingPosture', () => {
  it('does not call an empty dealership clear', () => {
    expect(operatingPosture({
      vehicleTotal: 0, channelConfigured: false, leadCount: 0, problemCount: 0, checksIncomplete: false,
    })).toBe('unconfigured');
  });

  it('is attention when a configured dealership still has a problem or an unfinished check', () => {
    expect(operatingPosture({
      vehicleTotal: 4, channelConfigured: true, leadCount: 0, problemCount: 1, checksIncomplete: false,
    })).toBe('attention');
    expect(operatingPosture({
      vehicleTotal: 4, channelConfigured: true, leadCount: 0, problemCount: 0, checksIncomplete: true,
    })).toBe('attention');
  });

  it('is clear only after the dealership is in use and the check found nothing', () => {
    expect(operatingPosture({
      vehicleTotal: 4, channelConfigured: true, leadCount: 2, problemCount: 0, checksIncomplete: false,
    })).toBe('clear');
  });
});

describe('reportsExperience', () => {
  it('is empty when there is no inventory and nothing failed', () => {
    expect(reportsExperience({ vehicleTotal: 0, blocked: 0, failedSends: 0 })).toBe('empty');
  });

  it('puts blocked listings and failed sends ahead of a quiet dashboard', () => {
    expect(reportsExperience({ vehicleTotal: 4, blocked: 2, failedSends: 0 })).toBe('attention');
    expect(reportsExperience({ vehicleTotal: 4, blocked: 0, failedSends: 3 })).toBe('attention');
  });

  it('is running when listings exist and nothing is blocked or failing', () => {
    expect(reportsExperience({ vehicleTotal: 4, blocked: 0, failedSends: 0 })).toBe('running');
  });
});

describe('reportsPrimary', () => {
  it('sends a new employee to vehicles when nothing is listed yet', () => {
    expect(reportsPrimary({ vehicleTotal: 0, blocked: 0, failedSends: 0, stale: 0 })).toMatchObject({
      kind: 'empty', action: 'vehicles', title: 'Reports are not set up yet',
    });
  });

  it('names the blocked-vehicle count before failed sends or stale stock', () => {
    expect(reportsPrimary({ vehicleTotal: 8, blocked: 3, failedSends: 2, stale: 5 }).title)
      .toBe('3 vehicles are missing what a destination requires');
  });
});

describe('listingStatusText', () => {
  it('does not say live when a send has not been verified', () => {
    expect(listingStatusText({ readiness: 'BLOCKED' })).toBe('Cannot list');
    expect(listingStatusText({ readiness: 'READY', liveCount: 0 })).toBe('Ready to send');
    expect(listingStatusText({ readiness: 'READY', liveCount: 2 })).toBe('Sent');
    expect(listingStatusText({ readiness: 'WARNING' })).toBe('Needs details');
  });
});
