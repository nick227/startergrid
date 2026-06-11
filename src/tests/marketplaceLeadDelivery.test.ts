import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mockDealership } from '../fixtures/dealers/dealership.fixture.js';
import { mockVehicles } from '../fixtures/vehicles/vehicles.fixture.js';
import {
  buildMarketplaceLeadWebhookPayload,
  planAndPersistMarketplaceLeadDeliveries,
  planMarketplaceLeadDeliveries,
} from '../services/leadDelivery/marketplaceLeadDelivery.js';
import type {
  LeadDeliveryDestination,
  MarketplaceLeadDeliveryContext,
} from '../services/leadDelivery/leadDeliveryTypes.js';

const BASE_CONTEXT: MarketplaceLeadDeliveryContext = {
  leadId: 'lead-marketplace-001',
  listingId: 'listing-marketplace-001',
  dealershipId: 'dealer-001',
  platformSlug: 'consumer-marketplace',
  submittedAt: '2026-06-11T12:00:00.000Z',
  category: 'AUTOMOTIVE',
  contactName: 'Jane Buyer',
  contactEmail: 'jane@example.com',
  contactPhone: '555-212-0000',
  message: 'Still available this weekend?',
  dealership: {
    ...mockDealership,
    primaryContact: mockDealership.primaryContact ?? {},
  },
  vehicle: mockVehicles[0]!,
};

describe('buildMarketplaceLeadWebhookPayload', () => {
  it('returns a compact marketplace lead payload with buyer, listing, and dealer context', () => {
    const payload = buildMarketplaceLeadWebhookPayload(BASE_CONTEXT);
    assert.equal(payload['leadId'], BASE_CONTEXT.leadId);
    assert.deepEqual(payload['source'], {
      platformSlug: 'consumer-marketplace',
      submittedAt: '2026-06-11T12:00:00.000Z',
      category: 'AUTOMOTIVE',
    });
    assert.deepEqual(payload['buyer'], {
      contactName: 'Jane Buyer',
      contactEmail: 'jane@example.com',
      contactPhone: '555-212-0000',
      message: 'Still available this weekend?',
    });
  });

  it('does not expose operator-only or internal lead storage fields', () => {
    const payload = buildMarketplaceLeadWebhookPayload(BASE_CONTEXT);
    const json = JSON.stringify(payload);
    assert.ok(!json.includes('performanceCache'));
    assert.ok(!json.includes('readinessRuns'));
    assert.ok(!json.includes('queueItems'));
    assert.ok(!json.includes('leadCaptureUrl'));
  });
});

describe('planMarketplaceLeadDeliveries', () => {
  const destinations: LeadDeliveryDestination[] = [
    {
      destinationId: 'dest-email-001',
      dealershipId: 'dealer-001',
      destinationType: 'EMAIL',
      label: 'Primary inbox',
      enabled: true,
      email: 'leads@dealer.example.com',
    },
    {
      destinationId: 'dest-adf-001',
      dealershipId: 'dealer-001',
      destinationType: 'ADF_XML_EMAIL',
      label: 'CRM ADF mailbox',
      enabled: true,
      email: 'crm@dealer.example.com',
    },
    {
      destinationId: 'dest-webhook-001',
      dealershipId: 'dealer-001',
      destinationType: 'JSON_WEBHOOK',
      label: 'Middleware webhook',
      enabled: true,
      webhookUrl: 'https://crm.example.com/lead-intake',
    },
    {
      destinationId: 'dest-other-dealer',
      dealershipId: 'dealer-other',
      destinationType: 'EMAIL',
      label: 'Wrong dealer',
      enabled: true,
      email: 'wrong@example.com',
    },
    {
      destinationId: 'dest-disabled',
      dealershipId: 'dealer-001',
      destinationType: 'EMAIL',
      label: 'Disabled inbox',
      enabled: false,
      email: 'disabled@example.com',
    },
  ];

  it('builds one pending attempt per enabled destination for the matching dealer', () => {
    const attempts = planMarketplaceLeadDeliveries(destinations, BASE_CONTEXT);
    assert.equal(attempts.length, 3);
    assert.ok(attempts.every(a => a.status === 'PENDING'));
    assert.deepEqual(
      attempts.map(a => a.destinationType),
      ['EMAIL', 'ADF_XML_EMAIL', 'JSON_WEBHOOK']
    );
  });

  it('builds ADF/XML and JSON webhook payloads with stable delivery formats', () => {
    const attempts = planMarketplaceLeadDeliveries(destinations, BASE_CONTEXT);
    const adf = attempts.find(a => a.destinationType === 'ADF_XML_EMAIL');
    const webhook = attempts.find(a => a.destinationType === 'JSON_WEBHOOK');

    assert.ok(adf);
    assert.equal(adf?.payloadFormat, 'ADF_XML_1_0');
    assert.ok(adf?.payloadBody.includes('<adf>'));
    assert.ok(adf?.payloadBody.includes(BASE_CONTEXT.vehicle.stockNumber));

    assert.ok(webhook);
    assert.equal(webhook?.payloadFormat, 'MARKETPLACE_LEAD_JSON_V1');
    assert.equal(JSON.parse(webhook?.payloadBody ?? '{}').leadId, BASE_CONTEXT.leadId);
  });

  it('computes non-empty payload checksums', () => {
    const attempts = planMarketplaceLeadDeliveries(destinations, BASE_CONTEXT);
    assert.ok(attempts.every(a => /^[a-f0-9]{64}$/.test(a.payloadChecksum)));
  });

  it('throws when a destination is enabled but missing required transport fields', () => {
    assert.throws(
      () => planMarketplaceLeadDeliveries([
        {
          destinationId: 'dest-bad-webhook',
          dealershipId: 'dealer-001',
          destinationType: 'JSON_WEBHOOK',
          label: 'Broken webhook',
          enabled: true,
        },
      ], BASE_CONTEXT),
      /missing webhookUrl/
    );
  });

  it('plans and persists attempts when a delivery store is available', async () => {
    let storedCount = 0;
    const count = await planAndPersistMarketplaceLeadDeliveries({
      leadDeliveryAttempt: {
        createMany: async ({ data }) => {
          storedCount = data.length;
          return { count: data.length };
        },
      },
    }, destinations, BASE_CONTEXT);

    assert.equal(count, 3);
    assert.equal(storedCount, 3);
  });
});
