import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import {
  evaluateGeoVerifyStrict,
  formatGeoVerifyReport,
  runGeoCoordinateVerify,
} from '../../services/geo/geoVerifyService.js';

function parseMinPercent(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    console.error('Error: GEO_VERIFY_MIN_PERCENT must be a number between 0 and 100.');
    process.exit(1);
  }
  return value;
}

async function run(): Promise<void> {
  const strict = process.env['GEO_VERIFY_STRICT'] === 'true';
  const minPercent = parseMinPercent(process.env['GEO_VERIFY_MIN_PERCENT']);

  const report = await runGeoCoordinateVerify(prisma);
  console.log(formatGeoVerifyReport(report));

  const strictResult = evaluateGeoVerifyStrict(report, { strict, minPercent });
  console.log('');
  console.log(`Strict check: ${strictResult.ok ? 'PASS' : 'FAIL'} — ${strictResult.detail}`);

  await prisma.$disconnect();
  process.exit(strictResult.ok ? 0 : 1);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
