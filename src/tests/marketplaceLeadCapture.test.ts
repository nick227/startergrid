import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { marketplaceLeadCaptureSchema } from '../server/requestValidation.js';
import { MARKETPLACE_PLATFORM_SLUG } from '../services/channel/channelMetrics.js';

describe('marketplaceLeadCaptureSchema', () => {
  it('accepts a minimal contact payload', () => {
    const result = marketplaceLeadCaptureSchema.safeParse({ contactName: 'Jane Doe' });
    assert.equal(result.success, true);
  });

  it('rejects empty contact payload', () => {
    const result = marketplaceLeadCaptureSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it('rejects unknown fields (boundary safety)', () => {
    const result = marketplaceLeadCaptureSchema.safeParse({
      contactName: 'Jane',
      vin: '1HGBH41JXMN109186',
      stockNumber: 'STK-001',
      dealerId: 'dealer-a',
    });
    assert.equal(result.success, false);
  });

  it('rejects invalid email', () => {
    const result = marketplaceLeadCaptureSchema.safeParse({ contactEmail: 'not-an-email' });
    assert.equal(result.success, false);
  });
});

describe('marketplace lead platform slug', () => {
  it('uses a dedicated consumer marketplace slug', () => {
    assert.equal(MARKETPLACE_PLATFORM_SLUG, 'consumer-marketplace');
  });
});
