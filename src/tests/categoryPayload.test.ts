import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCategoryPayload, usageUnitFromPayload } from '../lib/categoryPayload.js';

describe('categoryPayload helpers', () => {
  it('parseCategoryPayload returns usageUnit and unitType', () => {
    const parsed = parseCategoryPayload({ usageUnit: 'hours', unitType: 'ATV' });
    assert.equal(parsed.usageUnit, 'hours');
    assert.equal(parsed.unitType, 'ATV');
  });

  it('parseCategoryPayload returns marine fields', () => {
    const parsed = parseCategoryPayload({
      usageUnit: 'hours',
      vesselType: 'Center Console',
      lengthFt: 28,
      engineHours: 450,
    });
    assert.equal(parsed.usageUnit, 'hours');
    assert.equal(parsed.vesselType, 'Center Console');
    assert.equal(parsed.lengthFt, 28);
    assert.equal(parsed.engineHours, 450);
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
