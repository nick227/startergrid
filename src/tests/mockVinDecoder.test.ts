import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MockVinDecoder } from '../services/inventory/vin/mockVinDecoder.js';

const decoder = new MockVinDecoder();

describe('MockVinDecoder', () => {
  it('has name "mock"', () => {
    assert.equal(decoder.name, 'mock');
  });

  it('decodes known Toyota Camry VIN', async () => {
    const result = await decoder.decode('4T1C11AK5MU481526');
    assert.equal(result.decoded, true);
    assert.equal(result.valid, true);
    assert.equal(result.make, 'Toyota');
    assert.equal(result.model, 'Camry');
    assert.equal(result.year, 2021);
    assert.equal(result.provider, 'mock');
    assert.equal(result.warnings.length, 0);
  });

  it('decodes known Ford F-150 VIN', async () => {
    const result = await decoder.decode('1FTEW1EP3LFA12345');
    assert.equal(result.decoded, true);
    assert.equal(result.make, 'Ford');
    assert.equal(result.bodyStyle, 'Truck');
    assert.equal(result.drivetrain, '4WD');
  });

  it('returns decoded=false for unknown VIN', async () => {
    const result = await decoder.decode('1ZZZZZZZZZZZZZZZ1');
    assert.equal(result.decoded, false);
    assert.equal(result.valid, true);
    assert.ok(result.warnings.length > 0);
  });

  it('normalizes lowercase input', async () => {
    const result = await decoder.decode('4t1c11ak5mu481526');
    assert.equal(result.decoded, true);
    assert.equal(result.vin, '4T1C11AK5MU481526');
  });

  it('decodes Tesla Model 3 as Electric', async () => {
    const result = await decoder.decode('5YJ3E1EA0NF123456');
    assert.equal(result.fuelType, 'Electric');
    assert.equal(result.drivetrain, 'AWD');
  });
});
