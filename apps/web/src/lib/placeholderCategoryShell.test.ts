import { describe, expect, it } from 'vitest';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { buildInventoryWalkthroughSteps } from '@/lib/inventoryWalkthrough.ts';
import { setActiveCategorySchema, inventoryLabels } from '@/lib/copy/activeCategoryCopy.ts';
import { computeSyncReadiness } from '@/lib/syncPresentation.ts';
import type { PublishStatusResponse } from '@/lib/types.ts';

const PLACEHOLDER_CATEGORIES = ['SONGS', 'FURNITURE', 'PAWN'] as const;

const VEHICLE_WORDS = /\b(vehicle|vin|stock)\b/i;

function minimalPublishStatus(): PublishStatusResponse {
  return {
    dealershipId: 'dealer-test',
    dealerName: 'Test Org',
    preparedAt: new Date().toISOString(),
    vehicles: { ready: 2, blocked: 1, warning: 0, total: 3, details: [] },
    readinessSummary: { green: 2, yellow: 0, red: 1 },
    platforms: [],
    summary: { Blocked: 0, 'Needs Approval': 0, 'Partner Required': 0 },
    nextRecommendedAction: 'fix_blocked_vehicles',
    autoSync: { phase: 'idle', lastCompletedAt: null, lastDispatched: null, lastError: null },
  };
}

describe('placeholder category shell copy', () => {
  for (const categoryId of PLACEHOLDER_CATEGORIES) {
    it(`${categoryId} walkthrough steps avoid hardcoded vehicle language`, () => {
      const schema = resolveCategorySchema(categoryId);
      const steps = buildInventoryWalkthroughSteps(schema.asset, schema.performance);
      const text = steps.map(s => `${s.title} ${s.body}`).join(' ');
      expect(text).not.toMatch(VEHICLE_WORDS);
      expect(steps.length).toBe(4);
    });

    it(`${categoryId} inventory labels avoid VIN/stock when not automotive`, () => {
      const schema = resolveCategorySchema(categoryId);
      setActiveCategorySchema(schema);
      const labels = inventoryLabels();
      if (categoryId !== 'AUTOMOTIVE') {
        expect(labels.searchPlaceholder).not.toContain('VIN');
        expect(labels.refColumn).not.toBe('Stock #');
      }
    });

    it(`${categoryId} sync readiness copy uses category asset labels`, () => {
      const schema = resolveCategorySchema(categoryId);
      setActiveCategorySchema(schema);
      const readiness = computeSyncReadiness(minimalPublishStatus());
      expect(readiness.subline).not.toMatch(/\bvehicle\b/i);
      const assetWord = schema.asset.plural.includes(schema.asset.singular)
        ? new RegExp(`\\b${schema.asset.singular}\\b|\\b${schema.asset.plural}\\b`)
        : new RegExp(schema.asset.singular, 'i');
      expect(readiness.blocker?.detail).toMatch(assetWord);
    });
  }
});
