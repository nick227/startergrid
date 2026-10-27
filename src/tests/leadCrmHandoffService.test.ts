import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getLeadCrmHandoffDetails,
  sendLeadToCrm,
} from '../services/leads/leadCrmHandoffService.js';
import { HttpError } from '../services/dealership/httpError.js';
import { buildApp } from '../server/app.js';
import { startFakeSmtp } from './helpers/fakeSmtpServer.js';

describe('leadCrmHandoffService', () => {
  const fakeDealership = {
    id: 'dealer-123',
    legalName: 'Apex Motor Group LLC',
    dbaName: 'Apex Motors',
    primaryContactEmail: 'sales@apexmotors.example.com',
    primaryContact: {
      name: 'John Apex',
      email: 'sales@apexmotors.example.com',
      phone: '555-0199',
    },
    rooftopAddress: {
      street: '100 Main St',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75201',
      country: 'US',
    },
  };

  const fakeVehicle = {
    id: 'veh-456',
    dealershipId: 'dealer-123',
    stockNumber: 'STK-900',
    year: 2023,
    make: 'Toyota',
    model: 'RAV4',
    trim: 'XLE',
    vin: '4T3WRREV8NU123456',
    priceCents: 2899500,
    mileage: 18500,
    condition: 'USED' as const,
  };

  const fakeLead = {
    id: 'lead-789',
    dealershipId: 'dealer-123',
    vehicleId: 'veh-456',
    source: 'PLATFORM_FORM' as const,
    platformSlug: 'cargurus-dealer',
    contactName: 'Jane Buyer',
    contactEmail: 'jane@buyer.example.com',
    contactPhone: '555-987-6543',
    message: 'Is this RAV4 still available for a test drive?',
    workflowStatus: 'NEW' as const,
    dealership: fakeDealership,
    vehicle: fakeVehicle,
    deliveryAttempts: [],
  };

  const PROD_SMTP = { NODE_ENV: 'production', SMTP_ENABLED: 'true' };
  const NO_SMTP = { NODE_ENV: 'test' };

  // Stateful stand-in for the Prisma calls the service makes.
  function makeDb(accountId: string | null, attempts: any[] = []) {
    const rows = attempts.map(a => ({ ...a }));
    let seq = 0;
    return {
      rows,
      db: {
        lead: {
          findFirst: async ({ where }: any) => where.id === fakeLead.id
            ? { ...fakeLead, deliveryAttempts: [...rows].sort((a, b) => b.createdAt - a.createdAt) }
            : null,
        },
        platformAccount: { findFirst: async () => (accountId === null ? null : { accountId }) },
        leadDeliveryAttempt: {
          create: async ({ data }: any) => {
            const row = { id: `attempt-${++seq}`, errorMessage: null, errorCode: null, deliveredAt: null, createdAt: new Date(Date.now() + seq), ...data };
            rows.push(row);
            return row;
          },
          update: async ({ where, data }: any) => Object.assign(rows.find(r => r.id === where.id), data),
          updateMany: async ({ where, data }: any) => {
            const hit = rows.filter(r => r.status === where.status && r.attemptCount > 0 && r.lastAttemptAt < where.lastAttemptAt.lt);
            hit.forEach(r => Object.assign(r, data));
            return { count: hit.length };
          },
        },
      } as any,
    };
  }

  function sendAttempt(over: Record<string, unknown>) {
    return {
      id: 'attempt-old', destinationType: 'ADF_XML_EMAIL', destinationLabel: 'Dealership CRM (ADF/XML 1.0)',
      destinationAddress: 'crm@apexmotors.com', status: 'SENT', payloadFormat: 'ADF_XML_1_0', payloadBody: '',
      attemptCount: 1, lastAttemptAt: new Date(), deliveredAt: null, errorMessage: null, createdAt: new Date(), ...over,
    };
  }

  it('generates standard ADF/XML 1.0 and reports Not sent before any send', async () => {
    const { db } = makeDb('crm@apexmotors.com');
    const details = await getLeadCrmHandoffDetails(db, 'dealer-123', 'lead-789', PROD_SMTP);

    assert.equal(details.leadId, 'lead-789');
    assert.equal(details.deliveryStatus, 'NOT_SENT');
    assert.equal(details.crmEndpoint, 'crm@apexmotors.com');
    assert.equal(details.canSend, true);
    assert.ok(details.adfXmlPayload.includes('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(details.adfXmlPayload.includes('<adf>'));
    assert.ok(details.adfXmlPayload.includes('<make>Toyota</make>'));
    assert.ok(details.adfXmlPayload.includes('<stock>STK-900</stock>'));
    assert.ok(details.adfXmlPayload.includes('<name part="full">Jane Buyer</name>'));
    assert.ok(details.adfXmlPayload.includes('<email>jane@buyer.example.com</email>'));
    assert.ok(details.adfXmlPayload.includes('<vendorname>Apex Motors</vendorname>'));
  });

  it('never falls back to the dealership contact email or a placeholder address', async () => {
    const { db } = makeDb(null);
    const details = await getLeadCrmHandoffDetails(db, 'dealer-123', 'lead-789', PROD_SMTP);

    assert.equal(details.crmEndpoint, null);
    assert.equal(details.canSend, false);
    assert.equal(details.sendBlocker, 'NO_CRM_ADDRESS');
  });

  it('refuses a webhook URL as a CRM address and points to manual export', async () => {
    const { db } = makeDb('https://crm.example.com/hook');
    const details = await getLeadCrmHandoffDetails(db, 'dealer-123', 'lead-789', PROD_SMTP);
    assert.equal(details.sendBlocker, 'CRM_ADDRESS_NOT_EMAIL');
    assert.match(details.sendBlockerMessage ?? '', /Copy or download/);
  });

  it('cannot send while email is not configured, and records no attempt', async () => {
    const { db, rows } = makeDb('crm@apexmotors.com');
    let calls = 0;
    const details = await getLeadCrmHandoffDetails(db, 'dealer-123', 'lead-789', NO_SMTP);
    assert.equal(details.sendBlocker, 'EMAIL_NOT_CONFIGURED');

    await assert.rejects(
      () => sendLeadToCrm(db, 'dealer-123', 'lead-789', { env: NO_SMTP, send: async () => { calls++; } }),
      (err: any) => err instanceof HttpError && err.statusCode === 409,
    );
    assert.equal(calls, 0);
    assert.equal(rows.length, 0);
  });

  it('marks the attempt sent only after the transport accepts it', async () => {
    const { db, rows } = makeDb('crm@apexmotors.com');
    const sent: any[] = [];
    const result = await sendLeadToCrm(db, 'dealer-123', 'lead-789', {
      env: PROD_SMTP,
      send: async msg => {
        assert.equal(rows[0].status, 'PENDING', 'attempt is persisted as pending before the transport call');
        sent.push(msg);
      },
    });

    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'crm@apexmotors.com');
    assert.equal(sent[0].body, result.adfXmlPayload);
    assert.equal(result.deliveryStatus, 'SENT_TO_CRM_ADDRESS');
    assert.equal(result.attempts.length, 1);
    assert.equal(result.attempts[0].status, 'SENT');
    assert.ok(result.attempts[0].deliveredAt instanceof Date);
  });

  it('records a transport failure and lets the dealer retry', async () => {
    const { db } = makeDb('crm@apexmotors.com');
    const failed = await sendLeadToCrm(db, 'dealer-123', 'lead-789', {
      env: PROD_SMTP,
      send: async () => { throw Object.assign(new Error('Invalid login: 535 Authentication failed'), { code: 'EAUTH' }); },
    });

    assert.equal(failed.deliveryStatus, 'FAILED');
    assert.equal(failed.canSend, true);
    assert.equal(failed.attempts[0].status, 'FAILED');
    assert.equal(failed.attempts[0].deliveredAt, null);
    assert.match(failed.attempts[0].errorMessage ?? '', /535/);

    const retried = await sendLeadToCrm(db, 'dealer-123', 'lead-789', { env: PROD_SMTP, send: async () => {} });
    assert.equal(retried.deliveryStatus, 'SENT_TO_CRM_ADDRESS');
    assert.deepEqual(retried.attempts.map(a => a.status), ['SENT', 'FAILED']);
  });

  it('reports an in-flight send as Sending and blocks a second send', async () => {
    const { db } = makeDb('crm@apexmotors.com', [sendAttempt({ status: 'PENDING' })]);
    const details = await getLeadCrmHandoffDetails(db, 'dealer-123', 'lead-789', PROD_SMTP);
    assert.equal(details.deliveryStatus, 'SENDING');
    assert.equal(details.sendBlocker, 'SEND_IN_PROGRESS');
    await assert.rejects(
      () => sendLeadToCrm(db, 'dealer-123', 'lead-789', { env: PROD_SMTP, send: async () => {} }),
      (err: any) => err instanceof HttpError && err.statusCode === 409,
    );
  });

  it('treats a send that never finished as failed, never as sent', async () => {
    const stale = new Date(Date.now() - 10 * 60 * 1000);
    const { db, rows } = makeDb('crm@apexmotors.com', [sendAttempt({ status: 'PENDING', lastAttemptAt: stale, createdAt: stale })]);
    const details = await getLeadCrmHandoffDetails(db, 'dealer-123', 'lead-789', PROD_SMTP);
    assert.equal(details.deliveryStatus, 'FAILED');
    assert.match(details.attempts[0].errorMessage ?? '', /cannot confirm/);

    await sendLeadToCrm(db, 'dealer-123', 'lead-789', { env: PROD_SMTP, send: async () => {} });
    assert.equal(rows[0].status, 'FAILED');
    assert.equal(rows[0].errorCode, 'SEND_INTERRUPTED');
  });

  it('ignores queued marketplace rows that were never dispatched', async () => {
    const { db } = makeDb('crm@apexmotors.com', [sendAttempt({ status: 'PENDING', attemptCount: 0, lastAttemptAt: null })]);
    const details = await getLeadCrmHandoffDetails(db, 'dealer-123', 'lead-789', PROD_SMTP);
    assert.equal(details.deliveryStatus, 'NOT_SENT');
    assert.equal(details.attempts.length, 0);
  });

  it('reuses the stored ADF/XML payload from an earlier send', async () => {
    const customXml = '<adf><prospect><custom>EXISTING_PAYLOAD</custom></prospect></adf>';
    const { db } = makeDb('crm@apexmotors.com', [sendAttempt({ payloadBody: customXml, deliveredAt: new Date() })]);
    const details = await getLeadCrmHandoffDetails(db, 'dealer-123', 'lead-789', PROD_SMTP);
    assert.equal(details.deliveryStatus, 'SENT_TO_CRM_ADDRESS');
    assert.equal(details.adfXmlPayload, customXml);
  });

  it('throws HttpError 404 when lead is not found', async () => {
    const { db } = makeDb('crm@apexmotors.com');
    await assert.rejects(
      () => getLeadCrmHandoffDetails(db, 'dealer-123', 'lead-nonexistent'),
      (err: any) => err instanceof HttpError && err.statusCode === 404,
    );
  });

  it('records SMTP rejection as failed, then sent after a retry the server accepts', async () => {
    const { db, rows } = makeDb('crm@apexmotors.com');
    const rejecting = await startFakeSmtp({ rejectRecipients: true });
    try {
      const failed = await sendLeadToCrm(db, 'dealer-123', 'lead-789', { env: rejecting.env });
      assert.equal(failed.deliveryStatus, 'FAILED');
      assert.equal(rows[0].deliveredAt, null);
      assert.match(rows[0].errorMessage, /550|rejected/i);
    } finally { await rejecting.close(); }

    const accepting = await startFakeSmtp({ rejectRecipients: false });
    try {
      const sent = await sendLeadToCrm(db, 'dealer-123', 'lead-789', { env: accepting.env });
      assert.equal(sent.deliveryStatus, 'SENT_TO_CRM_ADDRESS');
      assert.equal(accepting.messages.length, 1);
      assert.deepEqual(accepting.recipients, ['crm@apexmotors.com'], 'only the configured CRM address receives buyer data');
      assert.match(accepting.messages[0]!, /<adf>/, 'the ADF/XML payload is what the server received');
      assert.deepEqual(sent.attempts.map(a => a.status), ['SENT', 'FAILED']);
    } finally { await accepting.close(); }
  });

  describe('CRM delivery routes', () => {
    function routeDb() {
      let created = 0;
      const { db } = makeDb('crm@apexmotors.com');
      db.leadDeliveryAttempt.create = async () => { created++; throw new Error('must not record an attempt'); };
      return { db, created: () => created };
    }

    it('requires a signed-in operator', async () => {
      const app = buildApp(routeDb().db);
      const res = await app.inject({ method: 'POST', url: '/api/dealers/dealer-123/leads/lead-789/delivery/retry' });
      assert.equal(res.statusCode, 401);
    });

    it('refuses operators outside the dealership for both reading and sending', async () => {
      const previous = process.env['DEV_OPERATOR_DEALER_IDS'];
      process.env['DEV_OPERATOR_DEALER_IDS'] = 'dealer-other';
      try {
        const { db, created } = routeDb();
        const app = buildApp(db);
        const headers = { 'x-operator-id': 'dev-operator' };
        const read = await app.inject({ method: 'GET', url: '/api/dealers/dealer-123/leads/lead-789/delivery', headers });
        const send = await app.inject({ method: 'POST', url: '/api/dealers/dealer-123/leads/lead-789/delivery/retry', headers });
        assert.equal(read.statusCode, 403);
        assert.equal(send.statusCode, 403);
        assert.equal(created(), 0);
      } finally {
        if (previous === undefined) delete process.env['DEV_OPERATOR_DEALER_IDS']; else process.env['DEV_OPERATOR_DEALER_IDS'] = previous;
      }
    });

    it('ignores a client-supplied address and delivered flag', async () => {
      const { db, created } = routeDb();
      const app = buildApp(db);
      const res = await app.inject({
        method: 'POST',
        url: '/api/dealers/dealer-123/leads/lead-789/delivery/retry',
        headers: { 'x-operator-id': 'dev-operator' },
        payload: { destinationEmail: 'attacker@evil.test', markDelivered: true },
      });
      // Test env has no real email transport, so the send is refused before any attempt exists.
      assert.equal(res.statusCode, 409);
      assert.match(res.json().error, /Email sending is not set up/);
      assert.equal(created(), 0);

      const details = await app.inject({ method: 'GET', url: '/api/dealers/dealer-123/leads/lead-789/delivery', headers: { 'x-operator-id': 'dev-operator' } });
      assert.equal(details.json().crmEndpoint, 'crm@apexmotors.com');
      assert.equal(details.json().deliveryStatus, 'NOT_SENT');
    });
  });
});

