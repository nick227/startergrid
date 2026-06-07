import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCategoryPayload, usageUnitFromPayload } from '../lib/categoryPayload.js';

describe('categoryPayload helpers', () => {
  it('parseCategoryPayload returns usageUnit and unitType', () => {
    assert.deepEqual(parseCategoryPayload({ usageUnit: 'hours', unitType: 'ATV' }), {
      usageUnit: 'hours',
      unitType: 'ATV',
    });
  });

  it('parseCategoryPayload ignores invalid shapes', () => {
    assert.deepEqual(parseCategoryPayload(null), {});
    assert.deepEqual(parseCategoryPayload(['hours']), {});
    assert.deepEqual(parseCategoryPayload({ usageUnit: 'kilometers' }), {});
  });

  it('usageUnitFromPayload extracts miles or hours', () => {
    assert.equal(usageUnitFromPayload({ usageUnit: 'miles' }), 'miles');
    assert.equal(usageUnitFromPayload({ usageUnit: 'hours' }), 'hours');
    assert.equal(usageUnitFromPayload({}), undefined);
  });
});
