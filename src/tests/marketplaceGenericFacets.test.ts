// Generic-category facet tests for getMarketplaceFacets.
//
// Proves the categoryPayload-stored enum facet path still works after the
// filterStorage contract reconciliation: for a non-automotive category, facet
// counts are read from CategoryInventoryItem via the facet's payloadKey, and
// only options with a positive count are returned (descending by count).
//
// Pure — no DB. A capturing mock answers categoryInventoryItem.count from the
// `where` it receives.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { getMarketplaceFacets } from '../services/marketplace/marketplaceQueryService.js';

type CountArgs = {
  where: {
    categoryId?: string;
    priceCents?: unknown;
    data?: { path: string[]; equals: unknown };
  };
};

describe('getMarketplaceFacets — generic category (BOATS) categoryPayload facets', () => {
  it('counts vesselType facet options via payloadKey and drops zero-count options', async () => {
    // Counts keyed by the categoryPayload value the query filters on.
    const vesselCounts: Record<string, number> = {
      'Pontoon': 5,
      'Center Console': 2,
      'Sailboat': 0, // present in schema, absent in inventory → must be dropped
    };

    const seenFacetPaths: string[] = [];

    const prisma = {
      categoryInventoryItem: {
        count: async (args: CountArgs) => {
          // Facet option query: { data: { path: [payloadKey], equals } }
          if (args.where.data) {
            seenFacetPaths.push(args.where.data.path[0]!);
            return vesselCounts[String(args.where.data.equals)] ?? 0;
          }
          // Price-range query — irrelevant here, report empty.
          return 0;
        },
      },
    } as unknown as PrismaClient;

    const result = await getMarketplaceFacets(prisma, { category: 'BOATS' });

    // The facet path the query used must be the schema's payloadKey, not the field key.
    assert.ok(seenFacetPaths.length > 0, 'facet counts should have been queried');
    assert.ok(
      seenFacetPaths.every(p => p === 'vesselType'),
      `all facet queries should target the vesselType payloadKey, saw: ${seenFacetPaths.join(',')}`,
    );

    const vessel = result.customFacets?.['vesselType'];
    assert.ok(vessel, 'vesselType facet should be present');
    const byValue = Object.fromEntries(vessel!.map(o => [o.value, o.count]));
    assert.equal(byValue['Pontoon'], 5);
    assert.equal(byValue['Center Console'], 2);
    assert.ok(!('Sailboat' in byValue), 'zero-count option must be dropped');

    // Descending by count.
    assert.deepEqual(vessel!.map(o => o.value), ['Pontoon', 'Center Console']);
  });

  it('drops every option when no facet value has inventory', async () => {
    const prisma = {
      categoryInventoryItem: { count: async () => 0 },
    } as unknown as PrismaClient;

    const result = await getMarketplaceFacets(prisma, { category: 'BOATS' });
    // The facet key is present but carries no surviving options.
    assert.deepEqual(result.customFacets?.['vesselType'], []);
  });
});
