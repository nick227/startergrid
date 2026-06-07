import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BusinessCategory } from '@prisma/client';
import type { DealershipProfile } from '@prisma/client';
import {
  BUSINESS_CATEGORY_IDS,
  CATEGORY_REGISTRY,
  categoryIdToSlug,
  categorySlugToId,
  resolveCategorySchema,
  resolveCategorySchemaStrict,
} from '../../packages/category-schemas/src/index.js';
import { buildApp } from '../server/app.js';
import type { PrismaClient } from '@prisma/client';

type _DealerHasCategory = Pick<DealershipProfile, 'businessCategory'>;
void (null as unknown as _DealerHasCategory);

describe('BusinessCategory enum — values match schema', () => {
  it('Prisma enum values match BUSINESS_CATEGORY_IDS registry', () => {
    const prismaValues = Object.values(BusinessCategory).sort();
    const registryValues = [...BUSINESS_CATEGORY_IDS].sort();
    assert.deepEqual(prismaValues, registryValues);
  });

  it('registry has an entry for every enum value', () => {
    for (const id of BUSINESS_CATEGORY_IDS) {
      assert.ok(CATEGORY_REGISTRY[id], `missing registry entry for ${id}`);
    }
  });
});

describe('resolveCategorySchema — known categories', () => {
  for (const id of BUSINESS_CATEGORY_IDS) {
    it(`${id} resolves without throwing`, () => {
      const schema = resolveCategorySchema(id);
      assert.equal(schema.id, id);
      assert.ok(schema.label.length > 0);
      assert.ok(schema.copy.inventoryTitle.length > 0);
      assert.ok(schema.asset.singular.length > 0);
      assert.ok(schema.channel.singular.length > 0);
    });
  }

  it('AUTOMOTIVE is active with vehicle labels', () => {
    const schema = resolveCategorySchema('AUTOMOTIVE');
    assert.equal(schema.status, 'active');
    assert.equal(schema.label, 'Automotive');
    assert.equal(schema.asset.singular, 'vehicle');
    assert.equal(schema.asset.refLabel, 'Stock #');
    assert.equal(schema.asset.idLabel, 'VIN');
    assert.equal(schema.copy.refColumn, 'Stock #');
    assert.equal(schema.copy.titleColumn, 'Vehicle');
    assert.equal(schema.lifecycle.active, 'On the lot');
    assert.equal(schema.lifecycle.sold, 'Sold');
    assert.ok(schema.fields.length > 0);
  });

  it('automotive assetLead formatter uses year/make/model and stock #', () => {
    const schema = resolveCategorySchema('AUTOMOTIVE');
    const lead = schema.formatters.assetLead({
      year: 2024,
      make: 'Honda',
      model: 'Civic',
      stockNumber: 'A123',
    });
    assert.equal(lead, '2024 Honda Civic · Stock #A123');
  });

  it('TRAILERS_POWERSPORTS_RV is active with unit labels', () => {
    const schema = resolveCategorySchema('TRAILERS_POWERSPORTS_RV');
    assert.equal(schema.status, 'active');
    assert.equal(schema.asset.singular, 'unit');
    assert.equal(schema.asset.idLabel, 'Serial #');
    assert.equal(schema.marketplace.consumerEnabled, true);
    assert.equal(schema.marketplace.slug, 'trailers-powersports-rv');
  });

  it('trailers assetMeta formatter shows hours from categoryPayload', () => {
    const schema = resolveCategorySchema('TRAILERS_POWERSPORTS_RV');
    const meta = schema.formatters.assetMeta({
      mileage: 125,
      priceCents: 749900,
      categoryPayload: { usageUnit: 'hours' },
    });
    assert.match(meta, /125 hrs/);
  });
});

describe('resolveCategorySchema — placeholders', () => {
  const placeholderIds = BUSINESS_CATEGORY_IDS.filter(
    id => id !== 'AUTOMOTIVE' && id !== 'TRAILERS_POWERSPORTS_RV',
  );

  for (const id of placeholderIds) {
    it(`${id} resolves as placeholder with generic asset/channel labels`, () => {
      const schema = resolveCategorySchema(id);
      assert.equal(schema.status, 'placeholder');
      assert.equal(schema.marketplace.consumerEnabled, false);
      assert.equal(schema.asset.singular, 'asset');
      assert.equal(schema.asset.plural, 'assets');
      assert.equal(schema.asset.refLabel, 'Ref #');
      assert.equal(schema.channel.singular, 'channel');
      assert.equal(schema.channel.plural, 'channels');
      assert.equal(schema.fields.length, 0);
    });
  }
});

describe('resolveCategorySchema — unknown fallback', () => {
  it('unknown string returns generic fallback without throwing', () => {
    const schema = resolveCategorySchema('NOT_A_REAL_CATEGORY');
    assert.equal(schema.status, 'placeholder');
    assert.equal(schema.asset.singular, 'asset');
    assert.equal(schema.label, 'NOT_A_REAL_CATEGORY');
  });

  it('resolveCategorySchemaStrict returns registered schema', () => {
    assert.equal(resolveCategorySchemaStrict('FURNITURE').id, 'FURNITURE');
  });
});

describe('marketplace slug helpers', () => {
  it('categoryIdToSlug and categorySlugToId round-trip registered categories', () => {
    for (const id of BUSINESS_CATEGORY_IDS) {
      const slug = categoryIdToSlug(id);
      assert.equal(categorySlugToId(slug), id);
    }
  });

  it('every registered schema includes marketplace metadata', () => {
    for (const id of BUSINESS_CATEGORY_IDS) {
      const schema = resolveCategorySchema(id);
      assert.ok(schema.marketplace.slug.length > 0);
      assert.equal(schema.marketplace.slug, categoryIdToSlug(id));
      assert.ok(schema.marketplace.tagline.length > 0);
    }
  });
});

describe('GET /api/dealers — businessCategory on org responses', () => {
  it('returns businessCategory AUTOMOTIVE by default', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const app = buildApp({
      dealershipProfile: {
        findMany: async () => [{
          id: 'dealer-001',
          legalName: 'Test Motors',
          dbaName: 'Test Motors LLC',
          businessCategory: 'AUTOMOTIVE',
          createdAt,
        }],
      },
    } as unknown as PrismaClient);

    const res = await app.inject({
      method: 'GET',
      url: '/api/dealers',
      headers: { 'x-operator-id': 'dev-operator' },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json() as { dealers: Array<{ businessCategory: string }> };
    assert.equal(body.dealers.length, 1);
    assert.equal(body.dealers[0]!.businessCategory, 'AUTOMOTIVE');
  });

  it('returns non-automotive businessCategory when set on org', async () => {
    const app = buildApp({
      dealershipProfile: {
        findMany: async () => [{
          id: 'dealer-002',
          legalName: 'Tune Shop',
          dbaName: null,
          businessCategory: 'SONGS',
          createdAt: new Date(),
        }],
      },
    } as unknown as PrismaClient);

    const res = await app.inject({
      method: 'GET',
      url: '/api/dealers',
      headers: { 'x-operator-id': 'dev-operator' },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json() as { dealers: Array<{ businessCategory: string }> };
    assert.equal(body.dealers[0]!.businessCategory, 'SONGS');
  });
});

describe('DealershipProfile.businessCategory — default', () => {
  it('Prisma BusinessCategory includes AUTOMOTIVE', () => {
    assert.equal(BusinessCategory.AUTOMOTIVE, 'AUTOMOTIVE');
  });
});
