import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { parseAdfFromEmail } from '../services/inbound/adfParser.js';
import { acceptInboundEmail } from '../services/inbound/acceptInboundEmail.js';
import { issueInboundRoute, routeTokenFromEmail } from '../services/inbound/inboundRoute.js';
import type { NormalizedInboundEmail } from '../services/inbound/inboundEmailTypes.js';
import { isolatedDatabaseUrl } from './helpers/isolatedDatabase.js';

const ADF = `<?xml version="1.0"?><adf><prospect><vehicle interest="buy" status="used"><year>2020</year><make>Honda</make><model>Civic</model><vin>1HGCM82633A004352</vin><stock>H20</stock></vehicle><customer><contact><name part="first">Ada</name><name part="last">Buyer</name><email>ada@buyer.test</email><phone>5551112222</phone></contact></customer><comments>Is this still available?</comments><provider><name>Cars.com</name></provider></prospect></adf>`;

describe('ADF lead parsing', () => {
  it('reads the buyer, vehicle and provider from an ADF document', () => {
    const result = parseAdfFromEmail({ attachments: [], textBody: ADF, htmlBody: null });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.prospects[0]?.contact.email, 'ada@buyer.test');
    assert.equal(result.prospects[0]?.contact.name, 'Ada Buyer');
    assert.equal(result.prospects[0]?.vehicles[0]?.stock, 'H20');
    assert.equal(result.prospects[0]?.provider?.name, 'Cars.com');
  });

  it('rejects a DOCTYPE before any entity is expanded', () => {
    const hostile = `<!DOCTYPE adf [<!ENTITY x "boom">]><adf><prospect>&x;</prospect></adf>`;
    const result = parseAdfFromEmail({ attachments: [], textBody: hostile, htmlBody: null });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'FORBIDDEN_XML');
  });
});

describe('inbound routing token', () => {
  it('reads the token from the plus-address and ignores the ADF', () => {
    const email = { recipients: ['Leads+Abcdefghijklmnop@in.dealergrid.example'], mailboxHash: null } as NormalizedInboundEmail;
    assert.equal(routeTokenFromEmail(email), 'abcdefghijklmnop');
  });
});

const databaseUrl = isolatedDatabaseUrl();
describe('inbound ADF creates the existing lead record', { skip: !databaseUrl }, () => {
  it('routes by token, stores one Lead, and repeats as the same lead', async () => {
    const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    let dealerId: string | undefined;
    try {
      const dealer = await db.dealershipProfile.create({ data: { legalName: 'Inbound ADF Motors', rooftopAddress: {}, primaryContact: {}, desiredChannels: [] } });
      dealerId = dealer.id;
      const token = await issueInboundRoute(db, dealer.id);
      const email = inbound(token, 'msg-1');
      const created = await acceptInboundEmail(db, email);
      assert.equal(created.status, 'LEAD_CREATED');
      const lead = await db.lead.findUniqueOrThrow({ where: { id: created.leadId! } });
      assert.equal(lead.dealershipId, dealer.id);
      assert.equal(lead.source, 'ADF_XML');
      assert.equal(lead.platformSlug, 'adf-email-unverified');
      assert.equal(lead.contactEmail, 'ada@buyer.test');
      assert.equal(lead.vehicleId, null);
      const again = await acceptInboundEmail(db, email);
      assert.equal(again.duplicate, true);
      assert.equal(await db.lead.count({ where: { dealershipId: dealer.id } }), 1);
    } finally {
      if (dealerId) await db.dealershipProfile.delete({ where: { id: dealerId } });
      await db.$disconnect();
    }
  });
});

function inbound(token: string, providerMessageId: string): NormalizedInboundEmail {
  return {
    provider: 'postmark', providerMessageId, rfcMessageId: '<inquiry-1@cars.test>',
    recipients: [`leads+${token}@in.dealergrid.example`], mailboxHash: null,
    from: { email: 'leads@cars.test', name: 'Cars.com' }, replyTo: null, subject: 'New lead', receivedAt: new Date(),
    headers: [], auth: { spf: 'none', dkim: 'none', dkimAuthorAligned: false, dmarc: 'none', source: 'none', rawTests: null },
    textBody: ADF, htmlBody: null, attachments: [], attachmentCount: 0, hasRawMime: false,
  };
}
