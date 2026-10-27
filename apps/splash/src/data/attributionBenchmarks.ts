export type EvidenceTier = 'Observed' | 'Reported' | 'Attributed' | 'Estimated';

export interface AttributionRow {
  id: string;
  channelName: string;
  tier: 'owned' | 'search' | 'social' | 'portal';
  monthlyFee: number;
  adSpend: number;
  inboundLeads: number;
  cpl: number;
  attributedSales: number;
  cps: number;
  turnDays: number;
  grossMargin: number;
  evidence: EvidenceTier;
  evidenceNotes: string;
}

export const ATTRIBUTION_BENCHMARKS: AttributionRow[] = [
  {
    id: 'marketplace',
    channelName: 'Auto Marketplace (Owned)',
    tier: 'owned',
    monthlyFee: 0,
    adSpend: 0,
    inboundLeads: 34,
    cpl: 0.0,
    attributedSales: 5,
    cps: 0.0,
    turnDays: 12,
    grossMargin: 16800,
    evidence: 'Observed',
    evidenceNotes: 'Raw platform telemetry. Direct lead capture on first-party VDP, zero ad spend, verified sold transitions.',
  },
  {
    id: 'google',
    channelName: 'Google Vehicle Ads',
    tier: 'search',
    monthlyFee: 0,
    adSpend: 980,
    inboundLeads: 62,
    cpl: 15.81,
    attributedSales: 8,
    cps: 122.5,
    turnDays: 14,
    grossMargin: 26200,
    evidence: 'Attributed',
    evidenceNotes: 'Deterministic lead-to-VIN resolution when vehicles transitioned to sold in the dealership DMS.',
  },
  {
    id: 'meta',
    channelName: 'Meta Automotive Ads (AIA)',
    tier: 'social',
    monthlyFee: 0,
    adSpend: 750,
    inboundLeads: 39,
    cpl: 19.23,
    attributedSales: 4,
    cps: 187.5,
    turnDays: 21,
    grossMargin: 11500,
    evidence: 'Attributed',
    evidenceNotes: 'Click-through UTM and lead form matching against CRM buyer records upon deal jacket completion.',
  },
  {
    id: 'cargurus',
    channelName: 'CarGurus',
    tier: 'portal',
    monthlyFee: 1450,
    adSpend: 0,
    inboundLeads: 48,
    cpl: 30.21,
    attributedSales: 6,
    cps: 241.67,
    turnDays: 19,
    grossMargin: 18400,
    evidence: 'Reported',
    evidenceNotes: 'Vendor portal lead count combined with dealership in-store sales records for the reporting period.',
  },
  {
    id: 'autotrader',
    channelName: 'AutoTrader / Cox Automotive',
    tier: 'portal',
    monthlyFee: 1800,
    adSpend: 0,
    inboundLeads: 41,
    cpl: 43.9,
    attributedSales: 3,
    cps: 600.0,
    turnDays: 31,
    grossMargin: 8900,
    evidence: 'Reported',
    evidenceNotes: 'Third-party vendor self-reported lead volume matched against dealership sales inventory logs.',
  },
  {
    id: 'cars-com',
    channelName: 'Cars.com',
    tier: 'portal',
    monthlyFee: 1100,
    adSpend: 0,
    inboundLeads: 28,
    cpl: 39.29,
    attributedSales: 2,
    cps: 550.0,
    turnDays: 28,
    grossMargin: 6400,
    evidence: 'Reported',
    evidenceNotes: 'Monthly subscription fee allocated across verified inbound phone and ADF/XML email inquiries.',
  },
];
