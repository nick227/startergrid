import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const SERVICE_PATH = join(process.cwd(), 'src', 'services', 'marketplace', 'marketplaceQueryService.ts');

function readSelectBlock(source: string, name: string): string {
  const start = source.indexOf(`const ${name}`);
  assert.ok(start >= 0, `${name} not found`);
  const slice = source.slice(start);
  const end = slice.indexOf('\n};');
  assert.ok(end >= 0, `${name} block not closed`);
  return slice.slice(0, end);
}

describe('marketplace Prisma select guard', () => {
  const source = readFileSync(SERVICE_PATH, 'utf8');
  const cardSelect = readSelectBlock(source, 'VEHICLE_CARD_SELECT');
  const detailSelect = readSelectBlock(source, 'VEHICLE_DETAIL_SELECT');

  it('VEHICLE_CARD_SELECT never selects vin', () => {
    assert.ok(!/\bvin\s*:\s*true\b/.test(cardSelect), 'vin must not appear in VEHICLE_CARD_SELECT');
  });

  it('VEHICLE_DETAIL_SELECT selects vin for detail-only projection', () => {
    assert.ok(/\bvin\s*:\s*true\b/.test(detailSelect), 'vin must be selected in VEHICLE_DETAIL_SELECT');
  });

  it('card and detail selects are separate constants', () => {
    assert.notEqual(cardSelect, detailSelect);
  });
});
