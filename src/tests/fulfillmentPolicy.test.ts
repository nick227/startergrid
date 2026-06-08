import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BUSINESS_CATEGORY_IDS,
  resolveCategorySchema,
  getFulfillmentPolicy,
  getFulfillmentSummary,
} from '../../packages/category-schemas/src/index.js';

const DIGITAL_IDS = ['SONGS', 'EBOOKS', 'DIGITAL_ART', 'VIDEO_DISTRIBUTION'] as const;
const VEHICLE_IDS = ['AUTOMOTIVE', 'BOATS', 'TRAILERS_POWERSPORTS_RV'] as const;
const REAL_ESTATE_IDS = ['HOMES', 'APARTMENTS', 'VACATION_RENTALS', 'COMMERCIAL_PROPERTY'] as const;
const SHIPPABLE_IDS = ['APPAREL', 'SNEAKERS', 'WATCHES', 'COLLECTIBLES'] as const;

describe('getFulfillmentPolicy — digital categories', () => {
  for (const id of DIGITAL_IDS) {
    it(`${id} has digital-only allowedModes`, () => {
      const schema = resolveCategorySchema(id);
      const policy = getFulfillmentPolicy(schema);
      assert.ok(policy, `${id} must have a fulfillmentPolicy`);
      assert.deepEqual(policy.allowedModes, ['digital']);
      assert.equal(policy.defaultMode, 'digital');
    });

    it(`${id} does not claim shipping or physical pickup`, () => {
      const schema = resolveCategorySchema(id);
      const policy = getFulfillmentPolicy(schema);
      assert.ok(policy);
      assert.ok(!policy.allowedModes.includes('pickup'));
      assert.ok(!policy.allowedModes.includes('third_party_shipping'));
      assert.ok(!policy.allowedModes.includes('local_delivery'));
    });

    it(`${id} getFulfillmentSummary has online method and no shipping cost`, () => {
      const schema = resolveCategorySchema(id);
      const summary = getFulfillmentSummary(schema);
      assert.ok(summary);
      assert.ok(summary.method?.toLowerCase().includes('online'));
      assert.ok(summary.cost && !summary.cost.toLowerCase().includes('shipping may'));
    });
  }
});

describe('getFulfillmentPolicy — vehicle categories', () => {
  for (const id of VEHICLE_IDS) {
    it(`${id} allows pickup and contact_seller`, () => {
      const schema = resolveCategorySchema(id);
      const policy = getFulfillmentPolicy(schema);
      assert.ok(policy, `${id} must have a fulfillmentPolicy`);
      assert.ok(policy.allowedModes.includes('pickup'));
      assert.ok(policy.allowedModes.includes('contact_seller'));
    });

    it(`${id} does not promise digital delivery or free shipping`, () => {
      const schema = resolveCategorySchema(id);
      const policy = getFulfillmentPolicy(schema);
      assert.ok(policy);
      assert.ok(!policy.allowedModes.includes('digital'));
      assert.ok(!policy.allowedModes.includes('third_party_shipping'));
      const cost = policy.costLabel ?? '';
      assert.ok(!cost.toLowerCase().includes('free'), `${id} costLabel must not claim free delivery`);
    });

    it(`${id} costLabel acknowledges extra cost`, () => {
      const schema = resolveCategorySchema(id);
      const policy = getFulfillmentPolicy(schema);
      assert.ok(policy?.costLabel?.toLowerCase().includes('may cost extra') || policy?.costLabel?.toLowerCase().includes('transport may'));
    });
  }
});

describe('getFulfillmentPolicy — real estate categories', () => {
  for (const id of REAL_ESTATE_IDS) {
    it(`${id} only allows contact_seller (no delivery or shipping modes)`, () => {
      const schema = resolveCategorySchema(id);
      const policy = getFulfillmentPolicy(schema);
      assert.ok(policy, `${id} must have a fulfillmentPolicy`);
      assert.deepEqual(policy.allowedModes, ['contact_seller']);
      assert.equal(policy.defaultMode, 'contact_seller');
    });

    it(`${id} has no shipping or delivery in costLabel`, () => {
      const schema = resolveCategorySchema(id);
      const policy = getFulfillmentPolicy(schema);
      assert.ok(policy);
      assert.ok(!policy.costLabel, `${id} must not claim a shipping/delivery cost`);
      const method = (policy.methodLabel ?? '').toLowerCase();
      assert.ok(!method.includes('ship'), `${id} methodLabel must not mention shipping`);
      assert.ok(!method.includes('deliver'), `${id} methodLabel must not mention delivery`);
    });
  }
});

describe('getFulfillmentPolicy — shippable goods', () => {
  for (const id of SHIPPABLE_IDS) {
    it(`${id} allows third_party_shipping`, () => {
      const schema = resolveCategorySchema(id);
      const policy = getFulfillmentPolicy(schema);
      assert.ok(policy, `${id} must have a fulfillmentPolicy`);
      assert.ok(policy.allowedModes.includes('third_party_shipping'));
    });

    it(`${id} does not claim digital delivery`, () => {
      const schema = resolveCategorySchema(id);
      const policy = getFulfillmentPolicy(schema);
      assert.ok(policy);
      assert.ok(!policy.allowedModes.includes('digital'));
    });
  }
});

describe('getFulfillmentPolicy — safe fallback for missing policy', () => {
  it('returns undefined for a schema with no fulfillmentPolicy', () => {
    const schema = resolveCategorySchema('NOT_A_REAL_CATEGORY');
    assert.equal(getFulfillmentPolicy(schema), undefined);
  });

  it('getFulfillmentSummary returns undefined when no policy', () => {
    const schema = resolveCategorySchema('NOT_A_REAL_CATEGORY');
    assert.equal(getFulfillmentSummary(schema), undefined);
  });

  it('getFulfillmentPolicy never throws for any registered category', () => {
    for (const id of BUSINESS_CATEGORY_IDS) {
      const schema = resolveCategorySchema(id);
      assert.doesNotThrow(() => getFulfillmentPolicy(schema));
    }
  });
});

describe('getFulfillmentPolicy — every registered category is intentional', () => {
  it('every category with a policy has a non-empty allowedModes and valid defaultMode', () => {
    for (const id of BUSINESS_CATEGORY_IDS) {
      const schema = resolveCategorySchema(id);
      const policy = schema.fulfillmentPolicy;
      if (!policy) continue;
      assert.ok(policy.allowedModes.length > 0, `${id} allowedModes must not be empty`);
      assert.ok(
        policy.allowedModes.includes(policy.defaultMode),
        `${id} defaultMode '${policy.defaultMode}' must be in allowedModes`,
      );
    }
  });

  it('all 18 registered categories have a fulfillmentPolicy defined', () => {
    const missing: string[] = [];
    for (const id of BUSINESS_CATEGORY_IDS) {
      const schema = resolveCategorySchema(id);
      if (!schema.fulfillmentPolicy) missing.push(id);
    }
    assert.deepEqual(missing, [], `Missing fulfillmentPolicy for: ${missing.join(', ')}`);
  });
});

describe('getFulfillmentSummary — shape', () => {
  it('automotive summary has method, timing, cost, and message', () => {
    const schema = resolveCategorySchema('AUTOMOTIVE');
    const summary = getFulfillmentSummary(schema);
    assert.ok(summary);
    assert.ok(summary.method && summary.method.length > 0);
    assert.ok(summary.timing && summary.timing.length > 0);
    assert.ok(summary.cost && summary.cost.length > 0);
    assert.ok(summary.message && summary.message.length > 0);
  });

  it('real estate summary has no cost field', () => {
    const schema = resolveCategorySchema('HOMES');
    const summary = getFulfillmentSummary(schema);
    assert.ok(summary);
    assert.equal(summary.cost, undefined);
  });
});
