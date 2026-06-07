import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import type { BoundaryViolation } from '../../scripts/lib/boundaryPatterns.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
const OPERATOR_SRC = join(ROOT, 'apps', 'web', 'src');
const { OPERATOR_FORBIDDEN, scanForbiddenImports } = createRequire(import.meta.url)(
  join(ROOT, 'scripts', 'lib', 'boundaryPatterns.js'),
) as typeof import('../../scripts/lib/boundaryPatterns.js');

describe('apps/web source — no marketplace SDK imports', () => {
  const { files, violations } = scanForbiddenImports(ROOT, OPERATOR_SRC, OPERATOR_FORBIDDEN);

  it('at least one operator source file exists (guard against empty walk)', () => {
    assert.ok(files.length > 0, 'expected to find .ts/.tsx files in apps/web/src/');
  });

  for (const { pattern } of OPERATOR_FORBIDDEN) {
    it(`no file imports "${pattern}" (marketplace boundary)`, () => {
      const hits = violations.filter((v: BoundaryViolation) => v.pattern === pattern).map((v: BoundaryViolation) => `${v.relPath}: ${v.text}`);
      assert.deepEqual(hits, [],
        `Operator boundary violated — import of "${pattern}" found:\n${hits.join('\n')}`);
    });
  }
});
