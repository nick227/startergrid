#!/usr/bin/env node
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATOR_FORBIDDEN, scanForbiddenImports } from './lib/boundaryPatterns.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'apps', 'web', 'src');

const { files, violations } = scanForbiddenImports(ROOT, SRC, OPERATOR_FORBIDDEN);

for (const v of violations) {
  console.error(`BOUNDARY VIOLATION  ${v.relPath}:${v.line}`);
  console.error(`  import contains: "${v.pattern}"  (${v.reason})`);
  console.error(`  > ${v.text}`);
}

if (violations.length > 0) {
  console.error(`\n${violations.length} boundary violation(s). apps/web must only import from:`);
  console.error('  @auto-dealer/api-client, local app files, React/Vite dependencies.');
  process.exit(1);
}

console.log(`Operator boundary OK — ${files.length} file(s) scanned, no forbidden imports.`);
