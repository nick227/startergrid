import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

export const MARKETPLACE_FORBIDDEN = [
  { pattern: '@auto-dealer/api-client', reason: 'operator API client' },
  { pattern: 'auto-dealer-onboarding-poc-v1', reason: 'root backend package' },
  { pattern: 'apps/web', reason: 'operator UI source' },
  { pattern: '/src/services', reason: 'backend services' },
  { pattern: '/src/server', reason: 'backend server' },
  { pattern: '/src/lib/prisma', reason: 'Prisma client' },
  { pattern: '../../../src', reason: 'relative escape to backend' },
  { pattern: '../../src', reason: 'relative escape to backend' },
];

export const OPERATOR_FORBIDDEN = [
  { pattern: '@dealer-marketplace/client', reason: 'marketplace API client' },
  { pattern: 'apps/marketplace', reason: 'marketplace UI source' },
  { pattern: 'packages/marketplace-client', reason: 'marketplace client package path' },
];

export function walkSourceFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkSourceFiles(full));
    } else if (['.ts', '.tsx'].includes(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

export function scanForbiddenImports(root, srcDir, forbidden) {
  const files = walkSourceFiles(srcDir);
  const violations = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const relPath = relative(root, file).replace(/\\/g, '/');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!/\bimport\b|\brequire\b/.test(line)) continue;

      for (const { pattern, reason } of forbidden) {
        if (line.includes(pattern)) {
          violations.push({ relPath, line: i + 1, pattern, reason, text: line.trim() });
        }
      }
    }
  }

  return { files, violations };
}
