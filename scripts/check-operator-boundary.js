#!/usr/bin/env node
// Scans apps/web/src/ for forbidden marketplace imports.
// Operator UI must use @auto-dealer/api-client only — never the consumer SDK.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC  = join(ROOT, 'apps', 'web', 'src');

const FORBIDDEN = [
  { pattern: '@dealer-marketplace/client', reason: 'marketplace API client' },
  { pattern: 'apps/marketplace',           reason: 'marketplace UI source' },
  { pattern: 'packages/marketplace-client', reason: 'marketplace client package path' },
];

function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else if (['.ts', '.tsx'].includes(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(SRC);
let violations = 0;

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  const lines   = content.split('\n');
  const relPath = relative(ROOT, file).replace(/\\/g, '/');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/\bimport\b|\brequire\b/.test(line)) continue;

    for (const { pattern, reason } of FORBIDDEN) {
      if (line.includes(pattern)) {
        console.error(`BOUNDARY VIOLATION  ${relPath}:${i + 1}`);
        console.error(`  import contains: "${pattern}"  (${reason})`);
        console.error(`  > ${line.trim()}`);
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} boundary violation(s). apps/web must only import from:`);
  console.error('  @auto-dealer/api-client, local app files, React/Vite dependencies.');
  process.exit(1);
}

console.log(`Operator boundary OK — ${files.length} file(s) scanned, no forbidden imports.`);
