import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeVin,
  validateVinFormat,
  validateVin,
  calculateVinCheckDigit,
} from '../services/inventory/vin/vinValidator.js';

describe('normalizeVin', () => {
  it('trims whitespace', () => {
    assert.equal(normalizeVin('  1HGBH41JXMN109186  '), '1HGBH41JXMN109186');
  });
  it('converts to uppercase', () => {
    assert.equal(normalizeVin('1hgbh41jxmn109186'), '1HGBH41JXMN109186');
  });
  it('strips internal spaces', () => {
    assert.equal(normalizeVin('1HGBH 41J XMN109186'), '1HGBH41JXMN109186');
  });
  it('strips dashes', () => {
    assert.equal(normalizeVin('1HGBH41J-XMN109186'), '1HGBH41JXMN109186');
  });
});

describe('validateVinFormat', () => {
  it('accepts a valid 17-char VIN', () => {
    assert.deepEqual(validateVinFormat('1HGBH41JXMN109186'), { valid: true });
  });
  it('rejects VINs shorter than 17 chars', () => {
    const result = validateVinFormat('1HGBH41JXMN10918');
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('17'));
  });
  it('rejects VINs longer than 17 chars', () => {
    const result = validateVinFormat('1HGBH41JXMN109186X');
    assert.equal(result.valid, false);
  });
  it('rejects VINs containing I', () => {
    const result = validateVinFormat('1HGBH41IXMN109186');
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes("'I'"));
  });
  it('rejects VINs containing O', () => {
    const result = validateVinFormat('1HGBH41OXMN109186');
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes("'O'"));
  });
  it('rejects VINs containing Q', () => {
    const result = validateVinFormat('1HGBH41QXMN109186');
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes("'Q'"));
  });
  it('rejects VINs with spaces (after normalization, pre-check)', () => {
    const result = validateVinFormat('1HGBH41J MN109186');
    assert.equal(result.valid, false);
  });
});

describe('calculateVinCheckDigit', () => {
  it('returns expected check digit for known VIN', () => {
    // 1HGBH41JXMN109186 — position 8 is 'X', expected check digit
    const vin = '1HGBH41JXMN109186';
    const expected = calculateVinCheckDigit(vin);
    assert.equal(expected, vin[8]);
  });
  it('returns a single char that is 0-9 or X', () => {
    const result = calculateVinCheckDigit('4T1C11AK5MU481526');
    assert.ok(/^[0-9X]$/.test(result), `Expected digit or X, got '${result}'`);
  });
});

describe('validateVin', () => {
  it('returns valid=true for a well-formed 17-char VIN', () => {
    const result = validateVin('1HGBH41JXMN109186');
    assert.equal(result.valid, true);
  });
  it('returns valid=false for too-short VIN', () => {
    const result = validateVin('TOOSHORT');
    assert.equal(result.valid, false);
    assert.ok(!('checkDigitOk' in result));
  });
  it('normalizes input before validation', () => {
    const result = validateVin('  1hgbh41jxmn109186  ');
    assert.equal(result.valid, true);
  });
  it('reports checkDigitOk on valid-format VIN', () => {
    const result = validateVin('1HGBH41JXMN109186');
    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(typeof result.checkDigitOk, 'boolean');
    }
  });
  it('valid=false for VIN with forbidden chars', () => {
    const result = validateVin('1HGBH41IXMN109186');
    assert.equal(result.valid, false);
  });
});
