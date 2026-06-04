import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeChecksum } from '../services/publishing/artifactWriterService.js';

describe('computeChecksum', () => {
  it('is deterministic — same input produces same output', () => {
    const input = 'hello world';
    assert.equal(computeChecksum(input), computeChecksum(input));
  });

  it('different inputs produce different outputs', () => {
    assert.notEqual(computeChecksum('foo'), computeChecksum('bar'));
  });

  it('returns a 64-character hex string (SHA-256)', () => {
    const result = computeChecksum('test content');
    assert.equal(result.length, 64);
    assert.match(result, /^[0-9a-f]{64}$/);
  });

  it('empty string has a stable checksum', () => {
    const empty = computeChecksum('');
    assert.equal(empty.length, 64);
    assert.equal(computeChecksum(''), empty);
  });
});
