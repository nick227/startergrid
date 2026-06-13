import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { requireSuperAdmin } from '../security.js';
import {
  listProviderCredentials,
  listPlatformCredentialSummaries,
  runCredentialValidation,
  runPlatformCredentialValidation,
  getCachedCredentialValidationRun,
} from '../../services/platform/credentialHealthService.js';
import { platformProfiles } from '../../data/platformProfiles.js';
import { PlatformClientRegistry } from '../../services/platform/clients/PlatformClientRegistry.js';
import { CATALOG_BRIDGE_SLUGS } from './catalogSync.js';
import { LISTING_BRIDGE_SLUGS } from './marketplaceListings.js';
import { isRegisteredCategory } from '@auto-dealer/category-schemas';
import { createDealershipSchema, validateBody } from '../requestValidation.js';
import { createDealership } from '../../services/dealer/createDealershipService.js';

type DashboardCache = {
  data: any;
  expiresAt: number;
};
let dashboardCache: DashboardCache | null = null;
const CACHE_TTL_MS = 60_000;

type BlockedDealersCache = {
  data: any;
  expiresAt: number;
};
const blockedDealersCache = new Map<string, BlockedDealersCache>();

export function resetBlockedDealersCache(): void {
  blockedDealersCache.clear();
}

export function resetDashboardCache(): void {
  dashboardCache = null;
  blockedDealersCache.clear();
}

const userSelectWithAccess = {
  id:          true,
  email:       true,
  role:        true,
  isActive:    true,
  lastLoginAt: true,
  createdAt:   true,
  updatedAt:   true,
  dealerAccess: {
    select: {
      dealership: {
        select: {
          id: true,
          legalName: true,
          dbaName: true,
          logoUrl: true,
          businessCategory: true,
          createdAt: true,
        },
      },
    },
    orderBy: { dealership: { legalName: 'asc' } },
  },
} as const;

function summarizeUser(account: any) {
  const { dealerAccess, ...user } = account;
  return {
    ...user,
    dealerAccess: (dealerAccess ?? []).map((row: any) => row.dealership),
  };
}

function parseDealerAccessIds(body: any): string[] | null {
  if (!Array.isArray(body?.dealerAccessIds)) return null;
  const ids = body.dealerAccessIds
    .map((id: unknown) => String(id).trim())
    .filter((id: string) => id.length > 0);
  return [...new Set<string>(ids)];
}

async function replaceUserDealerAccess(prisma: PrismaClient, userId: string, dealerIds: string[], actorId: string) {
  const existing = await prisma.dealershipProfile.findMany({
    where: { id: { in: dealerIds } },
    select: { id: true },
  });
  if (existing.length !== dealerIds.length) {
    const err = new Error('One or more selected dealerships do not exist');
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  await prisma.$transaction([
    prisma.operatorDealerAccess.deleteMany({ where: { operatorAccountId: userId } }),
    ...dealerIds.map(dealershipId =>
      prisma.operatorDealerAccess.create({
        data: { operatorAccountId: userId, dealershipId, grantedBy: actorId },
      })
    ),
  ]);
}

export function registerAdminRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.post('/api/admin/dealers', async (request, reply) => {
    const operator = await requireSuperAdmin(prisma, request, reply);
    if (!operator) return;

    const parsed = validateBody(createDealershipSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });

    try {
      const result = await createDealership(prisma, parsed.data, {
        createdByOperatorId: operator.devHeader ? null : operator.id,
      });
      resetDashboardCache();
      return reply.status(201).send({
        dealer: result.dealer,
        nextHref: `#/admin/dealers/${result.dealer.id}`,
        mode: 'admin',
      });
    } catch (err) {
      const statusCode = typeof err === 'object' && err !== null && 'statusCode' in err
        ? Number((err as { statusCode?: number }).statusCode)
        : 500;
      const message = err instanceof Error ? err.message : 'Failed to create dealership';
      return reply.status(statusCode || 500).send({ error: message });
    }
  });

  app.get('/api/admin/platform-credentials', async (request, reply) => {
    if (!await requireSuperAdmin(prisma, request, reply)) return;
    return reply.send({
      providers: listProviderCredentials(),
      platforms: listPlatformCredentialSummaries(),
    });
  });

  app.post('/api/admin/platform-credentials/validate', async (request, reply) => {
    const operator = await requireSuperAdmin(prisma, request, reply);
    if (!operator) return;
    return reply.send(await runCredentialValidation(prisma, { id: operator.id, email: operator.email }));
  });

  app.post('/api/admin/platform-credentials/:platformSlug/validate', async (request, reply) => {
    const operator = await requireSuperAdmin(prisma, request, reply);
    if (!operator) return;
    const { platformSlug } = request.params as { platformSlug: string };
    return reply.send(await runPlatformCredentialValidation(prisma, { id: operator.id, email: operator.email }, platformSlug));
  });

  app.get('/api/admin/dashboard', async (request, reply) => {
    if (!await requireSuperAdmin(prisma, request, reply)) return;

    const startedAt = Date.now();

    // Check cache first
    if (dashboardCache && dashboardCache.expiresAt > startedAt) {
      const cachedResponse = { ...dashboardCache.data };
      cachedResponse.meta = {
        ...cachedResponse.meta,
        cached: true,
      };
      return reply.send(cachedResponse);
    }

    try {
      // 1. Health checks
      let dbHealth = 'healthy';
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (err) {
        dbHealth = 'unhealthy';
      }

      // Queue status
      const pendingCount = await prisma.publishQueueItem.count({
        where: { status: { in: ['READY', 'SCHEDULED', 'CLAIMED'] } }
      });
      const failedCount = await prisma.publishQueueItem.count({
        where: { status: 'FAILED' }
      });
      const retryingCount = await prisma.publishQueueItem.count({
        where: { status: { in: ['READY', 'SCHEDULED'] }, attemptCount: { gt: 0 } }
      });
      const heldCount = await prisma.publishQueueItem.count({
        where: { status: { in: ['HELD', 'NEEDS_APPROVAL'] } }
      });

      const oldestPending = await prisma.publishQueueItem.findFirst({
        where: { status: { in: ['READY', 'SCHEDULED', 'CLAIMED'] } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      });
      const oldestPendingAgeSec = oldestPending
        ? Math.floor((Date.now() - oldestPending.createdAt.getTime()) / 1000)
        : null;

      let queueHealth = 'flowing';
      if (dbHealth === 'unhealthy') {
        queueHealth = 'unhealthy';
      } else if (oldestPendingAgeSec !== null && oldestPendingAgeSec > 3600) {
        queueHealth = 'backed_up';
      }

      // Credentials health (strictly cached-read only)
      const cachedCreds = getCachedCredentialValidationRun();
      let credentialsHealth = 'unknown';
      if (cachedCreds) {
        if (cachedCreds.results.some(r => r.status === 'invalid')) {
          credentialsHealth = 'invalid';
        } else if (cachedCreds.results.some(r => r.status === 'unknown' || r.status === 'unreachable')) {
          credentialsHealth = 'unknown';
        } else {
          credentialsHealth = 'valid';
        }
      }

      const health = {
        api: 'healthy',
        db: dbHealth,
        queue: queueHealth,
        credentials: credentialsHealth,
      };

      // 2. Readiness checks (including cheap geocode checks)
      const registryValid = platformProfiles.length > 0 ? 'valid' : 'invalid';
      const bridgesValid = CATALOG_BRIDGE_SLUGS.size > 0 && LISTING_BRIDGE_SLUGS.size > 0 ? 'valid' : 'invalid';
      const oauthClientsValid = PlatformClientRegistry.allClients().length > 0 ? 'valid' : 'invalid';
      const categorySchemasValid = isRegisteredCategory('AUTOMOTIVE') ? 'valid' : 'invalid';

      // Cheap DB-driven geo coordinate coverage
      const totalDealers = await prisma.dealershipProfile.count();
      let geoCoordinates = 'UNKNOWN';
      let addressableDealers = 0;
      let geocodedDealers = 0;
      let coveragePercent = 0;

      if (totalDealers > 0) {
        const dealers = await prisma.dealershipProfile.findMany({
          select: {
            rooftopAddress: true,
            rooftopLat: true,
            rooftopLng: true,
          }
        });
        for (const d of dealers) {
          const addr = d.rooftopAddress as any;
          const isAddressable = addr && typeof addr === 'object' && addr.street && addr.city && addr.state;
          if (isAddressable) {
            addressableDealers++;
            const isGeocoded = typeof d.rooftopLat === 'number' && typeof d.rooftopLng === 'number' && d.rooftopLat !== 0 && d.rooftopLng !== 0;
            if (isGeocoded) {
              geocodedDealers++;
            }
          }
        }
        if (addressableDealers > 0) {
          coveragePercent = Math.round((geocodedDealers / addressableDealers) * 100);
          geoCoordinates = coveragePercent === 100 ? 'PASS' : 'WARNING';
        }
      }

      const readiness = {
        platformRegistry: registryValid,
        bridges: bridgesValid,
        oauthClients: oauthClientsValid,
        categorySchemas: categorySchemasValid,
        geoCoordinates,
        smokeMarketplace: 'UNKNOWN',
        smokeOperator: 'UNKNOWN',
      };

      // 3. Queue snapshot
      const lastSync = await prisma.syncRun.findFirst({
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true }
      });

      const queueSnapshot = {
        pending: pendingCount,
        failed: failedCount,
        retrying: retryingCount,
        held: heldCount,
        oldestPendingAgeSec,
        lastSuccessSyncAt: lastSync?.completedAt?.toISOString() ?? null,
      };

      // 4. Platform Overview
      const dayAgo = new Date(startedAt - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(startedAt - 7 * 24 * 60 * 60 * 1000);
      const platformOverview = await Promise.all(platformProfiles.map(async p => {
        const capabilities: string[] = [];
        if (p.catalogSync) capabilities.push('catalogSync');
        if (p.socialPosting) capabilities.push('socialPosting');
        if (p.marketplaceListing) capabilities.push('marketplaceListing');
        if (p.partnerFeed) capabilities.push('partnerFeed');
        if ((p as any).testFixtures?.supportsLeadCapture) capabilities.push('leadCapture');

        const client = PlatformClientRegistry.forSlug(p.slug);
        const configured = client ? client.isConfigured() : false;

        let liveValidationStatus = 'unknown';
        if (cachedCreds) {
          const credResult = cachedCreds.results.find(r => r.platformSlugs.includes(p.slug) || r.provider === client?.provider);
          if (credResult) {
            liveValidationStatus = credResult.status;
          }
        }

        const dealersUsing = await prisma.platformApplication.count({
          where: { platform: { slug: p.slug }, status: { not: 'NOT_STARTED' } }
        });

        const eligibleDealers = await prisma.platformApplication.count({
          where: { platform: { slug: p.slug }, status: 'ACTIVE' }
        });

        const blockedDealers = await prisma.platformApplication.count({
          where: { platform: { slug: p.slug }, status: { in: ['DEALER_ACTION_NEEDED', 'REJECTED', 'PARTNER_REQUIRED'] } }
        });

        const [
          activeMarketplaceListings,
          publishedSocialPosts,
          sentQueueItems,
          outboundToday,
          outbound7d,
          outboundAllTime,
          failedQueueItems24h,
          dispatchFailures24h,
          blockedQueueItems,
        ] = await Promise.all([
          prisma.marketplaceListing.count({
            where: { platformSlug: p.slug, status: 'ACTIVE' },
          }),
          prisma.socialPost.count({
            where: { platformSlug: p.slug, status: 'PUBLISHED' },
          }),
          prisma.publishQueueItem.count({
            where: { platformSlug: p.slug, status: 'SENT' },
          }),
          prisma.publishQueueItem.count({
            where: { platformSlug: p.slug, sentAt: { gte: dayAgo } },
          }),
          prisma.publishQueueItem.count({
            where: { platformSlug: p.slug, sentAt: { gte: weekAgo } },
          }),
          prisma.publishQueueItem.count({
            where: { platformSlug: p.slug, sentAt: { not: null } },
          }),
          prisma.publishQueueItem.count({
            where: { platformSlug: p.slug, status: 'FAILED', updatedAt: { gte: dayAgo } },
          }),
          prisma.syncEvent.count({
            where: { platformSlug: p.slug, kind: 'DISPATCH_FAILED', createdAt: { gte: dayAgo } },
          }),
          prisma.publishQueueItem.count({
            where: { platformSlug: p.slug, status: { in: ['BLOCKED', 'HELD'] } },
          }),
        ]);

        const liveInventory = activeMarketplaceListings + publishedSocialPosts + sentQueueItems;
        const recentFailures = failedQueueItems24h + dispatchFailures24h;
        const blockedItems = blockedQueueItems;
        const operationalStatus = !configured || liveValidationStatus === 'invalid' || recentFailures > 0
          ? 'red'
          : blockedDealers > 0 || blockedItems > 0 || liveValidationStatus === 'unknown' || liveValidationStatus === 'not-configured'
            ? 'yellow'
            : 'green';

        return {
          platformName: p.name,
          platformSlug: p.slug,
          platformType: p.integrationClass === 'OWNED' ? 'internal' : 'external',
          capabilities,
          configured,
          liveValidationStatus,
          dealersUsing,
          eligibleDealers,
          blockedDealers,
          liveInventory,
          outboundToday,
          outbound7d,
          outboundAllTime,
          recentFailures,
          blockedItems,
          operationalStatus,
          integrationMaturity: p.integrationMaturity || 'UNKNOWN',
          supportedCategories: p.supportedCategories,
        };
      }));

      // 5. Simple Dealer Attention (v1 triage)
      const dealerAttention: any[] = [];

      // A: Failed Publish Queue Items
      const failedQueueItems = await prisma.publishQueueItem.findMany({
        where: { status: 'FAILED' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { dealership: true }
      });
      for (const item of failedQueueItems) {
        dealerAttention.push({
          dealerId: item.dealershipId,
          dealerName: item.dealership.legalName,
          category: item.dealership.businessCategory,
          platformSlug: item.platformSlug,
          severity: 'critical',
          reason: `Sync failed: ${item.failureReason || 'unknown failure'}`,
          nextAction: 'Resolve platform error or retry sync',
        });
      }

      // B: Held/Blocked Applications
      const blockedApplications = await prisma.platformApplication.findMany({
        where: { status: { in: ['DEALER_ACTION_NEEDED', 'REJECTED', 'PARTNER_REQUIRED'] } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { dealership: true, platform: true }
      });
      for (const app of blockedApplications) {
        dealerAttention.push({
          dealerId: app.dealershipId,
          dealerName: app.dealership.legalName,
          category: app.dealership.businessCategory,
          platformSlug: app.platform.slug,
          severity: app.status === 'REJECTED' ? 'critical' : 'warning',
          reason: `Application blocked: ${app.status} (${app.notes || 'no notes'})`,
          nextAction: app.nextAction || 'Resolve platform requirements',
        });
      }

      // C: Stale sync runs
      const staleSyncRuns = await prisma.syncRun.findMany({
        where: {
          status: 'PENDING',
          createdAt: { lt: new Date(Date.now() - 2 * 3600 * 1000) } // 2 hours
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { dealership: true }
      });
      for (const run of staleSyncRuns) {
        dealerAttention.push({
          dealerId: run.dealershipId,
          dealerName: run.dealership.legalName,
          category: run.dealership.businessCategory,
          platformSlug: 'all',
          severity: 'warning',
          reason: `Sync run stuck in PENDING since ${run.createdAt.toISOString()}`,
          nextAction: 'Restart sync runner or contact support',
        });
      }

      // Sort critical first, then warning, then info
      const SEVERITY_ORDER: Record<string, number> = { critical: 1, warning: 2, info: 3 };
      dealerAttention.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3));

      // 6. Recent Events (Sanitized AdminAuditLog)
      const logs = await prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15
      });
      const recentEvents = logs.map(log => {
        let detailString = '';
        if (log.detail && typeof log.detail === 'object') {
          const detailObj = log.detail as Record<string, any>;
          const keys = Object.keys(detailObj).filter(k => 
            !k.toLowerCase().includes('secret') && 
            !k.toLowerCase().includes('token') && 
            !k.toLowerCase().includes('key')
          );
          detailString = keys.map(k => `${k}: ${typeof detailObj[k] === 'object' ? JSON.stringify(detailObj[k]) : detailObj[k]}`).join(', ');
        }
        return {
          id: log.id,
          action: log.action,
          actorId: log.actorId,
          actorEmail: log.actorEmail,
          detailString,
          createdAt: log.createdAt.toISOString(),
        };
      });

      const durationMs = Date.now() - startedAt;
      const meta = {
        generatedAt: new Date().toISOString(),
        cached: false,
        durationMs,
      };

      const dashboardData = {
        health,
        readiness,
        queueSnapshot,
        platformOverview,
        dealerAttention: dealerAttention.slice(0, 20),
        recentEvents,
        meta,
      };

      dashboardCache = {
        data: dashboardData,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };

      return reply.send(dashboardData);
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to compile dashboard: ${err.message}` });
    }
  });

  app.get('/api/admin/blocked-dealers', async (request, reply) => {
    if (!await requireSuperAdmin(prisma, request, reply)) return;

    const query = request.query as any;
    const cacheKey = JSON.stringify(query);
    const startedAt = Date.now();

    // Check cache first
    const cached = blockedDealersCache.get(cacheKey);
    if (cached && cached.expiresAt > startedAt) {
      const cachedResponse = { ...cached.data };
      cachedResponse.meta = {
        ...cachedResponse.meta,
        cached: true,
      };
      return reply.send(cachedResponse);
    }

    try {
      // 1. Gather all dealerships for lookup
      const dealerships = await prisma.dealershipProfile.findMany();
      const dealerMap = new Map(dealerships.map(d => [d.id, d]));

      const blockedDealers: any[] = [];

      // 2. PlatformApplication Blockers (DEALER_ACTION_NEEDED, REJECTED, PARTNER_REQUIRED)
      const apps = await prisma.platformApplication.findMany({
        where: {
          status: { in: ['DEALER_ACTION_NEEDED', 'REJECTED', 'PARTNER_REQUIRED'] }
        },
        include: { platform: true }
      });
      for (const app of apps) {
        const dealer = dealerMap.get(app.dealershipId);
        if (!dealer) continue;
        blockedDealers.push({
          id: `app-${app.id}`,
          severity: app.status === 'REJECTED' ? 'critical' : 'warning',
          dealerId: app.dealershipId,
          dealerName: dealer.legalName,
          category: dealer.businessCategory,
          platformSlug: app.platform.slug,
          platformName: app.platform.name,
          source: 'partner_setup',
          reason: `Application blocked: ${app.status} (${app.notes || 'no notes'})`,
          nextAction: app.nextAction || 'Resolve platform requirements',
          status: app.status,
          firstSeenAt: (app.createdAt ?? new Date()).toISOString(),
          lastSeenAt: (app.updatedAt ?? new Date()).toISOString(),
          affectedCount: null,
          dealerHref: `#/${app.dealershipId}/platforms`,
          platformHref: `#/${app.dealershipId}/platforms/${app.platform.slug}`,
        });
      }

      // 3. PublishQueueItem Blockers (FAILED)
      const failedQueueItems = await prisma.publishQueueItem.findMany({
        where: { status: 'FAILED' }
      });
      // Group by dealer and platform to avoid duplicate rows, showing affected count
      const failedGroupKey = (q: typeof failedQueueItems[0]) => `${q.dealershipId}-${q.platformSlug}`;
      const failedGroups = new Map<string, typeof failedQueueItems>();
      for (const item of failedQueueItems) {
        const key = failedGroupKey(item);
        if (!failedGroups.has(key)) failedGroups.set(key, []);
        failedGroups.get(key)!.push(item);
      }
      for (const [key, items] of failedGroups) {
        const item = items[0];
        const dealer = dealerMap.get(item.dealershipId);
        if (!dealer) continue;
        const profile = platformProfiles.find(p => p.slug === item.platformSlug);
        const platformName = profile?.name || item.platformSlug;
        const oldest = items.reduce((old, cur) => cur.createdAt < old.createdAt ? cur : old, item);
        const newest = items.reduce((newest, cur) => cur.updatedAt > newest.updatedAt ? cur : newest, item);
        blockedDealers.push({
          id: `queue-${key}`,
          severity: 'critical',
          dealerId: item.dealershipId,
          dealerName: dealer.legalName,
          category: dealer.businessCategory,
          platformSlug: item.platformSlug,
          platformName,
          source: 'feed_validation',
          reason: `Publishing failed for ${items.length} item(s): ${item.failureReason || 'unknown failure'}`,
          nextAction: 'Resolve platform error or retry sync',
          status: 'FAILED',
          firstSeenAt: (oldest.createdAt ?? new Date()).toISOString(),
          lastSeenAt: (newest.updatedAt ?? new Date()).toISOString(),
          affectedCount: items.length,
          dealerHref: `#/${item.dealershipId}/platforms`,
          platformHref: `#/${item.dealershipId}/platforms/${item.platformSlug}`,
        });
      }

      // 3b. PlatformAccount Blockers (FAILED connections)
      const failedAccounts = await prisma.platformAccount.findMany({
        where: { state: 'FAILED' }
      });
      for (const acc of failedAccounts) {
        const dealer = dealerMap.get(acc.dealershipId);
        if (!dealer) continue;
        const profile = platformProfiles.find(p => p.slug === acc.platformSlug);
        const platformName = profile?.name || acc.platformSlug;
        blockedDealers.push({
          id: `account-${acc.id}`,
          severity: 'critical',
          dealerId: acc.dealershipId,
          dealerName: dealer.legalName,
          category: dealer.businessCategory,
          platformSlug: acc.platformSlug,
          platformName,
          source: 'dealer_partner_credentials',
          reason: `Connection Validation Failed: ${acc.lastValidationNote || 'unknown'}`,
          nextAction: acc.nextAction || 'Correct credentials and re-validate',
          status: 'FAILED',
          firstSeenAt: (acc.createdAt ?? new Date()).toISOString(),
          lastSeenAt: (acc.lastValidatedAt ?? acc.updatedAt ?? new Date()).toISOString(),
          affectedCount: null,
          dealerHref: `#/${acc.dealershipId}/platforms`,
          platformHref: `#/${acc.dealershipId}/platforms/${acc.platformSlug}`,
        });
      }

      // 4. Stale Sync Runs (PENDING and > 2 hours)
      const staleRuns = await prisma.syncRun.findMany({
        where: {
          status: 'PENDING',
          createdAt: { lt: new Date(Date.now() - 2 * 3600 * 1000) }
        }
      });
      // Group by dealer
      const staleGroups = new Map<string, typeof staleRuns>();
      for (const run of staleRuns) {
        if (!staleGroups.has(run.dealershipId)) staleGroups.set(run.dealershipId, []);
        staleGroups.get(run.dealershipId)!.push(run);
      }
      for (const [dealerId, runs] of staleGroups) {
        const run = runs[0];
        const dealer = dealerMap.get(dealerId);
        if (!dealer) continue;
        const oldest = runs.reduce((old, cur) => cur.createdAt < old.createdAt ? cur : old, run);
        const newest = runs.reduce((newest, cur) => cur.createdAt > newest.createdAt ? cur : newest, run);
        blockedDealers.push({
          id: `sync_run-${dealerId}`,
          severity: 'warning',
          dealerId,
          dealerName: dealer.legalName,
          category: dealer.businessCategory,
          platformSlug: 'all',
          platformName: 'All Platforms',
          source: 'feed_validation',
          reason: `${runs.length} sync run(s) stuck in PENDING since ${oldest.createdAt.toISOString()}`,
          nextAction: 'Restart sync runner or contact support',
          status: 'PENDING',
          firstSeenAt: (oldest.createdAt ?? new Date()).toISOString(),
          lastSeenAt: (newest.createdAt ?? new Date()).toISOString(),
          affectedCount: runs.length,
          dealerHref: `#/${dealerId}/platforms`,
          platformHref: `#/${dealerId}/platforms`,
        });
      }

      // 5. SyncEvent failures (DISPATCH_FAILED)
      const dispatchFailedEvents = await prisma.syncEvent.findMany({
        where: { kind: 'DISPATCH_FAILED' },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      // Group by dealer + platform to avoid massive duplication
      const eventGroupKey = (e: typeof dispatchFailedEvents[0]) => `${e.dealershipId}-${e.platformSlug || 'all'}`;
      const eventGroups = new Map<string, typeof dispatchFailedEvents>();
      for (const ev of dispatchFailedEvents) {
        const key = eventGroupKey(ev);
        if (!eventGroups.has(key)) eventGroups.set(key, []);
        eventGroups.get(key)!.push(ev);
      }
      for (const [key, evs] of eventGroups) {
        const ev = evs[0];
        const dealer = dealerMap.get(ev.dealershipId);
        if (!dealer) continue;
        const platformSlug = ev.platformSlug || 'all';
        const profile = platformProfiles.find(p => p.slug === platformSlug);
        const platformName = profile?.name || (platformSlug === 'all' ? 'All Platforms' : platformSlug);
        const oldest = evs.reduce((old, cur) => cur.createdAt < old.createdAt ? cur : old, ev);
        const newest = evs.reduce((newest, cur) => cur.createdAt > newest.createdAt ? cur : newest, ev);
        
        let errorMsg = 'unknown error';
        if (ev.payload && typeof ev.payload === 'object') {
          const payloadObj = ev.payload as Record<string, any>;
          errorMsg = payloadObj.error || payloadObj.message || JSON.stringify(payloadObj);
          // Sanitize secrets / key references from payload
          errorMsg = errorMsg.replace(/(access_token|client_secret|private_key|token|secret|key)=\S+/gi, '$1=[REDACTED]');
        }
        
        blockedDealers.push({
          id: `sync_event-${key}`,
          severity: 'critical',
          dealerId: ev.dealershipId,
          dealerName: dealer.legalName,
          category: dealer.businessCategory,
          platformSlug,
          platformName,
          source: 'feed_validation',
          reason: `Dispatch failed ${evs.length} time(s): ${errorMsg}`,
          nextAction: 'Check platform connection or retry item',
          status: 'FAILED',
          firstSeenAt: (oldest.createdAt ?? new Date()).toISOString(),
          lastSeenAt: (newest.createdAt ?? new Date()).toISOString(),
          affectedCount: evs.length,
          dealerHref: `#/${ev.dealershipId}/platforms`,
          platformHref: platformSlug === 'all' ? `#/${ev.dealershipId}/platforms` : `#/${ev.dealershipId}/platforms/${platformSlug}`,
        });
      }

      // 6. DealershipProfile geo coordinates readiness issues
      for (const dealer of dealerships) {
        const addr = dealer.rooftopAddress as any;
        const isAddressable = addr && typeof addr === 'object' && addr.street && addr.city && addr.state;
        if (isAddressable) {
          const isGeocoded = typeof dealer.rooftopLat === 'number' && typeof dealer.rooftopLng === 'number' && dealer.rooftopLat !== 0 && dealer.rooftopLng !== 0;
          if (!isGeocoded) {
            blockedDealers.push({
              id: `geo-${dealer.id}`,
              severity: 'warning',
              dealerId: dealer.id,
              dealerName: dealer.legalName,
              category: dealer.businessCategory,
              platformSlug: 'all',
              platformName: 'All Platforms',
              source: 'geo_readiness',
              reason: 'Dealer has address but no geocoded coordinates',
              nextAction: 'Run geo backfill or verify dealer address',
              status: 'NOT_CONFIGURED',
              firstSeenAt: (dealer.createdAt ?? new Date()).toISOString(),
              lastSeenAt: (dealer.updatedAt ?? new Date()).toISOString(),
              affectedCount: null,
              dealerHref: `#/${dealer.id}/platforms`,
              platformHref: `#/${dealer.id}/platforms`,
            });
          }
        }
      }

      // 7. Cached platform credentials validation errors
      const cachedCreds = getCachedCredentialValidationRun();
      if (cachedCreds) {
        for (const res of cachedCreds.results) {
          if (res.status === 'invalid' || res.status === 'unknown' || res.status === 'unreachable') {
            const platformSlugs = res.platformSlugs;
            const activeDealerApps = await prisma.platformApplication.findMany({
              where: {
                platform: { slug: { in: platformSlugs } },
                status: { not: 'NOT_STARTED' }
              },
              include: { platform: true }
            });
            for (const app of activeDealerApps) {
              const dealer = dealerMap.get(app.dealershipId);
              if (!dealer) continue;
              
              blockedDealers.push({
                id: `credentials-${app.dealershipId}-${app.platform.slug}`,
                severity: res.status === 'invalid' ? 'critical' : 'warning',
                dealerId: app.dealershipId,
                dealerName: dealer.legalName,
                category: dealer.businessCategory,
                platformSlug: app.platform.slug,
                platformName: app.platform.name,
                source: 'developer_credentials',
                reason: `Platform credentials validation failed for provider ${res.provider} (${res.status})`,
                nextAction: 'Update developer API keys on Credentials page',
                status: res.status.toUpperCase(),
                firstSeenAt: new Date(cachedCreds.meta.lastCheckedAt).toISOString(),
                lastSeenAt: new Date(cachedCreds.meta.lastCheckedAt).toISOString(),
                affectedCount: null,
                dealerHref: `#/${app.dealershipId}/platforms`,
                platformHref: `#/${app.dealershipId}/platforms/${app.platform.slug}`,
              });
            }
          }
        }
      }

      // 8. Filters
      let filtered = blockedDealers;
      const severityFilter = query.severity;
      const categoryFilter = query.category;
      const platformFilter = query.platform;
      const sourceFilter = query.source;
      const searchFilter = query.q;

      if (severityFilter) {
        filtered = filtered.filter(item => item.severity === severityFilter);
      }
      if (categoryFilter) {
        filtered = filtered.filter(item => item.category === categoryFilter);
      }
      if (platformFilter) {
        filtered = filtered.filter(item => item.platformSlug === platformFilter);
      }
      if (sourceFilter) {
        filtered = filtered.filter(item => item.source === sourceFilter);
      }
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        filtered = filtered.filter(item => 
          item.dealerName.toLowerCase().includes(q) || 
          item.reason.toLowerCase().includes(q)
        );
      }

      // 9. Sort: Critical first, then Warning, then Info. Secondary: lastSeenAt descending.
      const SEVERITY_ORDER: Record<string, number> = { critical: 1, warning: 2, info: 3 };
      filtered.sort((a, b) => {
        const diff = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
        if (diff !== 0) return diff;
        return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
      });

      // 10. Summary counts based on search filters *except* severity filter
      let summaryFiltered = blockedDealers;
      if (categoryFilter) summaryFiltered = summaryFiltered.filter(item => item.category === categoryFilter);
      if (platformFilter) summaryFiltered = summaryFiltered.filter(item => item.platformSlug === platformFilter);
      if (sourceFilter) summaryFiltered = summaryFiltered.filter(item => item.source === sourceFilter);
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        summaryFiltered = summaryFiltered.filter(item => 
          item.dealerName.toLowerCase().includes(q) || 
          item.reason.toLowerCase().includes(q)
        );
      }
      const summary = {
        total: summaryFiltered.length,
        critical: summaryFiltered.filter(item => item.severity === 'critical').length,
        warning: summaryFiltered.filter(item => item.severity === 'warning').length,
        info: summaryFiltered.filter(item => item.severity === 'info').length,
      };

      // 11. Pagination
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.max(1, parseInt(query.limit || '10', 10));
      const total = filtered.length;
      const pages = Math.ceil(total / limit);
      const items = filtered.slice((page - 1) * limit, page * limit);

      const durationMs = Date.now() - startedAt;
      const meta = {
        generatedAt: new Date().toISOString(),
        cached: false,
        durationMs,
      };

      const responsePayload = {
        items,
        pagination: {
          total,
          page,
          limit,
          pages,
        },
        summary,
        meta,
      };

      // Store in cache
      blockedDealersCache.set(cacheKey, {
        data: responsePayload,
        expiresAt: Date.now() + 30_000, // 30s cache
      });

      return reply.send(responsePayload);
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to compile blocked dealers: ${err.message}` });
    }
  });

  // ── User Management ───────────────────────────────────────────────────────

  function generateSecurePassword(): string {
    // 18 random bytes → 24-char base64url string (no padding), always ≥ MIN_PASSWORD_LENGTH
    return randomBytes(18).toString('base64url');
  }

  // GET /api/admin/users
  app.get('/api/admin/users', async (request, reply) => {
    if (!await requireSuperAdmin(prisma, request, reply)) return;

    const query = request.query as any;
    const page  = Math.max(1, parseInt(query.page  ?? '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
    const q     = (query.q    ?? '').trim();
    const role  = (query.role ?? '').trim();

    const where: any = {};
    if (q)    where.email = { contains: q, mode: 'insensitive' };
    if (role) where.role  = role;

    const [total, accounts] = await Promise.all([
      prisma.operatorAccount.count({ where }),
      prisma.operatorAccount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          ...userSelectWithAccess,
        },
      }),
    ]);

    return reply.send({
      users: accounts.map(summarizeUser),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  });

  // POST /api/admin/users
  app.post('/api/admin/users', async (request, reply) => {
    const actor = await requireSuperAdmin(prisma, request, reply);
    if (!actor) return;

    const body = request.body as any;
    const email = (body?.email ?? '').trim().toLowerCase();
    const role  = body?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'OPERATOR';
    const dealerAccessIds = parseDealerAccessIds(body) ?? [];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.status(400).send({ error: 'A valid email address is required' });
    }

    const existing = await prisma.operatorAccount.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'An account with this email already exists' });
    }

    const { hashPassword } = await import('../../services/auth/passwordService.js');
    const plainPassword = generateSecurePassword();
    const passwordHash  = await hashPassword(plainPassword);

    const account = await prisma.operatorAccount.create({
      data: { email, passwordHash, role },
      select: userSelectWithAccess,
    });

    if (dealerAccessIds.length > 0) {
      await replaceUserDealerAccess(prisma, account.id, dealerAccessIds, actor.id);
    }

    const created = await prisma.operatorAccount.findUnique({
      where: { id: account.id },
      select: userSelectWithAccess,
    });

    // Audit
    await prisma.adminAuditLog.create({
      data: {
        action:     'USER_CREATED',
        actorId:    actor.id,
        actorEmail: actor.email,
        detail:     { targetEmail: email, role, dealerAccessIds },
      },
    });

    return reply.status(201).send({ user: summarizeUser(created), plainPassword });
  });

  // PATCH /api/admin/users/:userId
  app.patch('/api/admin/users/:userId', async (request, reply) => {
    const actor = await requireSuperAdmin(prisma, request, reply);
    if (!actor) return;

    const { userId } = request.params as { userId: string };
    const body = request.body as any;

    const target = await prisma.operatorAccount.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!target) return reply.status(404).send({ error: 'User not found' });

    // Prevent self-lock
    if (target.id === actor.id && body?.isActive === false) {
      return reply.status(400).send({ error: 'You cannot suspend your own account' });
    }

    let plainPassword: string | undefined;

    if (body?.resetPassword === true) {
      // Generate and hash a new password
      const { hashPassword } = await import('../../services/auth/passwordService.js');
      plainPassword = generateSecurePassword();
      const passwordHash = await hashPassword(plainPassword);

      await prisma.operatorAccount.update({
        where: { id: userId },
        data: { passwordHash },
      });

      // Revoke all existing sessions for this user
      await prisma.operatorSession.deleteMany({ where: { operatorAccountId: userId } });

      await prisma.adminAuditLog.create({
        data: {
          action:     'USER_PASSWORD_RESET',
          actorId:    actor.id,
          actorEmail: actor.email,
          detail:     { targetEmail: target.email },
        },
      });
    }

    if (typeof body?.isActive === 'boolean') {
      await prisma.operatorAccount.update({
        where: { id: userId },
        data: { isActive: body.isActive },
      });

      if (!body.isActive) {
        // Revoke all sessions on suspend
        await prisma.operatorSession.deleteMany({ where: { operatorAccountId: userId } });
      }

      await prisma.adminAuditLog.create({
        data: {
          action:     body.isActive ? 'USER_REINSTATED' : 'USER_SUSPENDED',
          actorId:    actor.id,
          actorEmail: actor.email,
          detail:     { targetEmail: target.email },
        },
      });
    }

    const dealerAccessIds = parseDealerAccessIds(body);
    if (dealerAccessIds) {
      await replaceUserDealerAccess(prisma, userId, dealerAccessIds, actor.id);
      await prisma.adminAuditLog.create({
        data: {
          action:     'USER_DEALER_ACCESS_UPDATED',
          actorId:    actor.id,
          actorEmail: actor.email,
          detail:     { targetEmail: target.email, dealerAccessIds },
        },
      });
    }

    const updated = await prisma.operatorAccount.findUnique({
      where: { id: userId },
      select: userSelectWithAccess,
    });

    return reply.send({ user: summarizeUser(updated), ...(plainPassword ? { plainPassword } : {}) });
  });

  // DELETE /api/admin/users/:userId
  app.delete('/api/admin/users/:userId', async (request, reply) => {
    const actor = await requireSuperAdmin(prisma, request, reply);
    if (!actor) return;

    const { userId } = request.params as { userId: string };

    const target = await prisma.operatorAccount.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!target) return reply.status(404).send({ error: 'User not found' });

    if (target.id === actor.id) {
      return reply.status(400).send({ error: 'You cannot delete your own account' });
    }

    // Cascade: sessions and dealer-access rows are ON DELETE CASCADE in schema
    await prisma.operatorAccount.delete({ where: { id: userId } });

    await prisma.adminAuditLog.create({
      data: {
        action:     'USER_DELETED',
        actorId:    actor.id,
        actorEmail: actor.email,
        detail:     { targetEmail: target.email },
      },
    });

    return reply.status(200).send({ ok: true });
  });
}
