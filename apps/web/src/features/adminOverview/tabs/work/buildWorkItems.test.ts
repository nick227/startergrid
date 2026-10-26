import { describe, it, expect } from 'vitest';
import { buildWorkItems } from './buildWorkItems.ts';
import type { DealershipRecordSummary } from '@/lib/api/dealershipRecordApi.ts';

const dealer = (overrides: Partial<DealershipRecordSummary> = {}): DealershipRecordSummary => ({
  id: 'd1',
  legalName: 'Lakeview Motors',
  dbaName: null,
  logoUrl: null,
  businessCategory: 'AUTOMOTIVE',
  lifecycleStatus: 'SETTING_UP',
  primaryContactEmail: 'jordan@lakeview.test',
  autopilotPreference: 'OFF',
  createdAt: '2026-10-25T00:00:00.000Z',
  nextStep: { key: 'ACCESS', label: 'Invite owner', ownerKind: 'OUR_TEAM', nextAction: 'Send the owner invite' },
  ...overrides,
});

describe('buildWorkItems', () => {
  it('skips active dealers with no next step', () => {
    const items = buildWorkItems([dealer({ lifecycleStatus: 'ACTIVE', nextStep: null })], null, 'maya@sg.test');
    expect(items).toEqual([]);
  });

  it('marks assigned internal owner work as mine', () => {
    const items = buildWorkItems([
      dealer({ internalOwner: { id: 'u1', email: 'maya@sg.test' } }),
    ], null, 'maya@sg.test');
    expect(items[0]?.isMine).toBe(true);
    expect(items[0]?.action).toBe('Send the owner invite');
  });
});
