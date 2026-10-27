// Channel results for one month: recorded inquiries, attributed sales and dealer-reported cost.
//
// Each figure is reported only when its inputs exist. Unknown stays null and is never shown as
// zero: a channel that does not send inquiries to StarterGrid has unknown inquiries, a channel
// without a cost record has unknown cost, and a cost-per figure needs both of its inputs.

import type { PrismaClient, SourceConfidence } from '@prisma/client';
import { platformProfiles } from '../../data/platformProfiles.js';
import { getChannelMonthlyCosts, monthRange } from '../channel/channelCostService.js';
import { loadSoldVehicleOutcomes, type AttributionMethod, type UnattributedReason } from '../attribution/saleAttribution.js';

// Channels whose buyer inquiries reach StarterGrid, and how they are observed. Every other
// channel delivers inquiries to the dealership directly (email, CRM), so StarterGrid cannot count them.
export const INQUIRY_REPORTING_CHANNELS: Readonly<Record<string, SourceConfidence>> = {
  'consumer-marketplace': 'OBSERVED_FIRST_PARTY',
  'dealer-storefront': 'OBSERVED_FIRST_PARTY',
  'linkedin-lead-gen-forms': 'PLATFORM_REPORTED',
};

// Lead statuses that show a dealership acted on an inquiry. A submitted form is a recorded
// observation, not a verified buyer.
const PROGRESSED_STATUSES = new Set(['CONTACTED', 'APPOINTMENT', 'SOLD']);

export type InquiryReporting =
  | 'REPORTED'       // channel sends inquiries to StarterGrid; counts are complete
  | 'PARTIAL'        // some inquiries were recorded, but the channel does not send them; counts are incomplete
  | 'NOT_REPORTED';  // StarterGrid receives no inquiries from this channel

export type ChannelResultRow = {
  platformSlug: string;
  platformName: string;
  inquiryReporting: InquiryReporting;
  inquirySource: SourceConfidence | null;
  inquiries: number | null;
  progressedInquiries: number | null;
  attributedSales: number;
  attributedByMethod: Record<AttributionMethod, number>;
  attributedSalesWithPrice: number;
  // Sum of recorded sale prices, only when every attributed sale has one.
  attributedSaleRevenueCents: number | null;
  cost: { flatFeeCents: number | null; adSpendCents: number | null; reportedCostCents: number | null; sourceConfidence: string } | null;
  costPerInquiryCents: number | null;
  costPerAttributedSaleCents: number | null;
};

export type SaleOutcomeRow = {
  vehicleId: string;
  stockNumber: string;
  title: string;
  markedSoldAt: string;
  transactionDate: string | null;
  salePriceCents: number | null;
  attributedChannelSlug: string | null;
  attributionMethod: AttributionMethod | null;
  unattributedReason: UnattributedReason | null;
  evidenceLeadIds: string[];
};

export type ChannelResults = {
  month: string;
  sales: {
    markedSold: number;
    attributed: number;
    unattributed: number;
    withSalePrice: number;
    withTransactionDate: number;
  };
  inquiries: { recorded: number; progressed: number };
  cost: { channelsWithReportedCost: number; totalReportedCostCents: number | null };
  channels: ChannelResultRow[];
  saleOutcomes: SaleOutcomeRow[];
};

const NAMES = new Map(platformProfiles.map(p => [p.slug, p.name]));

function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator <= 0) return null;
  return Math.round(numerator / denominator);
}

export async function computeChannelResults(prisma: PrismaClient, dealershipId: string, month: string): Promise<ChannelResults> {
  const range = monthRange(month);
  const [accounts, costs, leads, outcomes] = await Promise.all([
    prisma.platformAccount.findMany({ where: { dealershipId, dealerEnabled: true }, select: { platformSlug: true } }),
    getChannelMonthlyCosts(prisma, dealershipId, month),
    prisma.lead.findMany({
      where: { dealershipId, createdAt: { gte: range.start, lt: range.end } },
      select: { platformSlug: true, workflowStatus: true },
    }),
    loadSoldVehicleOutcomes(prisma, dealershipId, range),
  ]);

  const costBySlug = new Map(costs.map(c => [c.platformSlug, c]));
  const leadsBySlug = new Map<string, { total: number; progressed: number }>();
  for (const l of leads) {
    const agg = leadsBySlug.get(l.platformSlug) ?? { total: 0, progressed: 0 };
    agg.total += 1;
    if (PROGRESSED_STATUSES.has(l.workflowStatus)) agg.progressed += 1;
    leadsBySlug.set(l.platformSlug, agg);
  }

  const slugs = new Set<string>([
    ...accounts.map(a => a.platformSlug),
    ...costs.map(c => c.platformSlug),
    ...leadsBySlug.keys(),
    ...outcomes.flatMap(o => (o.attribution.attributed ? [o.attribution.channelSlug] : [])),
  ]);

  const channels: ChannelResultRow[] = [...slugs].map(slug => {
    const lead = leadsBySlug.get(slug);
    const reportingSource = INQUIRY_REPORTING_CHANNELS[slug] ?? null;
    const inquiryReporting: InquiryReporting = reportingSource ? 'REPORTED' : lead ? 'PARTIAL' : 'NOT_REPORTED';
    const inquiries = inquiryReporting === 'NOT_REPORTED' ? null : lead?.total ?? 0;

    const attributedOutcomes = outcomes.filter(o => o.attribution.attributed && o.attribution.channelSlug === slug);
    const attributedByMethod: Record<AttributionMethod, number> = { DEALER_CONFIRMED: 0, LEAD_MARKED_SOLD: 0 };
    for (const o of attributedOutcomes) if (o.attribution.attributed) attributedByMethod[o.attribution.method] += 1;
    const priced = attributedOutcomes.filter(o => o.salePriceCents !== null);

    const cost = costBySlug.get(slug) ?? null;
    const costCents = cost?.reportedCostCents ?? null;

    return {
      platformSlug: slug,
      platformName: NAMES.get(slug) ?? slug,
      inquiryReporting,
      inquirySource: reportingSource,
      inquiries,
      progressedInquiries: inquiries === null ? null : lead?.progressed ?? 0,
      attributedSales: attributedOutcomes.length,
      attributedByMethod,
      attributedSalesWithPrice: priced.length,
      attributedSaleRevenueCents: attributedOutcomes.length > 0 && priced.length === attributedOutcomes.length
        ? priced.reduce((sum, o) => sum + o.salePriceCents!, 0)
        : null,
      cost: cost ? { flatFeeCents: cost.flatFeeCents, adSpendCents: cost.adSpendCents, reportedCostCents: costCents, sourceConfidence: cost.sourceConfidence } : null,
      // Only a complete inquiry count is a valid denominator.
      costPerInquiryCents: inquiryReporting === 'REPORTED' ? ratio(costCents, inquiries) : null,
      costPerAttributedSaleCents: ratio(costCents, attributedOutcomes.length),
    };
  });

  channels.sort((a, b) =>
    b.attributedSales - a.attributedSales
    || (b.inquiries ?? -1) - (a.inquiries ?? -1)
    || (b.cost?.reportedCostCents ?? -1) - (a.cost?.reportedCostCents ?? -1)
    || a.platformName.localeCompare(b.platformName));

  const reportedCosts = costs.map(c => c.reportedCostCents).filter((c): c is number => c !== null);
  const reportingRows = channels.filter(c => c.inquiryReporting === 'REPORTED');

  return {
    month,
    sales: {
      markedSold: outcomes.length,
      attributed: outcomes.filter(o => o.attribution.attributed).length,
      unattributed: outcomes.filter(o => !o.attribution.attributed).length,
      withSalePrice: outcomes.filter(o => o.salePriceCents !== null).length,
      withTransactionDate: outcomes.filter(o => o.transactionDate !== null).length,
    },
    inquiries: {
      recorded: reportingRows.reduce((s, c) => s + (c.inquiries ?? 0), 0),
      progressed: reportingRows.reduce((s, c) => s + (c.progressedInquiries ?? 0), 0),
    },
    cost: {
      channelsWithReportedCost: reportedCosts.length,
      totalReportedCostCents: reportedCosts.length > 0 ? reportedCosts.reduce((s, c) => s + c, 0) : null,
    },
    channels,
    saleOutcomes: outcomes.map(o => ({
      vehicleId: o.vehicleId,
      stockNumber: o.stockNumber,
      title: `${o.year} ${o.make} ${o.model}`,
      markedSoldAt: o.markedSoldAt.toISOString(),
      transactionDate: o.transactionDate ? o.transactionDate.toISOString().slice(0, 10) : null,
      salePriceCents: o.salePriceCents,
      attributedChannelSlug: o.attribution.attributed ? o.attribution.channelSlug : null,
      attributionMethod: o.attribution.attributed ? o.attribution.method : null,
      unattributedReason: o.attribution.attributed ? null : o.attribution.reason,
      evidenceLeadIds: o.attribution.evidenceLeadIds,
    })),
  };
}
