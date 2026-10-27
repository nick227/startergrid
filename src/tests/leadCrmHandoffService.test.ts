import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getLeadCrmHandoffDetails,
  retryOrRecordLeadDelivery,
} from '../services/leads/leadCrmHandoffService.js';
import { HttpError } from '../services/dealership/httpError.js';

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

  it('generates standard ADF/XML 1.0 when no previous delivery attempt exists', async () => {
    const mockPrisma = {
      lead: {
        findFirst: async () => fakeLead,
      },
      platformAccount: {
        findFirst: async () => ({ accountId: 'crm@apexmotors.com' }),
      },
    } as any;

    const details = await getLeadCrmHandoffDetails(mockPrisma, 'dealer-123', 'lead-789');

    assert.equal(details.leadId, 'lead-789');
    assert.equal(details.deliveryStatus, 'READY_TO_EXPORT');
    assert.equal(details.crmEndpoint, 'crm@apexmotors.com');
    assert.ok(details.adfXmlPayload.includes('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(details.adfXmlPayload.includes('<adf>'));
    assert.ok(details.adfXmlPayload.includes('<make>Toyota</make>'));
    assert.ok(details.adfXmlPayload.includes('<model>RAV4</model>'));
    assert.ok(details.adfXmlPayload.includes('<stock>STK-900</stock>'));
    assert.ok(details.adfXmlPayload.includes('<name part="full">Jane Buyer</name>'));
    assert.ok(details.adfXmlPayload.includes('<email>jane@buyer.example.com</email>'));
    assert.ok(details.adfXmlPayload.includes('<vendorname>Apex Motors</vendorname>'));
  });

  it('uses existing ADF/XML payload when an ADF delivery attempt exists', async () => {
    const customXml = '<adf><prospect><custom>EXISTING_PAYLOAD</custom></prospect></adf>';
    const leadWithAttempt = {
      ...fakeLead,
      deliveryAttempts: [
        {
          id: 'attempt-1',
          destinationType: 'ADF_XML_EMAIL',
          destinationLabel: 'DealerSocket CRM',
          destinationAddress: 'leads@dealersocket.example.com',
          status: 'SENT',
          payloadFormat: 'ADF_XML_1_0',
          payloadBody: customXml,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          deliveredAt: new Date(),
          errorMessage: null,
          createdAt: new Date(),
        },
      ],
    };

    const mockPrisma = {
      lead: {
        findFirst: async () => leadWithAttempt,
      },
      platformAccount: {
        findFirst: async () => null,
      },
    } as any;

    const details = await getLeadCrmHandoffDetails(mockPrisma, 'dealer-123', 'lead-789');

    assert.equal(details.deliveryStatus, 'DELIVERED');
    assert.equal(details.adfXmlPayload, customXml);
    assert.equal(details.attempts.length, 1);
    assert.equal(details.attempts[0].status, 'SENT');
  });

  it('throws HttpError 404 when lead is not found', async () => {
    const mockPrisma = {
      lead: {
        findFirst: async () => null,
      },
    } as any;

    await assert.rejects(
      () => getLeadCrmHandoffDetails(mockPrisma, 'dealer-123', 'lead-nonexistent'),
      (err: any) => err instanceof HttpError && err.statusCode === 404,
    );
  });

  it('records CRM delivery attempt and updates handoff details', async () => {
    let createdRecord: any = null;
    let callCount = 0;

    const mockPrisma = {
      lead: {
        findFirst: async () => {
          callCount++;
          if (callCount === 1) {
            return fakeLead;
          }
          return {
            ...fakeLead,
            deliveryAttempts: [createdRecord],
          };
        },
      },
      platformAccount: {
        findFirst: async () => ({ accountId: 'crm@vinsolutions.example.com' }),
      },
      leadDeliveryAttempt: {
        create: async (args: any) => {
          createdRecord = {
            id: 'attempt-new-1',
            ...args.data,
            createdAt: new Date(),
          };
          return createdRecord;
        },
      },
    } as any;

    const result = await retryOrRecordLeadDelivery(mockPrisma, 'dealer-123', 'lead-789', {
      destinationEmail: 'custom-crm@vinsolutions.example.com',
      markDelivered: true,
    });

    assert.equal(result.deliveryStatus, 'DELIVERED');
    assert.equal(result.attempts.length, 1);
    assert.equal(result.attempts[0].destinationAddress, 'custom-crm@vinsolutions.example.com');
    assert.equal(result.attempts[0].status, 'SENT');
  });
});
