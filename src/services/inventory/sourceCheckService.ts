import type { PrismaClient, Prisma } from '@prisma/client';
import { ingestJsonVehicles } from './importService.js';
import { validateBody, jsonIngestSchema, isValidFeedUrl } from '../../server/requestValidation.js';

const FETCH_TIMEOUT_MS   = 30_000;       // 30 s
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB

// ── Public types ──────────────────────────────────────────────────────────────

export type SourceCheckResult = {
  success:      boolean;
  vehicleCount?: number;
  created?:     number;
  updated?:     number;
  skipped?:     number;
  errors?:      number;
  ingressRunId?: string;
  error?:       string;
  checkedAt:    string;
};

// ── Main check function ───────────────────────────────────────────────────────

export async function checkApiInventorySource(
  prisma: PrismaClient,
  dealershipId: string,
  sourceId: string,
): Promise<SourceCheckResult> {
  const checkedAt = new Date();

  const source = await prisma.inventorySource.findFirst({
    where: { id: sourceId, dealershipId },
  });

  if (!source) {
    return { success: false, error: 'Source not found', checkedAt: checkedAt.toISOString() };
  }
  if (source.kind !== 'API') {
    return { success: false, error: `Source kind must be API (got ${source.kind})`, checkedAt: checkedAt.toISOString() };
  }
  if (source.status === 'PAUSED') {
    return { success: false, error: 'Source is paused — activate it before checking', checkedAt: checkedAt.toISOString() };
  }
  if (source.status === 'DISCONNECTED') {
    return { success: false, error: 'Source is disconnected — activate it before checking', checkedAt: checkedAt.toISOString() };
  }

  const cfg     = source.configJson as Record<string, unknown> | null;
  const feedUrl = typeof cfg?.feedUrl === 'string' ? cfg.feedUrl : null;

  if (!feedUrl || !isValidFeedUrl(feedUrl)) {
    return { success: false, error: 'No valid feedUrl configured (HTTPS required; http://localhost allowed for local dev)', checkedAt: checkedAt.toISOString() };
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  let raw: unknown;
  try {
    raw = await fetchWithGuards(feedUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Feed fetch failed';
    await stampFailure(prisma, sourceId, checkedAt, cfg, msg);
    return { success: false, error: msg, checkedAt: checkedAt.toISOString() };
  }

  // ── Validate shape ────────────────────────────────────────────────────────

  const parsed = validateBody(jsonIngestSchema, raw);
  if (!parsed.ok) {
    const msg = `Feed validation failed: ${parsed.error}`;
    await stampFailure(prisma, sourceId, checkedAt, cfg, msg);
    return { success: false, error: msg, checkedAt: checkedAt.toISOString() };
  }

  // ── Stamp lastCheckedAt (before slow ingest) ──────────────────────────────

  await prisma.inventorySource.update({
    where: { id: sourceId },
    data: {
      lastCheckedAt: checkedAt,
      status:        'ACTIVE',
      configJson:    { ...(cfg ?? {}), lastCheckError: null } as unknown as Prisma.InputJsonValue,
    },
  });

  // ── Ingest ────────────────────────────────────────────────────────────────

  const result = await ingestJsonVehicles(prisma, dealershipId, parsed.data.vehicles, {
    sourceSlug:  source.slug,
    sourceLabel: source.label,
    sourceKind:  'API',
  });

  return {
    success:      result.status !== 'FAILED',
    vehicleCount: result.vehicleCount,
    created:      result.created,
    updated:      result.updated,
    skipped:      result.skipped,
    errors:       result.errors,
    ingressRunId: result.ingressRunId,
    checkedAt:    checkedAt.toISOString(),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function stampFailure(
  prisma: PrismaClient,
  sourceId: string,
  checkedAt: Date,
  currentConfig: Record<string, unknown> | null,
  error: string,
): Promise<void> {
  await prisma.inventorySource.update({
    where: { id: sourceId },
    data: {
      lastCheckedAt: checkedAt,
      status:        'ERROR',
      configJson:    { ...(currentConfig ?? {}), lastCheckError: error } as unknown as Prisma.InputJsonValue,
    },
  });
}

async function fetchWithGuards(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let res: Response;
    try {
      res = await fetch(url, {
        signal:  controller.signal,
        headers: { 'Accept': 'application/json', 'User-Agent': 'InventoryIngressBot/1.0' },
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Feed fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
      }
      throw err;
    }

    if (!res.ok) {
      throw new Error(`Feed returned HTTP ${res.status} ${res.statusText}`.trimEnd());
    }

    const contentLength = res.headers.get('content-length');
    if (contentLength) {
      const len = parseInt(contentLength, 10);
      if (!isNaN(len) && len > MAX_RESPONSE_BYTES) {
        throw new Error(`Feed response too large (Content-Length: ${len} bytes, max ${MAX_RESPONSE_BYTES})`);
      }
    }

    const text = await res.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new Error(`Feed response too large (${text.length} bytes, max ${MAX_RESPONSE_BYTES})`);
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Feed response is not valid JSON');
    }
  } finally {
    clearTimeout(timer);
  }
}
