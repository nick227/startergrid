import type { PrismaClient } from '@prisma/client';
import type { GeocodeFn, GeocodeInput } from '../../lib/geo/geocodeAddress.js';

export type BackfillOptions = {
  dryRun:        boolean;
  limit?:        number;
  batchSize?:    number;
  minConfidence: number;
};

export type BackfillSummary = {
  total:     number; // dealers with null coordinates found
  written:   number; // coordinates written (0 in dry-run)
  skipped:   number; // no result or confidence below threshold
  failed:    number; // geocoder threw
};

type RooftopAddress = {
  street?:     string;
  city?:       string;
  state?:      string;
  postalCode?: string;
  country?:    string;
};

function parseAddress(raw: unknown): GeocodeInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const addr = raw as Record<string, unknown>;
  const street     = typeof addr['street']     === 'string' ? addr['street']     : undefined;
  const city       = typeof addr['city']       === 'string' ? addr['city']       : undefined;
  const state      = typeof addr['state']      === 'string' ? addr['state']      : undefined;
  const postalCode = typeof addr['postalCode'] === 'string' ? addr['postalCode'] : undefined;
  const country    = typeof addr['country']    === 'string' ? addr['country']    : undefined;
  if (!city && !postalCode) return null;
  return { street, city, state, postalCode, country };
}

export async function runGeocodeBackfill(
  prisma: PrismaClient,
  geocodeFn: GeocodeFn,
  opts: BackfillOptions,
  log: (msg: string) => void = console.log,
): Promise<BackfillSummary> {
  const batchSize = opts.batchSize ?? 50;

  const dealers = await prisma.dealershipProfile.findMany({
    where: { OR: [{ rooftopLat: null }, { rooftopLng: null }] },
    select: { id: true, legalName: true, rooftopAddress: true },
    take: opts.limit,
  });

  const summary: BackfillSummary = { total: dealers.length, written: 0, skipped: 0, failed: 0 };

  log(`Found ${dealers.length} dealer(s) with missing coordinates${opts.limit ? ` (limit ${opts.limit})` : ''}.`);
  if (opts.dryRun) log('Dry-run mode — no writes will occur.');

  for (let i = 0; i < dealers.length; i += batchSize) {
    const batch = dealers.slice(i, i + batchSize);

    for (const dealer of batch) {
      const addr = parseAddress(dealer.rooftopAddress);
      if (!addr) {
        log(`  SKIP  ${dealer.legalName} — unparseable rooftopAddress`);
        summary.skipped++;
        continue;
      }

      try {
        const result = await geocodeFn(addr);

        if (!result || result.confidence < opts.minConfidence) {
          log(`  SKIP  ${dealer.legalName} — ${result ? `confidence ${result.confidence} < ${opts.minConfidence}` : 'no result'}`);
          summary.skipped++;
          continue;
        }

        if (opts.dryRun) {
          log(`  DRY   ${dealer.legalName} → (${result.lat}, ${result.lng}) conf=${result.confidence}`);
          summary.written++;
          continue;
        }

        await prisma.dealershipProfile.update({
          where: { id: dealer.id },
          data:  { rooftopLat: result.lat, rooftopLng: result.lng },
        });
        log(`  OK    ${dealer.legalName} → (${result.lat}, ${result.lng}) conf=${result.confidence}`);
        summary.written++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`  ERROR ${dealer.legalName} — ${msg}`);
        summary.failed++;
      }
    }
  }

  log(`Done. written=${summary.written} skipped=${summary.skipped} failed=${summary.failed}`);
  return summary;
}
