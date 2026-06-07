import { describe, expect, it } from 'vitest';
import { OperatorIdentityResponse } from '@auto-dealer/api-client';
import type { OperatorUser } from '@/lib/api/auth.ts';
import { canAccessDealer, filterDealersForOperator, operatorHasGlobalAccess } from '@/lib/operatorAccess.ts';

const superAdmin: OperatorUser = {
  id: 'op-1',
  email: 'admin@example.local',
  role: OperatorIdentityResponse.role.SUPER_ADMIN,
  dealerAccessIds: [],
};

const scopedOperator: OperatorUser = {
  id: 'op-2',
  email: 'scoped@example.local',
  role: OperatorIdentityResponse.role.OPERATOR,
  dealerAccessIds: ['dealer-a', 'dealer-b'],
};

describe('operatorHasGlobalAccess', () => {
  it('grants SUPER_ADMIN global access', () => {
    expect(operatorHasGlobalAccess(superAdmin)).toBe(true);
  });

  it('grants dev bypass with empty dealer list', () => {
    expect(operatorHasGlobalAccess({ ...superAdmin, devBypass: true, dealerAccessIds: [] })).toBe(true);
  });
});

describe('canAccessDealer', () => {
  it('allows SUPER_ADMIN any dealer', () => {
    expect(canAccessDealer(superAdmin, 'any-id')).toBe(true);
  });

  it('restricts OPERATOR to assigned dealers', () => {
    expect(canAccessDealer(scopedOperator, 'dealer-a')).toBe(true);
    expect(canAccessDealer(scopedOperator, 'dealer-x')).toBe(false);
  });
});

describe('filterDealersForOperator', () => {
  const dealers = [
    { id: 'dealer-a', legalName: 'A' },
    { id: 'dealer-b', legalName: 'B' },
    { id: 'dealer-x', legalName: 'X' },
  ];

  it('returns all dealers for SUPER_ADMIN', () => {
    expect(filterDealersForOperator(dealers, superAdmin)).toHaveLength(3);
  });

  it('filters to assigned dealers for OPERATOR', () => {
    expect(filterDealersForOperator(dealers, scopedOperator).map(d => d.id)).toEqual(['dealer-a', 'dealer-b']);
  });
});
