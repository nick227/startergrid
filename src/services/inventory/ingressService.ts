import type { PrismaClient, Prisma, InventorySourceKind, IngressRunStatus } from '@prisma/client';

// ── Default source constants ──────────────────────────────────────────────────

export const DEFAULT_CSV_SOURCE = {
  slug:  'csv-manual',
  label: 'Manual Upload',
  kind:  'CSV' as InventorySourceKind,
} as const;

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function deriveIngressStatus(
  created: number,
  updated: number,
  errors: number
): IngressRunStatus {
  if (errors > 0 && created + updated === 0) return 'FAILED';
  if (errors > 0) return 'PARTIAL';
  return 'COMMITTED';
}

// ── Public types ──────────────────────────────────────────────────────────────

export type IngressSourceView = {
  id: string;
  slug: string;
  label: string;
  kind: string;
  status: string;
  lastReceivedAt: string | null;
  lastCheckedAt:  string | null;
  createdAt: string;
  updatedAt: string;
};

export type IngressRunView = {
  id: string;
  sourceId:          string | null;
  sourceLabel:       string | null;
  sourceKind:        string;
  status:            string;
  receivedAt:        string;
  completedAt:       string | null;
  vehicleCount:      number;
  createdCount:      number;
  updatedCount:      number;
  skippedCount:      number;
  blockedCount:      number;
  errorCount:        number;
  summaryJson:       unknown;
  platformImpactJson: unknown;
};

export type CreateIngressRunOpts = {
  dealershipId: string;
  sourceId:     string | null;
  sourceKind:   InventorySourceKind;
  status:       IngressRunStatus;
  receivedAt:   Date;
  completedAt:  Date;
  vehicleCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  blockedCount: number;
  errorCount:   number;
  mappingJson?: Record<string, string> | null;
  summaryJson?: Record<string, unknown> | null;
};

// ── DB functions ──────────────────────────────────────────────────────────────

export async function getOrCreateDefaultSource(
  prisma: PrismaClient,
  dealershipId: string
): Promise<string> {
  const existing = await prisma.inventorySource.findUnique({
    where: { dealershipId_slug: { dealershipId, slug: DEFAULT_CSV_SOURCE.slug } },
    select: { id: true }
  });
  if (existing) return existing.id;

  const created = await prisma.inventorySource.create({
    data: {
      dealershipId,
      slug:   DEFAULT_CSV_SOURCE.slug,
      label:  DEFAULT_CSV_SOURCE.label,
      kind:   DEFAULT_CSV_SOURCE.kind,
      status: 'ACTIVE',
    }
  });
  return created.id;
}

export async function createIngressRun(
  prisma: PrismaClient,
  opts: CreateIngressRunOpts
): Promise<string> {
  const run = await prisma.ingressRun.create({
    data: {
      dealershipId: opts.dealershipId,
      sourceId:     opts.sourceId,
      sourceKind:   opts.sourceKind,
      status:       opts.status,
      receivedAt:   opts.receivedAt,
      completedAt:  opts.completedAt,
      vehicleCount: opts.vehicleCount,
      createdCount: opts.createdCount,
      updatedCount: opts.updatedCount,
      skippedCount: opts.skippedCount,
      blockedCount: opts.blockedCount,
      errorCount:   opts.errorCount,
      ...(opts.mappingJson != null
        ? { mappingJson: opts.mappingJson as unknown as Prisma.InputJsonValue }
        : {}),
      ...(opts.summaryJson != null
        ? { summaryJson: opts.summaryJson as unknown as Prisma.InputJsonValue }
        : {}),
    }
  });
  return run.id;
}

export async function listSources(
  prisma: PrismaClient,
  dealershipId: string
): Promise<IngressSourceView[]> {
  const rows = await prisma.inventorySource.findMany({
    where: { dealershipId },
    orderBy: { createdAt: 'asc' }
  });
  return rows.map(r => ({
    id:            r.id,
    slug:          r.slug,
    label:         r.label,
    kind:          r.kind,
    status:        r.status,
    lastReceivedAt: r.lastReceivedAt?.toISOString() ?? null,
    lastCheckedAt:  r.lastCheckedAt?.toISOString()  ?? null,
    createdAt:     r.createdAt.toISOString(),
    updatedAt:     r.updatedAt.toISOString(),
  }));
}

export async function listRuns(
  prisma: PrismaClient,
  dealershipId: string,
  opts: { limit?: number; before?: string } = {}
): Promise<{ runs: IngressRunView[]; hasMore: boolean }> {
  const limit = Math.min(opts.limit ?? 20, 100);

  let cursorDate: Date | undefined;
  if (opts.before) {
    const ref = await prisma.ingressRun.findUnique({
      where: { id: opts.before }, select: { createdAt: true }
    });
    if (ref) cursorDate = ref.createdAt;
  }

  const rows = await prisma.ingressRun.findMany({
    where: {
      dealershipId,
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {})
    },
    orderBy: { receivedAt: 'desc' },
    take: limit + 1,
    include: { source: { select: { label: true } } }
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    runs: page.map(r => ({
      id:                  r.id,
      sourceId:            r.sourceId,
      sourceLabel:         r.source?.label ?? null,
      sourceKind:          r.sourceKind,
      status:              r.status,
      receivedAt:          r.receivedAt.toISOString(),
      completedAt:         r.completedAt?.toISOString() ?? null,
      vehicleCount:        r.vehicleCount,
      createdCount:        r.createdCount,
      updatedCount:        r.updatedCount,
      skippedCount:        r.skippedCount,
      blockedCount:        r.blockedCount,
      errorCount:          r.errorCount,
      summaryJson:         r.summaryJson,
      platformImpactJson:  r.platformImpactJson,
    })),
    hasMore,
  };
}
