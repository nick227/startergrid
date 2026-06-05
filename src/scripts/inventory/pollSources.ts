import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { checkApiInventorySource } from '../../services/inventory/sourceCheckService.js';
import {
  isSourceDueForCheck,
  getNextCheckAt,
  summarizeSourcePolling,
  type PollingSourceMeta,
} from '../../services/inventory/sourcePollingService.js';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const dealerFilter   = argValue('--dealer');
const limitArg       = argValue('--limit');
const limit          = limitArg ? parseInt(limitArg, 10) : undefined;
const dryRun         = args.includes('--dry-run');
const retryErrors    = args.includes('--retry-errors');
const verbose        = args.includes('--verbose');

function argValue(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relTime(iso: string, from: Date): string {
  const diffMs = new Date(iso).getTime() - from.getTime();
  const abs    = Math.abs(diffMs);
  if (abs < 60_000) return 'now';
  const mins = Math.floor(abs / 60_000);
  if (abs < 3_600_000) return diffMs < 0 ? `${mins}m ago` : `in ${mins}m`;
  const hrs = Math.floor(abs / 3_600_000);
  if (abs < 86_400_000) return diffMs < 0 ? `${hrs}h ago` : `in ${hrs}h`;
  return diffMs < 0 ? `${Math.floor(hrs / 24)}d ago` : `in ${Math.floor(hrs / 24)}d`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date();

  if (dryRun) console.log('DRY RUN — sources will be evaluated but not checked\n');

  // ── Load sources ────────────────────────────────────────────────────────────

  const whereClause: Prisma.InventorySourceWhereInput = {
    kind: 'API',
    ...(dealerFilter ? { dealershipId: dealerFilter } : {}),
  };

  const rows = await prisma.inventorySource.findMany({
    where:   whereClause,
    include: { dealership: { select: { legalName: true } } },
    orderBy: { lastCheckedAt: 'asc' }, // oldest-first = most urgent
  });

  type SourceEntry = PollingSourceMeta & { dealershipId: string; dealerName: string };

  const sources: SourceEntry[] = rows.map(r => {
    const cfg = r.configJson as Record<string, unknown> | null;
    return {
      id:                  r.id,
      label:               r.label,
      status:              r.status as string,
      pollIntervalMinutes: typeof cfg?.pollIntervalMinutes === 'number' ? cfg.pollIntervalMinutes : null,
      lastCheckedAt:       r.lastCheckedAt?.toISOString() ?? null,
      dealershipId:        r.dealershipId,
      dealerName:          r.dealership.legalName,
    };
  });

  const summary = summarizeSourcePolling(sources, now);

  console.log(`Ingress Source Poll  ${now.toISOString()}`);
  console.log('─'.repeat(60));
  console.log(
    `${summary.total} API sources · ` +
    `${summary.active} active · ` +
    `${summary.due} due · ` +
    `${summary.notDue} not-due · ` +
    `${summary.skipped} paused/disconnected · ` +
    `${summary.errors} error`
  );
  if (dealerFilter) console.log(`Dealer filter: ${dealerFilter}`);
  if (limit)        console.log(`Limit: ${limit}`);
  console.log('');

  // ── Process sources ─────────────────────────────────────────────────────────

  let checked = 0, succeeded = 0, failed = 0, skipped = 0;

  for (const source of sources) {
    const canCheck = source.status === 'ACTIVE' || (retryErrors && source.status === 'ERROR');

    if (!canCheck) {
      if (verbose) {
        console.log(`  SKIP   [${source.status}]  ${source.label}  (${source.dealerName})`);
      }
      skipped++;
      continue;
    }

    const due     = isSourceDueForCheck(source, now);
    const nextAt  = getNextCheckAt(source, now);

    if (!due) {
      const nextLabel = nextAt ? relTime(nextAt, now) : 'no schedule';
      console.log(`  SKIP   ${source.label}  (${source.dealerName})  — next ${nextLabel}`);
      skipped++;
      continue;
    }

    if (limit !== undefined && checked >= limit) {
      console.log(`  LIMIT  reached (${limit} checked)`);
      break;
    }

    const lastLabel = source.lastCheckedAt ? relTime(source.lastCheckedAt, now) : 'never';
    console.log(`  CHECK  ${source.label}  (${source.dealerName})  — last checked ${lastLabel}`);

    if (dryRun) {
      console.log(`         [dry-run] would check source ${source.id}`);
      checked++;
      skipped++;
      continue;
    }

    checked++;

    try {
      const result = await checkApiInventorySource(prisma, source.dealershipId, source.id);

      if (result.success) {
        succeeded++;
        console.log(
          `         OK   ${result.vehicleCount ?? 0} vehicles` +
          ` (${result.created ?? 0} created, ${result.updated ?? 0} updated, ${result.skipped ?? 0} skipped)`
        );
      } else {
        failed++;
        console.log(`         ERR  ${result.error ?? 'unknown error'}`);
      }
    } catch (err) {
      failed++;
      console.log(`         ERR  ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  console.log('');
  console.log('─'.repeat(60));
  if (dryRun) {
    console.log(`Would check: ${checked}  Skipped: ${skipped}`);
  } else {
    console.log(`Checked: ${checked}  Succeeded: ${succeeded}  Failed: ${failed}  Skipped: ${skipped}`);
  }

  await prisma.$disconnect();
  process.exit(!dryRun && failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
