import type { PrismaClient, Prisma } from '@prisma/client';

// ── Column alias map ──────────────────────────────────────────────────────────

type CanonicalField =
  | 'stockNumber' | 'vin' | 'year' | 'make' | 'model' | 'trim'
  | 'mileage' | 'price' | 'condition'
  | 'exteriorColor' | 'interiorColor' | 'bodyStyle'
  | 'drivetrain' | 'fuelType' | 'transmission' | 'photoUrls';

const COLUMN_ALIASES: Record<string, CanonicalField> = {
  'stock': 'stockNumber', 'stock #': 'stockNumber', 'stock#': 'stockNumber',
  'stock number': 'stockNumber', 'stock no': 'stockNumber', 'stock no.': 'stockNumber', 'sku': 'stockNumber',
  'vin': 'vin', 'vin #': 'vin', 'vin#': 'vin', 'vehicle id': 'vin', 'vehicle identification number': 'vin',
  'year': 'year', 'model year': 'year', 'yr': 'year', 'my': 'year',
  'make': 'make', 'brand': 'make', 'manufacturer': 'make',
  'model': 'model', 'model name': 'model',
  'trim': 'trim', 'trim level': 'trim', 'series': 'trim', 'edition': 'trim', 'package': 'trim',
  'mileage': 'mileage', 'miles': 'mileage', 'odometer': 'mileage', 'odo': 'mileage', 'mi': 'mileage',
  'price': 'price', 'list price': 'price', 'selling price': 'price',
  'internet price': 'price', 'sale price': 'price', 'asking price': 'price', 'retail price': 'price',
  'condition': 'condition', 'new/used': 'condition', 'new or used': 'condition',
  'exterior color': 'exteriorColor', 'ext color': 'exteriorColor', 'ext. color': 'exteriorColor',
  'color': 'exteriorColor', 'outside color': 'exteriorColor',
  'interior color': 'interiorColor', 'int color': 'interiorColor', 'int. color': 'interiorColor',
  'inside color': 'interiorColor',
  'body style': 'bodyStyle', 'body type': 'bodyStyle', 'body': 'bodyStyle', 'style': 'bodyStyle',
  'drivetrain': 'drivetrain', 'drive train': 'drivetrain', 'drive': 'drivetrain',
  'drive type': 'drivetrain', 'awd/fwd/rwd': 'drivetrain',
  'fuel type': 'fuelType', 'fuel': 'fuelType', 'engine type': 'fuelType',
  'transmission': 'transmission', 'trans': 'transmission', 'trans type': 'transmission',
  'transmission type': 'transmission',
  'photos': 'photoUrls', 'photo urls': 'photoUrls', 'photo url': 'photoUrls',
  'images': 'photoUrls', 'image urls': 'photoUrls', 'image url': 'photoUrls',
  'photo': 'photoUrls', 'image': 'photoUrls', 'media urls': 'photoUrls', 'media': 'photoUrls',
};

// Required canonical keys as they appear in the mapping (note: 'price' not 'priceCents')
const REQUIRED_MAPPING_KEYS = [
  'stockNumber', 'vin', 'year', 'make', 'model', 'mileage', 'price', 'condition', 'exteriorColor'
] as const;

export function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const h of headers) {
    const key = h.trim().toLowerCase().replace(/\s+/g, ' ');
    const canonical = COLUMN_ALIASES[key];
    if (canonical) mapping[h] = canonical;
  }
  return mapping;
}

// ── Row transformation ────────────────────────────────────────────────────────

export type MappedRow = {
  stockNumber?: string;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  mileage?: number;
  priceCents?: number;
  condition?: string;
  exteriorColor?: string;
  interiorColor?: string;
  bodyStyle?: string;
  drivetrain?: string;
  fuelType?: string;
  transmission?: string;
  photoUrls?: string[];
};

function applyMapping(rawRow: Record<string, string>, mapping: Record<string, string>): MappedRow {
  const result: Record<string, unknown> = {};
  for (const [rawCol, canonical] of Object.entries(mapping)) {
    const raw = (rawRow[rawCol] ?? '').trim();
    if (!raw) continue;
    switch (canonical) {
      case 'year':
        result['year'] = parseInt(raw, 10) || undefined;
        break;
      case 'mileage':
        result['mileage'] = parseInt(raw.replace(/[^0-9]/g, ''), 10) || undefined;
        break;
      case 'price':
        result['priceCents'] = Math.round(parseFloat(raw.replace(/[^0-9.]/g, '')) * 100) || undefined;
        break;
      case 'photoUrls':
        result['photoUrls'] = raw.split(/[,;\s|]+/).map((s: string) => s.trim()).filter(Boolean);
        break;
      default:
        result[canonical] = raw;
    }
  }
  return result as MappedRow;
}

// ── Validation ────────────────────────────────────────────────────────────────

export type ImportIssue = { path: string; message: string; severity: 'FAIL' | 'WARN' };

const REQUIRED_CANONICAL = [
  'stockNumber', 'vin', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition', 'exteriorColor'
] as const;

const WARN_CANONICAL = ['trim', 'bodyStyle', 'photoUrls'] as const;

function validateRow(mapped: MappedRow, rowIndex: number): ImportIssue[] {
  const issues: ImportIssue[] = [];
  const label = mapped.stockNumber ? `Row ${rowIndex} (${mapped.stockNumber})` : `Row ${rowIndex}`;

  for (const field of REQUIRED_CANONICAL) {
    const val = mapped[field as keyof MappedRow];
    if (val === undefined || val === null || val === '') {
      issues.push({ path: field, message: `${label}: ${field} is required`, severity: 'FAIL' });
    }
  }

  if (mapped.vin && !/^[A-HJ-NPR-Z0-9]{10,17}$/i.test(mapped.vin)) {
    issues.push({ path: 'vin', message: `${label}: VIN "${mapped.vin}" is invalid (10–17 chars, no I/O/Q)`, severity: 'FAIL' });
  }

  if (mapped.priceCents !== undefined && mapped.priceCents < 100000) {
    issues.push({ path: 'priceCents', message: `${label}: price $${(mapped.priceCents / 100).toFixed(0)} looks suspiciously low`, severity: 'WARN' });
  }

  if (mapped.photoUrls?.length) {
    for (const url of mapped.photoUrls) {
      if (!/^https?:\/\//i.test(url)) {
        issues.push({ path: 'photoUrls', message: `${label}: photo URL "${url.slice(0, 40)}" is not http/https`, severity: 'WARN' });
        break;
      }
    }
  }

  for (const field of WARN_CANONICAL) {
    const val = mapped[field as keyof MappedRow];
    if (!val || (Array.isArray(val) && val.length === 0)) {
      issues.push({ path: field, message: `${label}: ${field} is missing (recommended for best publish results)`, severity: 'WARN' });
    }
  }

  return issues;
}

// ── Preview ───────────────────────────────────────────────────────────────────

export type ExistingSnapshot = {
  stockNumber: string;
  priceCents: number;
  mileage: number;
  condition: string;
};

export type ImportPreviewRow = {
  rowIndex: number;
  raw: Record<string, string>;
  mapped: MappedRow;
  action: 'CREATE' | 'UPDATE' | 'SKIP';
  issues: ImportIssue[];
  readiness: 'READY' | 'BLOCKED' | 'WARNING';
  existing?: ExistingSnapshot;  // present when action === 'UPDATE'
};

export type ImportPreviewResponse = {
  rows: ImportPreviewRow[];
  unmappedColumns: string[];
  requiredUnmapped: string[];   // required canonical fields with no column mapping
  summary: { total: number; willCreate: number; willUpdate: number; willSkip: number; blocked: number };
  suggestedMapping: Record<string, string>;
};

export async function previewImport(
  prisma: PrismaClient,
  dealershipId: string,
  rawRows: Record<string, string>[],
  overrideMapping: Record<string, string>
): Promise<ImportPreviewResponse> {
  const empty: ImportPreviewResponse = {
    rows: [], unmappedColumns: [], requiredUnmapped: [],
    summary: { total: 0, willCreate: 0, willUpdate: 0, willSkip: 0, blocked: 0 },
    suggestedMapping: {}
  };
  if (!rawRows.length) return empty;

  const headers = Object.keys(rawRows[0]!);
  const suggestedMapping = autoMapColumns(headers);
  const effectiveMapping = { ...suggestedMapping, ...overrideMapping };
  const unmappedColumns = headers.filter(h => !effectiveMapping[h]);

  // Which required canonical fields have no column mapped to them?
  const mappedTo = new Set(Object.values(effectiveMapping).filter(Boolean));
  const requiredUnmapped = REQUIRED_MAPPING_KEYS.filter(k => !mappedTo.has(k));

  // Fetch existing stocks + key fields for UPDATE diff
  const existingVehicles = await prisma.vehicle.findMany({
    where: { dealershipId },
    select: { stockNumber: true, priceCents: true, mileage: true, condition: true }
  });
  const existingByStock = new Map(existingVehicles.map(v => [v.stockNumber, v]));
  const existingSet = new Set(existingVehicles.map(v => v.stockNumber));

  const batchSeen = new Set<string>();
  const rows: ImportPreviewRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i]!;
    const mapped = applyMapping(rawRow, effectiveMapping);
    const issues = validateRow(mapped, i + 1);

    if (mapped.stockNumber) {
      if (batchSeen.has(mapped.stockNumber)) {
        issues.push({ path: 'stockNumber', message: `Row ${i + 1}: duplicate stock "${mapped.stockNumber}" within this batch`, severity: 'FAIL' });
      } else {
        batchSeen.add(mapped.stockNumber);
      }
    }

    const hasFailure = issues.some(iss => iss.severity === 'FAIL');
    const hasWarning = issues.some(iss => iss.severity === 'WARN');
    const action: 'CREATE' | 'UPDATE' | 'SKIP' = hasFailure
      ? 'SKIP'
      : (mapped.stockNumber && existingSet.has(mapped.stockNumber)) ? 'UPDATE' : 'CREATE';
    const readiness: 'READY' | 'BLOCKED' | 'WARNING' = hasFailure ? 'BLOCKED' : hasWarning ? 'WARNING' : 'READY';
    const existing = action === 'UPDATE' && mapped.stockNumber
      ? (existingByStock.get(mapped.stockNumber) ?? undefined)
      : undefined;

    rows.push({ rowIndex: i + 1, raw: rawRow, mapped, action, issues, readiness, existing });
  }

  return {
    rows,
    unmappedColumns,
    requiredUnmapped,
    summary: {
      total: rows.length,
      willCreate: rows.filter(r => r.action === 'CREATE').length,
      willUpdate: rows.filter(r => r.action === 'UPDATE').length,
      willSkip: rows.filter(r => r.action === 'SKIP').length,
      blocked: rows.filter(r => r.readiness === 'BLOCKED').length,
    },
    suggestedMapping,
  };
}

// ── Commit ────────────────────────────────────────────────────────────────────

function normalizeCondition(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower === 'new' || lower === 'n') return 'NEW';
  if (lower === 'used' || lower === 'u') return 'USED';
  if (lower === 'cpo' || lower.includes('certified')) return 'CPO';
  return raw.toUpperCase().slice(0, 24);
}

export type CommitResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  batchId: string;
};

export async function commitImport(
  prisma: PrismaClient,
  dealershipId: string,
  rawRows: Record<string, string>[],
  mapping: Record<string, string>
): Promise<CommitResult> {
  const preview = await previewImport(prisma, dealershipId, rawRows, mapping);
  const result: CommitResult = { created: 0, updated: 0, skipped: 0, errors: 0, batchId: '' };

  for (const row of preview.rows) {
    if (row.action === 'SKIP') { result.skipped++; continue; }
    const m = row.mapped;
    if (!m.stockNumber) { result.skipped++; continue; }

    const commonData = {
      vin: m.vin ?? '',
      year: m.year ?? 0,
      make: m.make ?? '',
      model: m.model ?? '',
      trim: m.trim ?? null,
      mileage: m.mileage ?? 0,
      priceCents: m.priceCents ?? 0,
      condition: normalizeCondition(m.condition ?? ''),
      exteriorColor: m.exteriorColor ?? '',
      interiorColor: m.interiorColor ?? null,
      bodyStyle: m.bodyStyle ?? null,
      drivetrain: m.drivetrain ?? null,
      fuelType: m.fuelType ?? null,
      transmission: m.transmission ?? null,
      options: [] as unknown as Prisma.InputJsonValue,
      starCore: {} as unknown as Prisma.InputJsonValue,
    };

    const mediaCreate = (m.photoUrls ?? [])
      .map((url, idx) => ({ url, kind: 'IMAGE', sortOrder: idx }));

    try {
      if (row.action === 'CREATE') {
        await prisma.vehicle.create({
          data: {
            dealershipId,
            stockNumber: m.stockNumber,
            ...commonData,
            ...(mediaCreate.length ? { media: { create: mediaCreate } } : {}),
          }
        });
        result.created++;
      } else {
        const existing = await prisma.vehicle.findFirst({ where: { dealershipId, stockNumber: m.stockNumber } });
        if (!existing) { result.skipped++; continue; }
        await prisma.vehicle.update({
          where: { id: existing.id },
          data: {
            ...commonData,
            ...(mediaCreate.length ? { media: { deleteMany: {}, create: mediaCreate } } : {}),
          }
        });
        result.updated++;
      }
    } catch (err: unknown) {
      console.error(`Import commit error on row ${row.rowIndex}:`, err);
      result.errors++;
    }
  }

  // Record import batch as a SyncEvent for history
  try {
    const mappedFields = [...new Set(Object.values(mapping).filter(Boolean))];
    const event = await prisma.syncEvent.create({
      data: {
        dealershipId,
        kind: 'INVENTORY_IMPORT',
        payload: {
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors,
          rowCount: rawRows.length,
          mappedFields,
        } as unknown as Prisma.InputJsonValue,
      }
    });
    result.batchId = event.id;
  } catch (err) {
    console.error('Failed to record import batch event:', err);
  }

  const { scheduleAutoReconcile } = await import('../publishing/autoReconcileService.js');
  scheduleAutoReconcile(dealershipId, { full: true });

  return result;
}

// ── Readiness classifier (used by the inventory list endpoint) ────────────────

export type VehicleReadinessInfo = {
  readiness: 'READY' | 'BLOCKED' | 'WARNING';
  issues: ImportIssue[];
};

export function classifyVehicleReadiness(v: {
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  priceCents: number;
  condition: string;
  exteriorColor: string;
  bodyStyle: string | null;
  mediaCount: number;
}): VehicleReadinessInfo {
  const issues: ImportIssue[] = [];
  const label = `${v.stockNumber}`;

  if (!v.vin) issues.push({ path: 'vin', message: `${label}: VIN missing`, severity: 'FAIL' });
  else if (!/^[A-HJ-NPR-Z0-9]{10,17}$/i.test(v.vin))
    issues.push({ path: 'vin', message: `${label}: VIN "${v.vin}" has invalid format`, severity: 'FAIL' });

  if (!v.year || v.year < 1900)
    issues.push({ path: 'year', message: `${label}: year is missing or invalid`, severity: 'FAIL' });
  if (!v.make) issues.push({ path: 'make', message: `${label}: make missing`, severity: 'FAIL' });
  if (!v.model) issues.push({ path: 'model', message: `${label}: model missing`, severity: 'FAIL' });
  if (!v.condition) issues.push({ path: 'condition', message: `${label}: condition missing`, severity: 'FAIL' });
  if (!v.exteriorColor) issues.push({ path: 'exteriorColor', message: `${label}: exterior color missing`, severity: 'FAIL' });

  if (!v.priceCents)
    issues.push({ path: 'priceCents', message: `${label}: price not set`, severity: 'FAIL' });
  else if (v.priceCents < 100000)
    issues.push({ path: 'priceCents', message: `${label}: price $${(v.priceCents / 100).toFixed(0)} looks suspiciously low`, severity: 'WARN' });

  if (!v.trim) issues.push({ path: 'trim', message: `${label}: trim level not set`, severity: 'WARN' });
  if (!v.bodyStyle) issues.push({ path: 'bodyStyle', message: `${label}: body style not set`, severity: 'WARN' });
  if (v.mediaCount === 0) issues.push({ path: 'media', message: `${label}: no photos uploaded`, severity: 'WARN' });

  const readiness: 'READY' | 'BLOCKED' | 'WARNING' =
    issues.some(i => i.severity === 'FAIL') ? 'BLOCKED' :
    issues.some(i => i.severity === 'WARN') ? 'WARNING' : 'READY';

  return { readiness, issues };
}
