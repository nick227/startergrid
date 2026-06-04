import 'dotenv/config';
import type { ReadinessColor, ValidationScenarioKind, ValidationScenarioResult } from '../../lib/types.js';
import { runRiskMatrix } from '../../services/platform/riskMatrixService.js';

function icon(readiness: ReadinessColor) {
  return readiness === 'GREEN' ? '✅' : readiness === 'YELLOW' ? '⚠️ ' : '❌';
}

const scenarios: ValidationScenarioResult[] = runRiskMatrix();

console.log('\nV2.5 Platform Profile Risk Matrix');
console.log('=================================');
console.log('Controlled bubble only: proves expected passes and expected failures.\n');

const grouped = scenarios.reduce((acc, item) => {
  if (!acc.has(item.scenario)) acc.set(item.scenario, []);
  acc.get(item.scenario)!.push(item);
  return acc;
}, new Map<ValidationScenarioKind, ValidationScenarioResult[]>());
for (const [scenario, rows] of grouped.entries()) {
  console.log(`\n${scenario}`);
  console.log('-'.repeat(String(scenario).length));
  for (const row of rows) {
    const passIcon = row.passedExpectation ? '✓' : 'x';
    console.log(`${passIcon} ${icon(row.actual)} ${row.platformName} → ${row.actual} expected ${row.expected.join('/')}`);
    if (row.scenario === 'STRICT_PROFILE' || !row.passedExpectation) {
      for (const line of row.why.slice(0, 3)) console.log(`    ${line}`);
    }
  }
}

const passed = scenarios.filter((item) => item.passedExpectation).length;
const failed = scenarios.length - passed;
console.log('\n----------------------------------');
console.log(`${passed}/${scenarios.length} scenario expectations passed`);
console.log('Baseline GREEN proves the happy path still works.');
console.log('Negative RED/YELLOW proves green is no longer meaningless.');

if (failed) process.exit(1);
