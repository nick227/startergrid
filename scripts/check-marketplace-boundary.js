#!/usr/bin/env node
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARKETPLACE_FORBIDDEN, scanForbiddenImports } from './lib/boundaryPatterns.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'apps', 'marketplace', 'src');

const { files, violations } = scanForbiddenImports(ROOT, SRC, MARKETPLACE_FORBIDDEN);

for (const v of violations) {
  console.error(`BOUNDARY VIOLATION  ${v.relPath}:${v.line}`);
  console.error(`  import contains: "${v.pattern}"  (${v.reason})`);
  console.error(`  > ${v.text}`);
}

if (violations.length > 0) {
  console.error(`\n${violations.length} boundary violation(s). apps/marketplace must only import from:`);
  console.error('  @dealer-marketplace/client, local app files, React/Vite dependencies.');
  process.exit(1);
}

console.log(`Marketplace boundary OK — ${files.length} file(s) scanned, no forbidden imports.`);
