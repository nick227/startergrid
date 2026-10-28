import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalFixtureEnvironment, MULTI_ENTITY_BUSINESSES } from '../scripts/dev/multiEntityFixture.js';
import { resolveCategorySchema } from '../../packages/category-schemas/src/index.js';

test('multi-entity mutations fail closed outside explicit local development', () => {
  const env = { NODE_ENV: 'development', DEALERGRID_MULTI_ENTITY_SEED: '1', DATABASE_URL: 'mysql://user:password@localhost:3307/demo' };
  assert.doesNotThrow(() => assertLocalFixtureEnvironment(env));
  for (const overrides of [
    { NODE_ENV: 'production' }, { NODE_ENV: 'test' }, { DEALERGRID_MULTI_ENTITY_SEED: '' },
    { DATABASE_URL: 'mysql://user:password@remote.example/demo' }, { DATABASE_URL: '' },
  ]) assert.throws(() => assertLocalFixtureEnvironment({ ...env, ...overrides }));
});

test('fixture categories use existing registry and do not enable unsupported public sites', () => {
  assert.equal(new Set(MULTI_ENTITY_BUSINESSES.map(b => b.key)).size, 4);
  for (const business of MULTI_ENTITY_BUSINESSES) {
    assert.equal(resolveCategorySchema(business.category).id, business.category);
    assert.equal(business.items.length, 2);
  }
  assert.equal(resolveCategorySchema('SONGS').marketplace.consumerEnabled, false);
  assert.equal(resolveCategorySchema('APPAREL').marketplace.consumerEnabled, true);
  assert.equal(resolveCategorySchema('APPAREL').inventorySource, 'category_item');
});
