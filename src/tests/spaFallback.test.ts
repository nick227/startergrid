import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';

describe('SPA fallback', () => {
  it('serves the splash page for unknown pages but a JSON 404 for unknown API paths', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'spa-fallback-'));
    const previous = process.cwd();
    try {
      await mkdir(path.join(dir, 'apps/splash/dist'), { recursive: true });
      await writeFile(path.join(dir, 'apps/splash/dist/index.html'), '<html>splash</html>');
      process.chdir(dir); // buildApp resolves SPA bundles from the working directory
      const app = buildApp({} as PrismaClient);
      const page = await app.inject({ method: 'GET', url: '/pricing' });
      assert.equal(page.statusCode, 200);
      assert.match(page.body, /splash/);
      const api = await app.inject({ method: 'GET', url: '/api/does-not-exist' });
      assert.equal(api.statusCode, 404);
      assert.deepEqual(api.json(), { error: 'Not found' });
      await app.close();
    } finally {
      process.chdir(previous);
      await rm(dir, { recursive: true, force: true });
    }
  });
});
