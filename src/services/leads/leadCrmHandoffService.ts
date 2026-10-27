import type { PrismaClient } from '@prisma/client';
import { generateAdfXml } from '../publishing/feedGeneratorService.js';
import { HttpError } from '../dealership/httpError.js';
import { createHash } from 'node:crypto';

export type LeadCrmDeliveryStatus = 'DELIVERED' | 'FAILED' | 'PENDING' | 'READY_TO_EXPORT';

export type LeadDeliveryAttemptDto = {
  id: string;
  destinationType: string;
  destinationLabel: string;
  destinationAddress: string;
  status: string;
  payloadFormat: string;
  attemptCount: number;
  lastAttemptAt: Date | null;
  deliveredAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
};

export type LeadCrmHandoffDetails = {
  leadId: string;
  deliveryStatus: LeadCrmDeliveryStatus;
  adfXmlPayload: string;
  crmEndpoint: string | null;
  attempts: LeadDeliveryAttemptDto[];
  vehicle: {
    stockNumber: string;
    year?: number | null;
    make?: string | null;
    model?: string | null;
  } | null;
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
};

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function getLeadCrmHandoffDetails(
  prisma: PrismaClient,
  dealershipId: string,
  leadId: string,
): Promise<LeadCrmHandoffDetails> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, dealershipId },
    include: {
      dealership: true,
      vehicle: true,
      deliveryAttempts: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!lead) {
    throw new HttpError(404, `Lead ${leadId} not found for dealership ${dealershipId}`);
  }

  // Look for configured CRM ADF endpoint on the dealership
  const adfAccount = await prisma.platformAccount.findFirst({
    where: { dealershipId, platformSlug: 'adf-xml-lead-routing' },
    select: { accountId: true },
  });

  const crmEndpoint =
    adfAccount?.accountId || lead.dealership.primaryContactEmail || null;

  // Retrieve existing ADF/XML payload or generate standard 1.0 artifact
  let adfXml = '';
  const existingAdfAttempt = lead.deliveryAttempts.find(
    a => a.payloadFormat === 'ADF_XML_1_0' && a.payloadBody && a.payloadBody.trim().length > 0,
  );

  if (existingAdfAttempt) {
    adfXml = existingAdfAttempt.payloadBody;
  } else {
    // Generate valid ADF/XML 1.0
    const vehiclePayload = lead.vehicle
      ? lead.vehicle
      : {
          id: 'unassigned',
          dealershipId,
          stockNumber: 'INQUIRY-DIRECT',
          year: 0,
          make: 'General',
          model: 'Inquiry',
          trim: null,
          vin: null,
          priceCents: 0,
          mileage: 0,
          condition: 'USED' as const,
        };

    const artifact = generateAdfXml({
      dealership: lead.dealership as any,
      vehicle: vehiclePayload,
      contactName: lead.contactName ?? undefined,
      contactEmail: lead.contactEmail ?? undefined,
      contactPhone: lead.contactPhone ?? undefined,
      message: lead.message ?? undefined,
    });
    adfXml = artifact.content;
  }

  // Determine overall CRM delivery status
  let deliveryStatus: LeadCrmDeliveryStatus = 'READY_TO_EXPORT';
  if (lead.deliveryAttempts.some(a => a.status === 'SENT')) {
    deliveryStatus = 'DELIVERED';
  } else if (lead.deliveryAttempts.some(a => a.status === 'FAILED')) {
    deliveryStatus = 'FAILED';
  } else if (lead.deliveryAttempts.some(a => a.status === 'PENDING' || a.status === 'RETRYING')) {
    deliveryStatus = 'PENDING';
  }

  return {
    leadId: lead.id,
    deliveryStatus,
    adfXmlPayload: adfXml,
    crmEndpoint,
    attempts: lead.deliveryAttempts.map(a => ({
      id: a.id,
      destinationType: a.destinationType,
      destinationLabel: a.destinationLabel,
      destinationAddress: a.destinationAddress,
      status: a.status,
      payloadFormat: a.payloadFormat,
      attemptCount: a.attemptCount,
      lastAttemptAt: a.lastAttemptAt,
      deliveredAt: a.deliveredAt,
      errorMessage: a.errorMessage,
      createdAt: a.createdAt,
    })),
    vehicle: lead.vehicle
      ? {
          stockNumber: lead.vehicle.stockNumber,
          year: lead.vehicle.year,
          make: lead.vehicle.make,
          model: lead.vehicle.model,
        }
      : null,
    customer: {
      name: lead.contactName,
      email: lead.contactEmail,
      phone: lead.contactPhone,
    },
  };
}

export async function retryOrRecordLeadDelivery(
  prisma: PrismaClient,
  dealershipId: string,
  leadId: string,
  options?: {
    destinationEmail?: string;
    markDelivered?: boolean;
  },
): Promise<LeadCrmHandoffDetails> {
  const current = await getLeadCrmHandoffDetails(prisma, dealershipId, leadId);

  const destinationAddress =
    options?.destinationEmail?.trim() ||
    current.crmEndpoint ||
    'crm@dealership.internal';

  const markDelivered = options?.markDelivered !== false;
  const now = new Date();

  // Create or record the delivery attempt in prisma
  await prisma.leadDeliveryAttempt.create({
    data: {
      leadId,
      dealershipId,
      destinationType: 'ADF_XML_EMAIL',
      destinationLabel: 'Dealership CRM (ADF/XML 1.0)',
      destinationAddress,
      status: markDelivered ? 'SENT' : 'PENDING',
      payloadFormat: 'ADF_XML_1_0',
      payloadBody: current.adfXmlPayload,
      payloadChecksum: sha256(current.adfXmlPayload),
      attemptCount: 1,
      lastAttemptAt: now,
      deliveredAt: markDelivered ? now : null,
    },
  });

  return getLeadCrmHandoffDetails(prisma, dealershipId, leadId);
}
