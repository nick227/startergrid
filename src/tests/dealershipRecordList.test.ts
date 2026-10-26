import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dealershipListWhere } from '../services/dealership/dealershipRecordService.js';

describe('dealershipListWhere', () => {
  it('scopes non-admin lists to assigned rooftops', () => {
    const where = dealershipListWhere({}, { global: false, dealerIds: ['d1', 'd2'] });
    assert.deepEqual(where, { AND: [{ id: { in: ['d1', 'd2'] } }] });
  });

  it('ANDs search with needsAttention', () => {
    const where = dealershipListWhere(
      { q: 'lakeview', needsAttention: true },
      { global: true, dealerIds: [] },
    );
    const and = (where as { AND: unknown[] }).AND;
    assert.equal(and.length, 2);
  });

  it('treats DRAFT, SETTING_UP, READY_TO_LAUNCH, blocked steps, and waitingForStock as attention', () => {
    const where = dealershipListWhere(
      { needsAttention: true },
      { global: true, dealerIds: [] },
    );
    const attention = (where as { AND: Array<{ OR: object[] }> }).AND[0];
    assert.ok(attention.OR.some((clause) => 'waitingForStock' in clause));
    assert.ok(attention.OR.some((clause) => 'lifecycleStatus' in clause));
    assert.ok(attention.OR.some((clause) => 'onboardingSteps' in clause));
  });
});
