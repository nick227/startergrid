import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { persistPlannedLeadDeliveries } from '../services/leadDelivery/leadDeliveryAttemptStore.js';
import type { PlannedLeadDeliveryAttempt } from '../services/leadDelivery/leadDeliveryTypes.js';

const ATTEMPTS: PlannedLeadDeliveryAttempt[] = [
  {
    destinationId: 'dest-email-001',
    destinationType: 'EMAIL',
    destinationLabel: 'Primary inbox',
    dealershipId: 'dealer-001',
    leadId: 'lead-001',
    status: 'PENDING',
    payloadFormat: 'EMAIL_SUMMARY',
    payloadBody: 'Marketplace lead received',
    payloadChecksum: 'a'.repeat(64),
    destinationAddress: 'leads@example.com',
  },
  {
    destinationId: 'dest-webhook-001',
    destinationType: 'JSON_WEBHOOK',
    destinationLabel: 'Webhook',
    dealershipId: 'dealer-001',
    leadId: 'lead-001',
    status: 'PENDING',
    payloadFormat: 'MARKETPLACE_LEAD_JSON_V1',
    payloadBody: '{"leadId":"lead-001"}',
    payloadChecksum: 'b'.repeat(64),
    destinationAddress: 'https://crm.example.com/intake',
  },
];

describe('persistPlannedLeadDeliveries', () => {
  it('returns 0 when there are no attempts', async () => {
    const count = await persistPlannedLeadDeliveries({}, []);
    assert.equal(count, 0);
  });

  it('returns 0 when the Prisma client does not expose leadDeliveryAttempt yet', async () => {
    const count = await persistPlannedLeadDeliveries({}, ATTEMPTS);
    assert.equal(count, 0);
  });

  it('persists planned attempts with createMany when the store is available', async () => {
    let captured: Array<Record<string, unknown>> = [];

    const count = await persistPlannedLeadDeliveries({
      leadDeliveryAttempt: {
        createMany: async ({ data }) => {
          captured = data;
          return { count: data.length };
        },
      },
    }, ATTEMPTS);

    assert.equal(count, 2);
    assert.equal(captured.length, 2);
    assert.deepEqual(captured[0], {
      leadId: 'lead-001',
      dealershipId: 'dealer-001',
      destinationType: 'EMAIL',
      destinationLabel: 'Primary inbox',
      destinationAddress: 'leads@example.com',
      status: 'PENDING',
      payloadFormat: 'EMAIL_SUMMARY',
      payloadBody: 'Marketplace lead received',
      payloadChecksum: 'a'.repeat(64),
      attemptCount: 0,
    });
  });
});
