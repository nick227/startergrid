// Sale-to-channel attribution rules.
//
// A vehicle marked sold says nothing about which channel produced the buyer. A sale is
// attributed to a channel only when one of these rules is satisfied; otherwise it is
// reported as unattributed, with the reason.
//
//   DEALER_CONFIRMED  The dealership recorded the selling channel on the sale record.
//   LEAD_MARKED_SOLD  Exactly one channel has a lead for this vehicle that the dealership
//                     moved to SOLD, and that lead arrived no later than the vehicle was
//                     marked sold.
//
// A dealer confirmation outranks lead evidence. Leads on several channels marked SOLD
// conflict, so the sale stays unattributed. Leads that were merely received before the
// sale are not evidence: a buyer may have inquired on one channel and bought through another.

import type { PrismaClient, SourceConfidence } from '@prisma/client';

export type AttributionMethod = 'DEALER_CONFIRMED' | 'LEAD_MARKED_SOLD';
export type UnattributedReason = 'NO_EVIDENCE' | 'CONFLICTING_SOLD_LEADS';

export type SaleAttributionInput = {
  soldAt: Date;
  confirmedChannelSlug: string | null;
  leads: Array<{ id: string; platformSlug: string; workflowStatus: string; createdAt: Date }>;
};

export type SaleAttribution =
  | {
      attributed: true;
      channelSlug: string;
      method: AttributionMethod;
      // The attribution rests on a dealership action in both rules.
      sourceConfidence: SourceConfidence;
      evidenceLeadIds: string[];
    }
  | { attributed: false; reason: UnattributedReason; evidenceLeadIds: string[] };

export function resolveSaleAttribution(input: SaleAttributionInput): SaleAttribution {
  if (input.confirmedChannelSlug) {
    return {
      attributed: true,
      channelSlug: input.confirmedChannelSlug,
      method: 'DEALER_CONFIRMED',
      sourceConfidence: 'MANUAL_IMPORTED',
      evidenceLeadIds: [],
    };
  }

  const soldLeads = input.leads.filter(
    l => l.workflowStatus === 'SOLD' && l.createdAt.getTime() <= input.soldAt.getTime(),
  );
  const channels = new Set(soldLeads.map(l => l.platformSlug));
  const evidenceLeadIds = soldLeads.map(l => l.id);

  if (channels.size === 1) {
    return {
      attributed: true,
      channelSlug: soldLeads[0]!.platformSlug,
      method: 'LEAD_MARKED_SOLD',
      sourceConfidence: 'MANUAL_IMPORTED',
      evidenceLeadIds,
    };
  }
  return { attributed: false, reason: channels.size > 1 ? 'CONFLICTING_SOLD_LEADS' : 'NO_EVIDENCE', evidenceLeadIds };
}

export type SoldVehicleOutcome = {
  vehicleId: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  // Inventory outcome: when the vehicle was marked sold. Not the transaction date.
  markedSoldAt: Date;
  // Sale details: null unless recorded.
  transactionDate: Date | null;
  salePriceCents: number | null;
  saleDetailsSource: SourceConfidence | null;
  attribution: SaleAttribution;
};

/** Vehicles currently marked sold within [start, end), each with its sale details and attribution. */
export async function loadSoldVehicleOutcomes(
  prisma: PrismaClient,
  dealershipId: string,
  range: { start: Date; end: Date },
): Promise<SoldVehicleOutcome[]> {
  const vehicles = await prisma.vehicle.findMany({
    where: { dealershipId, soldAt: { gte: range.start, lt: range.end } },
    select: {
      id: true, stockNumber: true, year: true, make: true, model: true, soldAt: true,
      saleRecord: { select: { transactionDate: true, salePriceCents: true, confirmedChannelSlug: true, sourceConfidence: true } },
      leads: {
        where: { dealershipId, workflowStatus: 'SOLD' },
        select: { id: true, platformSlug: true, workflowStatus: true, createdAt: true },
      },
    },
    orderBy: { soldAt: 'desc' },
  });

  return vehicles.map(v => ({
    vehicleId: v.id,
    stockNumber: v.stockNumber,
    year: v.year,
    make: v.make,
    model: v.model,
    markedSoldAt: v.soldAt!,
    transactionDate: v.saleRecord?.transactionDate ?? null,
    salePriceCents: v.saleRecord?.salePriceCents ?? null,
    saleDetailsSource: v.saleRecord?.sourceConfidence ?? null,
    attribution: resolveSaleAttribution({
      soldAt: v.soldAt!,
      confirmedChannelSlug: v.saleRecord?.confirmedChannelSlug ?? null,
      leads: v.leads,
    }),
  }));
}
