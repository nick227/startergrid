import assert from 'node:assert/strict';
import test from 'node:test';
import { platformProfiles } from '../data/platformProfiles.js';
import { runRiskMatrix } from '../services/platform/riskMatrixService.js';

test('risk matrix scenarios meet their readiness expectations', () => {
  const results = runRiskMatrix();
  const failures = results.filter((result) => !result.passedExpectation);

  assert.equal(results.length, platformProfiles.length * 5);
  assert.deepEqual(
    failures.map((result) => ({
      scenario: result.scenario,
      platformSlug: result.platformSlug,
      expected: result.expected,
      actual: result.actual,
      issues: result.issues
    })),
    []
  );
});

test('baseline is green while strict profile keeps review-sensitive profiles yellow', () => {
  const results = runRiskMatrix();
  const baseline = results.filter((result) => result.scenario === 'BASELINE');
  const strict = results.filter((result) => result.scenario === 'STRICT_PROFILE');

  assert.equal(baseline.every((result) => result.actual === 'GREEN'), true);
  assert.equal(strict.some((result) => result.actual === 'YELLOW'), true);
});
