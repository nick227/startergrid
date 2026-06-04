import 'dotenv/config';
import { platformProfiles } from '../../data/platformProfiles.js';
import { getMockPortalResponse } from '../../data/mockPortalResponses.js';
import {
  runPortalLifecycle,
  HAPPY_PATH_FEED,
  HAPPY_PATH_ASSISTED,
  HAPPY_PATH_ADF
} from '../../services/publishing/partnerPortalService.js';
import { getDealerStatusCopy, getDealerStatusBadge, integrationClassLabel } from '../../services/dealer/dealerStatusService.js';
import { generateFeedForPlatform } from '../../services/publishing/feedGeneratorService.js';
import { propagateVehicleUpdate, summarizeUpdatePropagations } from '../../services/inventory/vehicleUpdateService.js';
import { captureOwnedChannelLead, generateAdfLeadFromVehicle, summarizeLeads } from '../../services/storefront/leadCaptureService.js';
import { mockDealership } from '../../fixtures/dealers/dealership.fixture.js';
import { mockVehicles } from '../../fixtures/vehicles/vehicles.fixture.js';
import type { MockPortalCondition, PortalInteractionResult, LeadRecord } from '../../lib/types.js';

function happyPathFor(slug: string): MockPortalCondition[] {
  if (getMockPortalResponse(slug, 'FEED_LIVE')) return HAPPY_PATH_FEED;
  if (getMockPortalResponse(slug, 'PORTAL_APPROVED')) return HAPPY_PATH_ASSISTED;
  return HAPPY_PATH_ADF;
}

function arc(steps: PortalInteractionResult[]): string {
  return ['SUBMITTED', ...steps.map(s => s.toStatus)].join(' → ');
}

const CLASS_ORDER = ['OWNED', 'FEEDABLE', 'ASSISTED', 'PARTNER_DEPENDENT'] as const;

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║  POC v4 — Dealer Storefront & Partner Portal Lifecycle  ║');
console.log('╚══════════════════════════════════════════════════════╝\n');
console.log(`Controlled bubble  ·  ${platformProfiles.length} platforms  ·  4 conditions each\n`);

// ── Platform category summary ────────────────────────────────────────────────
console.log('PLATFORM CATEGORIES');
console.log('───────────────────');
for (const cls of CLASS_ORDER) {
  const group = platformProfiles.filter(p => p.integrationClass === cls);
  console.log(`${integrationClassLabel(cls as typeof CLASS_ORDER[number])} (${group.length})`);
  for (const p of group) console.log(`  • ${p.name}`);
}

// ── Feed artifact generation ─────────────────────────────────────────────────
console.log('\nFEED ARTIFACTS');
console.log('──────────────');
const samplePlatforms = platformProfiles.filter(p =>
  ['dealer-storefront', 'google-vehicle-ads', 'meta-automotive-ads', 'adf-xml-lead-routing', 'reddit-dynamic-product-ads'].includes(p.slug)
);
for (const p of samplePlatforms) {
  const artifact = generateFeedForPlatform(p, mockDealership, mockVehicles);
  const preview = artifact.content.slice(0, 60).replace(/\n/g, ' ');
  console.log(`✓ ${p.name}`);
  console.log(`  format: ${artifact.format}  ·  file: ${artifact.filename}`);
  console.log(`  preview: ${preview}…`);
}

// ── Happy path arc ───────────────────────────────────────────────────────────
console.log('\nHAPPY PATH (SUBMITTED → ACTIVE)');
console.log('────────────────────────────────');
let happyPassed = 0;
for (const p of platformProfiles) {
  const steps = runPortalLifecycle(p, happyPathFor(p.slug));
  const ok = steps.at(-1)!.toStatus === 'ACTIVE';
  if (ok) happyPassed++;
  const copy = getDealerStatusCopy(p, 'ACTIVE');
  console.log(`${ok ? '✅' : '❌'} [${integrationClassLabel(p.integrationClass)}] ${p.name}`);
  console.log(`   ${arc(steps)}`);
  console.log(`   "${copy.headline}" — ${copy.detail}`);
}

// ── Rejection arc ────────────────────────────────────────────────────────────
console.log('\nREJECTION ARC — dealer-facing copy');
console.log('───────────────────────────────────');
for (const p of platformProfiles.slice(0, 4)) {
  const steps = runPortalLifecycle(p, ['PORTAL_REJECTED']);
  const copy = getDealerStatusCopy(p, 'REJECTED', steps[0].dealerAction);
  console.log(`${getDealerStatusBadge('rejected')} ${p.name}`);
  console.log(`   ${copy.headline}`);
  console.log(`   ${copy.detail}`);
  if (copy.cta) console.log(`   CTA: "${copy.cta}"`);
}

// ── Dealer action arc ────────────────────────────────────────────────────────
console.log('\nDEALER ACTION ARC — dealer-facing copy');
console.log('────────────────────────────────────────');
for (const p of platformProfiles.slice(0, 4)) {
  const steps = runPortalLifecycle(p, ['PORTAL_NEEDS_INFO']);
  const copy = getDealerStatusCopy(p, 'DEALER_ACTION_NEEDED', steps[0].dealerAction);
  console.log(`${getDealerStatusBadge('needs_action')} ${p.name}`);
  console.log(`   ${copy.headline}`);
  console.log(`   ${copy.detail}`);
  if (copy.cta) console.log(`   CTA: "${copy.cta}"`);
}

// ── Vehicle update propagation ───────────────────────────────────────────────
console.log('\nVEHICLE UPDATE PROPAGATION');
console.log('──────────────────────────');
const priceEvent = {
  vehicleId: 'v-001', stockNumber: 'LS-1001', dealershipId: 'd-001',
  kind: 'PRICE_CHANGE' as const,
  previousValue: { priceCents: 1899500 },
  newValue: { priceCents: 1799500 }
};
const soldEvent = { ...priceEvent, kind: 'SOLD' as const, newValue: undefined };

const priceResult = propagateVehicleUpdate(priceEvent, platformProfiles);
const soldResult = propagateVehicleUpdate(soldEvent, platformProfiles);
const priceSummary = summarizeUpdatePropagations(priceResult);
const soldSummary = summarizeUpdatePropagations(soldResult);

console.log('Price change $18,995 → $17,995:');
console.log(`  Owned (immediate):  ${priceSummary.immediate}`);
console.log(`  Feed refresh:       ${priceSummary.feedRefresh}`);
console.log(`  Manual update:      ${priceSummary.manualRequired}`);
console.log('Vehicle sold:');
console.log(`  Remove listing:     ${soldSummary.removed} (all platforms)`);

// ── Lead capture ─────────────────────────────────────────────────────────────
console.log('\nLEAD CAPTURE');
console.log('────────────');
const leads: LeadRecord[] = [];

leads.push(captureOwnedChannelLead(mockDealership, {
  vehicleStockNumber: 'LS-1001',
  contactName: 'Alex Johnson',
  contactEmail: 'alex@example.com',
  contactPhone: '5125550201',
  message: 'Is the Honda Accord still available?'
}));

const { lead: adfLead } = generateAdfLeadFromVehicle(
  mockDealership, mockVehicles[1],
  { name: 'Sam Rivera', email: 'sam@example.com', phone: '5125550202', message: 'Interested in the Tesla Model 3.' }
);
leads.push(adfLead);

const leadSummary = summarizeLeads(leads);
console.log(`Captured ${leads.length} leads:`);
for (const [slug, count] of Object.entries(leadSummary)) {
  console.log(`  ${slug}: ${count}`);
}
for (const lead of leads) {
  console.log(`  [${lead.source}] ${lead.contactName} — ${lead.contactEmail}`);
  if (lead.vehicleInterest) {
    const vi = lead.vehicleInterest as Record<string, unknown>;
    console.log(`    Interested in: ${vi['stockNumber'] ?? vi['make'] ?? 'vehicle'}`);
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────
const total = platformProfiles.length;
console.log('\n══════════════════════════════════════════════════════');
console.log(`${happyPassed}/${total} platforms reached ACTIVE on happy path`);
console.log(`${leads.length} leads captured (${leads.filter(l => l.source === 'DEALER_STOREFRONT').length} owned, ${leads.filter(l => l.source === 'ADF_XML').length} ADF)`);
console.log(`${priceSummary.immediate} immediate · ${priceSummary.feedRefresh} feed refresh · ${priceSummary.manualRequired} manual on price change`);
console.log(`${soldSummary.removed} listings removed on sold`);
console.log('Business model: dealer-paid setup + monthly management; partner payouts are upside.');

if (happyPassed !== total) process.exit(1);
