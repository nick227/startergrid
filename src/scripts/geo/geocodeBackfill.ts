import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import { buildOpenCageGeocoder } from '../../lib/geo/geocodeAddress.js';
import { runGeocodeBackfill } from '../../services/geo/geocodeBackfillService.js';

const MIN_CONFIDENCE = 5; // 1–10; 5 = city-level match or better

function parseArgs(args: string[]): { dryRun: boolean; limit?: number } {
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1] ?? '', 10) || undefined : undefined;
  return { dryRun, limit };
}

async function run(): Promise<void> {
  const apiKey = process.env['OPENCAGE_API_KEY'];
  if (!apiKey) {
    console.error('Error: OPENCAGE_API_KEY env var is required.');
    process.exit(1);
  }

  const { dryRun, limit } = parseArgs(process.argv.slice(2));
  const geocodeFn = buildOpenCageGeocoder(apiKey);

  const summary = await runGeocodeBackfill(
    prisma,
    geocodeFn,
    { dryRun, limit, minConfidence: MIN_CONFIDENCE },
  );

  await prisma.$disconnect();
  process.exit(summary.failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
