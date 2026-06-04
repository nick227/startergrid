import { nanoid } from 'nanoid';
import type { DealershipPayload, LeadRecord, VehiclePayload } from '../../lib/types.js';
import { generateAdfXml } from '../publishing/feedGeneratorService.js';

export type OwnedChannelLeadInput = {
  vehicleStockNumber?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  message?: string;
  vehicleInterest?: Record<string, unknown>;
};

export function captureOwnedChannelLead(
  _dealership: DealershipPayload,
  input: OwnedChannelLeadInput
): LeadRecord {
  return {
    id: `lead_${nanoid()}`,
    source: 'DEALER_STOREFRONT',
    platformSlug: 'dealer-storefront',
    contactName: input.contactName ?? null,
    contactEmail: input.contactEmail ?? null,
    contactPhone: input.contactPhone ?? null,
    message: input.message ?? null,
    vehicleInterest: input.vehicleInterest ?? (input.vehicleStockNumber ? { stockNumber: input.vehicleStockNumber } : null),
    adfPayload: null,
    capturedAt: new Date().toISOString()
  };
}

export function captureAdfLead(adfXml: string): LeadRecord {
  const stockMatch = adfXml.match(/<stock>([^<]+)<\/stock>/);
  const vinMatch = adfXml.match(/<vin>([^<]+)<\/vin>/);
  const makeMatch = adfXml.match(/<make>([^<]+)<\/make>/);
  const modelMatch = adfXml.match(/<model>([^<]+)<\/model>/);
  const yearMatch = adfXml.match(/<year>([^<]+)<\/year>/);
  const nameMatch = adfXml.match(/<name[^>]*>([^<]+)<\/name>/);
  const emailMatch = adfXml.match(/<email>([^<]+)<\/email>/);
  const phoneMatch = adfXml.match(/<phone[^>]*>([^<]+)<\/phone>/);
  const commentsMatch = adfXml.match(/<comments>([^<]+)<\/comments>/);

  return {
    id: `lead_${nanoid()}`,
    source: 'ADF_XML',
    platformSlug: 'adf-xml-lead-routing',
    contactName: nameMatch?.[1] ?? null,
    contactEmail: emailMatch?.[1] ?? null,
    contactPhone: phoneMatch?.[1] ?? null,
    message: commentsMatch?.[1] ?? null,
    vehicleInterest: {
      stockNumber: stockMatch?.[1] ?? null,
      vin: vinMatch?.[1] ?? null,
      make: makeMatch?.[1] ?? null,
      model: modelMatch?.[1] ?? null,
      year: yearMatch?.[1] ?? null
    },
    adfPayload: adfXml,
    capturedAt: new Date().toISOString()
  };
}

export function generateAdfLeadFromVehicle(
  dealership: DealershipPayload,
  vehicle: VehiclePayload,
  contact: { name?: string; email?: string; phone?: string; message?: string }
): { lead: LeadRecord; adfXml: string } {
  const artifact = generateAdfXml({
    dealership,
    vehicle,
    contactName: contact.name,
    contactEmail: contact.email,
    contactPhone: contact.phone,
    message: contact.message
  });
  const lead = captureAdfLead(artifact.content);
  return { lead, adfXml: artifact.content };
}

export function summarizeLeads(leads: LeadRecord[]): Record<string, number> {
  return leads.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.platformSlug] = (acc[lead.platformSlug] ?? 0) + 1;
    return acc;
  }, {});
}
