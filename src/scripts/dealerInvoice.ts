import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import {
  computeSetupInvoice,
  computeMonthlyInvoice,
  formatCents,
  periodToDateRange,
  type Invoice
} from '../services/invoiceService.js';

function printInvoice(invoice: Invoice) {
  const typeLabel = invoice.type === 'SETUP' ? 'SETUP INVOICE' : `MONTHLY INVOICE — ${invoice.period}`;
  console.log(`\n${typeLabel}`);
  console.log(`Dealer: ${invoice.dealerLegalName}`);
  console.log(`Generated: ${invoice.generatedAt}`);
  console.log('─'.repeat(60));

  for (const item of invoice.lineItems) {
    const amountStr = item.totalCents > 0 ? formatCents(item.totalCents) : 'included';
    const desc = `  ${item.description}`;
    if (desc.length < 50) {
      console.log(desc.padEnd(52) + amountStr);
    } else {
      console.log(desc);
      console.log(''.padEnd(52) + amountStr);
    }
  }

  console.log('─'.repeat(60));
  console.log(`  TOTAL DUE`.padEnd(52) + formatCents(invoice.totalCents));
}

async function main() {
  const [dealershipId, period] = process.argv.slice(2);

  if (!dealershipId || !period) {
    console.error('Usage: dealer:invoice <dealershipId> <YYYY-MM>');
    process.exit(1);
  }

  if (!/^\d{4}-\d{2}$/.test(period)) {
    console.error('Period must be in YYYY-MM format (e.g. 2026-06)');
    process.exit(1);
  }

  const dealer = await prisma.dealershipProfile.findUniqueOrThrow({
    where: { id: dealershipId }
  });

  const subscription = await prisma.dealerSubscription.findUnique({
    where: { dealershipId }
  });

  if (!subscription) {
    console.error(`No subscription found for dealer ${dealershipId}. Run dealer:create first.`);
    process.exit(1);
  }

  // Setup stats
  const readinessRunCount = await prisma.readinessRun.count({ where: { dealershipId } });
  const artifactCount = await prisma.generatedArtifact.count({ where: { dealershipId } });
  const activePlatformCount = await prisma.platformApplication.count({
    where: { dealershipId, status: 'ACTIVE' }
  });
  const latestProof = await prisma.generatedArtifact.findFirst({
    where: { dealershipId, format: 'PROOF_FOLDER_ZIP' },
    orderBy: { createdAt: 'desc' }
  });

  // Monthly stats — scoped to the given period
  const { start, end } = periodToDateRange(period);
  const leadCount = await prisma.lead.count({
    where: { dealershipId, createdAt: { gte: start, lt: end } }
  });
  const vehicleUpdateCount = await prisma.vehicleUpdate.count({
    where: { dealershipId, createdAt: { gte: start, lt: end } }
  });

  const setupInvoice = computeSetupInvoice(
    dealershipId,
    dealer.legalName,
    subscription,
    { readinessRunCount, artifactCount, activePlatformCount, latestProofPath: latestProof?.storagePath ?? null },
    period
  );

  const monthlyInvoice = computeMonthlyInvoice(
    dealershipId,
    dealer.legalName,
    subscription,
    { activePlatformCount, leadCount, vehicleUpdateCount, latestProofPath: latestProof?.storagePath ?? null },
    period
  );

  console.log(`\nInvoice Statement — ${dealer.legalName}`);
  console.log(`Plan: ${subscription.plan}  |  Status: ${subscription.status}`);
  console.log(`Period: ${period}`);
  console.log('═'.repeat(60));

  printInvoice(setupInvoice);
  printInvoice(monthlyInvoice);

  console.log(`\nSubscription active since: ${subscription.activeFrom.toISOString().slice(0, 10)}`);

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
