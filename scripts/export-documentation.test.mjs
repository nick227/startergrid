import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

function fixture(t, visibility = 'public') {
  const root = mkdtempSync(join(tmpdir(), 'startergrid-doc-export-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['scripts', 'apps/web/src/docs', 'apps/web/src/lib/docs', 'docs/internal']) mkdirSync(join(root, dir), { recursive: true });
  const script = join(root, 'scripts/export-documentation.mjs');
  copyFileSync(new URL('./export-documentation.mjs', import.meta.url), script);
  writeFileSync(join(root, 'apps/web/src/docs/example.md'), `---\n${visibility ? `visibility: ${visibility}\n` : ''}id: example\nfeature: example\ntype: reference\naudience: staff, developer\ntitle: Example\nsummary: Public product behavior\ntags: example\nsynonyms: example\nupdated: 2026-10-27\n---\nPublic product instructions.\n`);
  writeFileSync(join(root, 'apps/web/src/docs/_excluded.md'), 'EXCLUDED_AUTHORING_SENTINEL');
  writeFileSync(join(root, 'docs/internal/private.md'), 'INTERNAL_RUNBOOK_SENTINEL');
  return { root, script };
}

test('audience does not control visibility; only explicit public records export', t => {
  const { script } = fixture(t);
  const output = execFileSync(process.execPath, [script], { encoding: 'utf8' });
  const data = JSON.parse(output);
  assert.equal(data.records.length, 1);
  assert.equal(data.records[0].frontmatter.audience, 'staff, developer');
  assert.equal(data.records[0].frontmatter.visibility, 'public');
  assert.doesNotMatch(output, /SENTINEL/);
});
for (const visibility of ['internal', 'developer', '']) {
  test(`rejects ${visibility || 'missing'} publication visibility`, t => {
    const { script } = fixture(t, visibility);
    const result = spawnSync(process.execPath, [script, '--write'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /only explicitly public|missing visibility/);
  });
}
test('generated browser loaders only import validated public articles', t => {
  const { script, root } = fixture(t);
  execFileSync(process.execPath, [script, '--write']);
  const loaders = readFileSync(join(root, 'apps/web/src/lib/docs/loaders.ts'), 'utf8');
  assert.match(loaders, /example\.md\?raw/);
  assert.doesNotMatch(loaders, /excluded|private|internal|SENTINEL/);
});
