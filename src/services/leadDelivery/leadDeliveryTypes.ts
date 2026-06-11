import type { DealershipPayload, VehiclePayload } from '../../lib/types.js';

export type LeadDeliveryDestinationType =
  | 'EMAIL'
  | 'ADF_XML_EMAIL'
  | 'JSON_WEBHOOK';

export type LeadDeliveryAttemptStatus =
  | 'PENDING'
  | 'SENT'
  | 'FAILED'
  | 'RETRYING'
  | 'DISABLED';

export type LeadDeliveryPayloadFormat =
  | 'EMAIL_SUMMARY'
  | 'ADF_XML_1_0'
  | 'MARKETPLACE_LEAD_JSON_V1';

export type LeadDeliveryDestination = {
  destinationId: string;
  dealershipId: string;
  destinationType: LeadDeliveryDestinationType;
  label: string;
  enabled: boolean;
  email?: string | null;
  webhookUrl?: string | null;
  vendorName?: string | null;
};

export type MarketplaceLeadDeliveryContext = {
  leadId: string;
  listingId: string;
  dealershipId: string;
  platformSlug: string;
  submittedAt: string;
  category?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  message?: string | null;
  dealership: DealershipPayload;
  vehicle: VehiclePayload;
};

export type PlannedLeadDeliveryAttempt = {
  destinationId: string;
  destinationType: LeadDeliveryDestinationType;
  destinationLabel: string;
  dealershipId: string;
  leadId: string;
  status: LeadDeliveryAttemptStatus;
  payloadFormat: LeadDeliveryPayloadFormat;
  payloadBody: string;
  payloadChecksum: string;
  destinationAddress: string;
};

