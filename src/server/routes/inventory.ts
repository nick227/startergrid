import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  applyVehicleUpdate,
  validatePriceUpdate,
  validatePhotoUpdate
} from '../../services/inventory/inventoryUpdateService.js';
import {
  previewImport,
  commitImport,
  ingestJsonVehicles,
} from '../../services/inventory/importService.js';
import { listInventoryVehicles, type LifecycleScope } from '../../services/inventory/inventoryListService.js';
import { buildInventoryReadiness } from '../../services/inventory/inventoryReadinessService.js';
import { buildDistributionSummary } from '../../services/inventory/inventoryDistributionService.js';
import { requireDealerAccess, requireOperator } from '../security.js';
import {
  bulkEditSchema,
  emptyBodySchema,
  inventoryImportSchema,
  jsonIngestSchema,
  photoUpdateSchema,
  priceUpdateSchema,
  snapshotCommitSchema,
  decodeVinSchema,
  createFromVinSchema,
  bulkVinPreviewSchema,
  bulkVinCommitSchema,
  mediaSlotAssignSchema,
  decodeCategoryIdentifierSchema,
  createCategoryItemSchema,
  updateCategoryItemSchema,
  validateBody,
} from '../requestValidation.js';
import { normalizeVin, validateVin, resolveVinDecoder } from '../../services/inventory/vin/index.js';
import { createVehicleShell, BULK_VIN_SOURCE } from '../../services/inventory/vehicleShellService.js';
import { buildVehicleChannelMatrix, STOREFRONT_CHANNEL_KEY } from '../../services/inventory/vehicleChannelService.js';
import { platformProfiles } from '../../data/platformProfiles.js';
import { getCategoryInventorySchema, getMediaGuide } from '@auto-dealer/category-schemas';
import type { BusinessCategoryId } from '@auto-dealer/category-schemas';
import { resolveIdentifierDecoder } from '../../services/inventory/identifiers/index.js';
import { createCategoryItemShell } from '../../services/inventory/categoryItemShellService.js';
import { categoryItemToInventoryRecord } from '../../services/inventory/inventoryRecordAdapter.js';

type VehicleParams = { dealershipId: string; stockNumber: string };
type DealerParams = { dealershipId: string };

async function findDealer(prisma: PrismaClient, dealershipId: string) {
  return prisma.dealershipProfile.findUnique({ where: { id: dealershipId }, select: { id: true } });
}

export function registerInventoryRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // ── Inventory list ──────────────────────────────────────────────────────────

  app.get<{ Params: DealerParams; Querystring: { lifecycleScope?: string } }>(
    '/api/dealers/:dealershipId/inventory',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const rawScope = request.query.lifecycleScope ?? 'active';
      const scope: LifecycleScope =
        rawScope === 'sold' || rawScope === 'removed' || rawScope === 'all'
          ? rawScope
          : 'active';

      const result = await listInventoryVehicles(prisma, dealershipId, scope);
      return reply.send(result);
    }
  );

  // ── Import preview (no DB writes) ────────────────────────────────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/import/preview',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(inventoryImportSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const result = await previewImport(prisma, dealershipId, body.data.rows, body.data.mapping ?? {});
      return reply.send(result);
    }
  );

  // ── Import commit ─────────────────────────────────────────────────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/import/commit',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(inventoryImportSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const result = await commitImport(prisma, dealershipId, body.data.rows, body.data.mapping ?? {});
      return reply.send(result);
    }
  );

  // ── JSON ingest ───────────────────────────────────────────────────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/ingest/json',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(jsonIngestSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const result = await ingestJsonVehicles(prisma, dealershipId, body.data.vehicles, {
        sourceSlug:  body.data.sourceSlug,
        sourceLabel: body.data.sourceLabel,
        snapshotMode: body.data.snapshotMode,
        dryRun: body.data.dryRun,
        commitSnapshotRemovals: body.data.commitSnapshotRemovals,
      });
      return reply.send(result);
    }
  );

  // ── Snapshot removal commit (explicit, after dry-run ingest) ─────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/ingest/snapshot/commit',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(snapshotCommitSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const { commitSnapshotRemovals } = await import('../../services/inventory/salesStatusReconcileService.js');
      const result = await commitSnapshotRemovals(
        prisma,
        dealershipId,
        body.data.ingressRunId,
        body.data.stockNumbers,
        {
          statusChangedAt: body.data.statusChangedAt
            ? new Date(body.data.statusChangedAt)
            : undefined,
        },
      );

      if (result.rejected.length > 0 && result.applied === 0) {
        return reply.status(400).send({
          error: 'No stock numbers matched the snapshot dry-run for this ingress run',
          ...result,
        });
      }

      return reply.send(result);
    }
  );

  // ── Lifecycle audit trail ───────────────────────────────────────────────────

  app.get<{ Params: DealerParams; Querystring: { limit?: string; stockNumber?: string } }>(
    '/api/dealers/:dealershipId/inventory/lifecycle-events',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const { listLifecycleEvents } = await import('../../services/inventory/lifecycleEventService.js');
      const events = await listLifecycleEvents(prisma, dealershipId, {
        limit: Number.isFinite(limit) ? limit : 50,
        stockNumber: request.query.stockNumber,
      });

      return reply.send({ events });
    }
  );

  // ── Bulk field edit ───────────────────────────────────────────────────────────

  app.patch<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/bulk',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(bulkEditSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const result = await prisma.vehicle.updateMany({
        where: { dealershipId, stockNumber: { in: body.data.stockNumbers } },
        data: body.data.fields
      });

      if (result.count > 0) {
        const { scheduleAutoReconcile } = await import('../../services/publishing/autoReconcileService.js');
        scheduleAutoReconcile(dealershipId, { full: true });
      }

      return reply.send({ updated: result.count });
    }
  );

  // ── Import batch history ──────────────────────────────────────────────────────

  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/import/batches',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const events = await prisma.syncEvent.findMany({
        where: { dealershipId, kind: 'INVENTORY_IMPORT' },
        orderBy: { createdAt: 'desc' },
        take: 15,
      });

      return reply.send({
        batches: events.map(e => ({
          id: e.id,
          createdAt: e.createdAt.toISOString(),
          ...(e.payload as Record<string, unknown>),
        }))
      });
    }
  );

  app.patch<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/vehicles/:stockNumber/price',
    async (request, reply) => {
      if (!await requireDealerAccess(prisma, request, reply, request.params.dealershipId)) return;
      const body = validateBody(priceUpdateSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const validation = validatePriceUpdate(body.data);
      if (!validation.ok) return reply.status(400).send({ error: validation.error });
      try {
        const result = await applyVehicleUpdate(
          prisma, request.params.dealershipId, request.params.stockNumber,
          'PRICE_CHANGE', { priceCents: validation.priceCents }
        );
        return reply.send(result);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found'))
          return reply.status(404).send({ error: err.message });
        throw err;
      }
    }
  );

  app.post<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/vehicles/:stockNumber/sold',
    async (request, reply) => {
      if (!await requireDealerAccess(prisma, request, reply, request.params.dealershipId)) return;
      const body = validateBody(emptyBodySchema, request.body ?? {});
      if (!body.ok) return reply.status(400).send({ error: body.error });

      try {
        const result = await applyVehicleUpdate(
          prisma, request.params.dealershipId, request.params.stockNumber, 'SOLD'
        );
        return reply.send(result);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found'))
          return reply.status(404).send({ error: err.message });
        throw err;
      }
    }
  );

  app.post<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/vehicles/:stockNumber/removed',
    async (request, reply) => {
      if (!await requireDealerAccess(prisma, request, reply, request.params.dealershipId)) return;
      const body = validateBody(emptyBodySchema, request.body ?? {});
      if (!body.ok) return reply.status(400).send({ error: body.error });

      try {
        const result = await applyVehicleUpdate(
          prisma, request.params.dealershipId, request.params.stockNumber, 'REMOVED'
        );
        return reply.send(result);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found'))
          return reply.status(404).send({ error: err.message });
        throw err;
      }
    }
  );

  app.patch<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/vehicles/:stockNumber/photos',
    async (request, reply) => {
      if (!await requireDealerAccess(prisma, request, reply, request.params.dealershipId)) return;
      const body = validateBody(photoUpdateSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const validation = validatePhotoUpdate(body.data);
      if (!validation.ok) return reply.status(400).send({ error: validation.error });
      try {
        const result = await applyVehicleUpdate(
          prisma, request.params.dealershipId, request.params.stockNumber,
          'PHOTO_CHANGE', { photoUrls: validation.photoUrls }
        );
        return reply.send(result);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found'))
          return reply.status(404).send({ error: err.message });
        throw err;
      }
    }
  );

  // ── VIN decode ────────────────────────────────────────────────────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/automotive/decode-vin',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(decodeVinSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const normalized = normalizeVin(body.data.vin);
      const validation = validateVin(normalized);
      if (!validation.valid) {
        return reply.status(400).send({ error: validation.error, vin: normalized, valid: false });
      }

      // Duplicate check
      const existing = await prisma.vehicle.findFirst({
        where: { dealershipId, vin: normalized },
        select: { id: true, stockNumber: true, soldAt: true, removedAt: true },
      });

      const decoded = await resolveVinDecoder().decode(normalized);

      return reply.send({
        vin:        normalized,
        valid:      true,
        checkDigitOk: validation.checkDigitOk,
        duplicate:  existing ? true : false,
        existingVehicleId: existing?.id ?? null,
        existingStockNumber: existing?.stockNumber ?? null,
        decoded:    decoded.decoded,
        provider:   decoded.provider,
        fields: {
          year:         decoded.year,
          make:         decoded.make,
          model:        decoded.model,
          trim:         decoded.trim,
          bodyStyle:    decoded.bodyStyle,
          fuelType:     decoded.fuelType,
          drivetrain:   decoded.drivetrain,
          transmission: decoded.transmission,
          engineDescription: decoded.engineDescription,
          manufacturer: decoded.manufacturer,
        },
        warnings: decoded.warnings,
      });
    }
  );

  // ── Create vehicle shell from VIN ─────────────────────────────────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/automotive/vehicles',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(createFromVinSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const normalized = normalizeVin(body.data.vin);
      const validation = validateVin(normalized);
      if (!validation.valid) {
        return reply.status(400).send({ error: validation.error });
      }

      // Block duplicate VINs
      const existing = await prisma.vehicle.findFirst({
        where: { dealershipId, vin: normalized },
        select: { id: true, stockNumber: true },
      });
      if (existing) {
        return reply.status(409).send({
          error: 'VIN already exists in your inventory',
          vehicleId: existing.id,
          stockNumber: existing.stockNumber,
        });
      }

      const operator = await requireOperator(prisma, request, reply);
      if (!operator) return;

      const decoded = await resolveVinDecoder().decode(normalized);
      const result = await createVehicleShell(prisma, {
        dealershipId,
        vin: normalized,
        stockNumber: body.data.stockNumber,
        priceCents: body.data.priceCents,
        mileage: body.data.mileage,
        condition: body.data.condition,
        decoded,
        adminActorId: operator.role === 'SUPER_ADMIN' ? operator.id : undefined,
      });

      return reply.status(201).send(result);
    }
  );

  // ── Bulk VIN preview ──────────────────────────────────────────────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/automotive/bulk-vins/preview',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(bulkVinPreviewSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const decoder = resolveVinDecoder();
      const rows = await Promise.all(
        body.data.vins.map(async (rawVin, i) => {
          const normalized = normalizeVin(rawVin);
          const validation = validateVin(normalized);
          if (!validation.valid) {
            return { index: i, vin: normalized, status: 'INVALID' as const, error: validation.error, decoded: null };
          }
          const duplicate = await prisma.vehicle.findFirst({
            where: { dealershipId, vin: normalized },
            select: { id: true, stockNumber: true },
          });
          if (duplicate) {
            return { index: i, vin: normalized, status: 'DUPLICATE' as const, existingVehicleId: duplicate.id, decoded: null };
          }
          const decoded = await decoder.decode(normalized);
          return {
            index: i, vin: normalized, status: 'VALID' as const,
            decoded: decoded.decoded,
            fields: { year: decoded.year, make: decoded.make, model: decoded.model, trim: decoded.trim },
            warnings: decoded.warnings,
          };
        })
      );

      const summary = {
        total:     rows.length,
        valid:     rows.filter(r => r.status === 'VALID').length,
        invalid:   rows.filter(r => r.status === 'INVALID').length,
        duplicate: rows.filter(r => r.status === 'DUPLICATE').length,
      };

      return reply.send({ rows, summary });
    }
  );

  // ── Bulk VIN commit ───────────────────────────────────────────────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/automotive/bulk-vins/commit',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(bulkVinCommitSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const operator = await requireOperator(prisma, request, reply);
      if (!operator) return;

      const decoder = resolveVinDecoder();
      let created = 0; let skipped = 0; let failed = 0;
      const errors: Array<{ vin: string; reason: string }> = [];
      let ingressRunId: string | null = null;

      for (const rawVin of body.data.vins) {
        const normalized = normalizeVin(rawVin);
        const validation = validateVin(normalized);
        if (!validation.valid) { skipped++; continue; }

        const existing = await prisma.vehicle.findFirst({
          where: { dealershipId, vin: normalized }, select: { id: true },
        });
        if (existing) { skipped++; continue; }

        try {
          const decoded = await decoder.decode(normalized);
          const result = await createVehicleShell(prisma, {
            dealershipId, vin: normalized, decoded,
            stockNumber: body.data.stockNumberMap?.[normalized],
            adminActorId: operator.role === 'SUPER_ADMIN' ? operator.id : undefined,
            sourceSlug: BULK_VIN_SOURCE.slug,
            sourceLabel: BULK_VIN_SOURCE.label,
          });
          if (!ingressRunId) ingressRunId = result.ingressRunId;
          created++;
        } catch {
          failed++;
          errors.push({ vin: normalized, reason: 'Creation failed' });
        }
      }

      return reply.send({ created, skipped, failed, ingressRunId, errors });
    }
  );

  // ── Vehicle detail ────────────────────────────────────────────────────────────

  type VehicleDetailParams = { dealershipId: string; vehicleId: string };

  app.get<{ Params: VehicleDetailParams }>(
    '/api/dealers/:dealershipId/inventory/vehicles/:vehicleId',
    async (request, reply) => {
      const { dealershipId, vehicleId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, dealershipId },
        include: {
          media: {
            select: {
              id: true, url: true, kind: true, sortOrder: true,
              width: true, height: true, mimeType: true,
              mediaSlotKey: true, mediaRole: true,
              customLabel: true, customGroup: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
          dealership: { select: { businessCategory: true } },
        },
      });
      if (!vehicle) return reply.status(404).send({ error: 'Vehicle not found' });

      const assignedSlotKeys = vehicle.media
        .filter(m => m.mediaSlotKey)
        .map(m => m.mediaSlotKey as string);

      const readiness = buildInventoryReadiness({
        category: vehicle.dealership.businessCategory as import('@auto-dealer/category-schemas').BusinessCategoryId,
        fields: {
          vin: vehicle.vin, stockNumber: vehicle.stockNumber, year: vehicle.year,
          make: vehicle.make, model: vehicle.model, mileage: vehicle.mileage,
          priceCents: vehicle.priceCents, condition: vehicle.condition,
          exteriorColor: vehicle.exteriorColor,
        },
        assignedMediaSlotKeys: assignedSlotKeys,
        totalMediaCount: vehicle.media.length,
      });

      const distribution = await buildDistributionSummary(prisma, dealershipId, vehicleId);

      return reply.send({
        id: vehicle.id,
        dealershipId: vehicle.dealershipId,
        category: vehicle.dealership.businessCategory,
        priceLastChangedAt: vehicle.priceLastChangedAt?.toISOString() ?? null,
        vin: vehicle.vin,
        stockNumber: vehicle.stockNumber,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        bodyStyle: vehicle.bodyStyle,
        drivetrain: vehicle.drivetrain,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        mileage: vehicle.mileage,
        priceCents: vehicle.priceCents,
        originalPriceCents: vehicle.originalPriceCents,
        condition: vehicle.condition,
        exteriorColor: vehicle.exteriorColor,
        interiorColor: vehicle.interiorColor,
        options: vehicle.options ?? [],
        listingStatus: vehicle.listingStatus,
        soldAt: vehicle.soldAt?.toISOString() ?? null,
        removedAt: vehicle.removedAt?.toISOString() ?? null,
        reactivatedAt: vehicle.reactivatedAt?.toISOString() ?? null,
        createdAt: vehicle.createdAt.toISOString(),
        updatedAt: vehicle.updatedAt.toISOString(),
        media: vehicle.media,
        readiness,
        distribution,
      });
    }
  );

  // ── Media slot assignment ─────────────────────────────────────────────────────

  type MediaSlotParams = { dealershipId: string; vehicleId: string; mediaId: string };

  app.patch<{ Params: MediaSlotParams }>(
    '/api/dealers/:dealershipId/inventory/vehicles/:vehicleId/media/:mediaId/slot',
    async (request, reply) => {
      const { dealershipId, vehicleId, mediaId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const body = validateBody(mediaSlotAssignSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const { slotKey } = body.data;

      // Verify media belongs to this dealer's vehicle
      const media = await prisma.vehicleMedia.findFirst({
        where: { id: mediaId, vehicleId },
        include: { vehicle: { select: { dealershipId: true, dealership: { select: { businessCategory: true } } } } },
      });
      if (!media) return reply.status(404).send({ error: 'Media not found' });
      if (media.vehicle.dealershipId !== dealershipId)
        return reply.status(403).send({ error: 'Forbidden' });

      // Validate slotKey against category media guide
      if (slotKey !== null) {
        const category = media.vehicle.dealership.businessCategory;
        const guide = getMediaGuide(category as import('@auto-dealer/category-schemas').BusinessCategoryId);
        if (guide) {
          const validKeys = new Set(guide.slots.map(s => s.key));
          if (!validKeys.has(slotKey)) {
            return reply.status(400).send({ error: `Unknown slot key '${slotKey}' for category ${category}` });
          }
        }
      }

      const operator = await requireOperator(prisma, request, reply);
      if (!operator) return;

      const updated = await prisma.vehicleMedia.update({
        where: { id: mediaId },
        data: {
          mediaSlotKey: slotKey,
          mediaRole:    slotKey ? 'STRUCTURED_SHOT' : 'GALLERY_IMAGE',
          assignedBy:   operator.id,
        },
        select: { id: true, mediaSlotKey: true, mediaRole: true, url: true, sortOrder: true, customLabel: true, customGroup: true },
      });

      // Admin audit for privileged actions
      if (operator.role === 'SUPER_ADMIN') {
        await prisma.adminAuditLog.create({
          data: {
            action: 'ASSIGN_MEDIA_SLOT',
            actorId: operator.id,
            actorEmail: operator.email,
            detail: { dealershipId, vehicleId, mediaId, slotKey } as unknown as import('@prisma/client').Prisma.InputJsonValue,
          },
        });
      }

      return reply.send(updated);
    }
  );

  // ── Media label (custom card name) ────────────────────────────────────────────

  app.patch<{ Params: MediaSlotParams }>(
    '/api/dealers/:dealershipId/inventory/vehicles/:vehicleId/media/:mediaId/label',
    async (request, reply) => {
      const { dealershipId, vehicleId, mediaId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const body = request.body as Record<string, unknown> | null;
      const raw = body?.['customLabel'];
      if (raw !== null && typeof raw !== 'string') {
        return reply.status(400).send({ error: 'customLabel must be a string or null' });
      }
      const customLabel = typeof raw === 'string' ? raw.trim().slice(0, 120) || null : null;

      const media = await prisma.vehicleMedia.findFirst({
        where: { id: mediaId, vehicleId, vehicle: { dealershipId } },
        select: { id: true },
      });
      if (!media) return reply.status(404).send({ error: 'Media not found' });

      const updated = await prisma.vehicleMedia.update({
        where: { id: mediaId },
        data: { customLabel },
        select: { id: true, customLabel: true, customGroup: true, mediaSlotKey: true, url: true },
      });

      return reply.send(updated);
    }
  );

  // ── Patch vehicle fields ──────────────────────────────────────────────────────

  type VehicleFieldPatch = {
    stockNumber?: string;
    priceCents?: number;
    mileage?: number;
    condition?: string;
    exteriorColor?: string;
    interiorColor?: string | null;
    trim?: string | null;
    bodyStyle?: string | null;
    drivetrain?: string | null;
    fuelType?: string | null;
    transmission?: string | null;
  };

  function validateVehicleFieldPatch(body: unknown): { ok: true; data: VehicleFieldPatch } | { ok: false; error: string } {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { ok: false, error: 'Body must be a JSON object' };
    }
    const b = body as Record<string, unknown>;
    const data: VehicleFieldPatch = {};
    const stringOrNullFields = ['interiorColor', 'trim', 'bodyStyle', 'drivetrain', 'fuelType', 'transmission'];
    const stringFields = ['stockNumber', 'condition', 'exteriorColor'];

    if ('priceCents' in b) {
      if (typeof b.priceCents !== 'number' || !Number.isInteger(b.priceCents) || b.priceCents <= 0)
        return { ok: false, error: 'priceCents must be a positive integer' };
      data.priceCents = b.priceCents as number;
    }
    if ('mileage' in b) {
      if (typeof b.mileage !== 'number' || !Number.isInteger(b.mileage) || b.mileage < 0)
        return { ok: false, error: 'mileage must be a non-negative integer' };
      data.mileage = b.mileage as number;
    }
    for (const f of stringFields) {
      if (f in b) {
        if (typeof b[f] !== 'string') return { ok: false, error: `${f} must be a string` };
        (data as Record<string, unknown>)[f] = b[f];
      }
    }
    for (const f of stringOrNullFields) {
      if (f in b) {
        if (b[f] !== null && typeof b[f] !== 'string') return { ok: false, error: `${f} must be a string or null` };
        (data as Record<string, unknown>)[f] = b[f];
      }
    }
    if (Object.keys(data).length === 0) return { ok: false, error: 'No valid fields provided' };
    return { ok: true, data };
  }

  app.patch<{ Params: VehicleDetailParams }>(
    '/api/dealers/:dealershipId/inventory/vehicles/:vehicleId',
    async (request, reply) => {
      const { dealershipId, vehicleId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const parsed = validateVehicleFieldPatch(request.body);
      if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
      const { data } = parsed;

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, dealershipId },
        select: { id: true, stockNumber: true, priceCents: true },
      });
      if (!vehicle) return reply.status(404).send({ error: 'Vehicle not found' });

      const { priceCents, ...otherFields } = data;

      if (priceCents !== undefined) {
        try {
          await applyVehicleUpdate(prisma, dealershipId, vehicle.stockNumber, 'PRICE_CHANGE', { priceCents });
        } catch (e) {
          return reply.status(422).send({ error: (e as Error).message });
        }
      }

      if (Object.keys(otherFields).length > 0) {
        await prisma.vehicle.update({ where: { id: vehicleId }, data: otherFields as import('@prisma/client').Prisma.VehicleUpdateInput });
        const effectiveStockNumber = typeof otherFields.stockNumber === 'string' ? otherFields.stockNumber : vehicle.stockNumber;
        try {
          await applyVehicleUpdate(prisma, dealershipId, effectiveStockNumber, 'DETAILS_CHANGE');
        } catch {
          // propagation failure is non-fatal
        }
      }

      return reply.send({ ok: true });
    }
  );

  // ── Vehicle lifecycle actions (by vehicleId) ──────────────────────────────────

  type VehicleActionParams = { dealershipId: string; vehicleId: string };

  async function applyLifecycleByVehicleId(
    prisma: PrismaClient,
    dealershipId: string,
    vehicleId: string,
    kind: 'SOLD' | 'REMOVED' | 'RELISTED',
    reply: import('fastify').FastifyReply,
  ) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, dealershipId },
      select: { id: true, stockNumber: true },
    });
    if (!vehicle) return reply.status(404).send({ error: 'Vehicle not found' });
    try {
      const result = await applyVehicleUpdate(prisma, dealershipId, vehicle.stockNumber, kind);
      return reply.send(result);
    } catch (e) {
      return reply.status(422).send({ error: (e as Error).message });
    }
  }

  app.post<{ Params: VehicleActionParams }>(
    '/api/dealers/:dealershipId/inventory/vehicles/:vehicleId/sold',
    async (request, reply) => {
      const { dealershipId, vehicleId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      return applyLifecycleByVehicleId(prisma, dealershipId, vehicleId, 'SOLD', reply);
    }
  );

  app.post<{ Params: VehicleActionParams }>(
    '/api/dealers/:dealershipId/inventory/vehicles/:vehicleId/removed',
    async (request, reply) => {
      const { dealershipId, vehicleId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      return applyLifecycleByVehicleId(prisma, dealershipId, vehicleId, 'REMOVED', reply);
    }
  );

  app.post<{ Params: VehicleActionParams }>(
    '/api/dealers/:dealershipId/inventory/vehicles/:vehicleId/relist',
    async (request, reply) => {
      const { dealershipId, vehicleId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      return applyLifecycleByVehicleId(prisma, dealershipId, vehicleId, 'RELISTED', reply);
    }
  );

  // ── Listing status (DRAFT | READY distribution gate) ──────────────────────────

  app.patch<{ Params: VehicleActionParams }>(
    '/api/dealers/:dealershipId/inventory/vehicles/:vehicleId/listing-status',
    async (request, reply) => {
      const { dealershipId, vehicleId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const body = request.body as Record<string, unknown> | null;
      const listingStatus = body?.['listingStatus'];
      if (listingStatus !== 'DRAFT' && listingStatus !== 'READY') {
        return reply.status(400).send({ error: "listingStatus must be 'DRAFT' or 'READY'" });
      }

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, dealershipId },
        select: { id: true },
      });
      if (!vehicle) return reply.status(404).send({ error: 'Vehicle not found' });

      const updated = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { listingStatus },
        select: { id: true, listingStatus: true },
      });
      return reply.send(updated);
    }
  );

  // ── Channel matrix (connected / eligible / selected / live per channel) ───────

  app.get<{ Params: VehicleActionParams }>(
    '/api/dealers/:dealershipId/inventory/vehicles/:vehicleId/channels',
    async (request, reply) => {
      const { dealershipId, vehicleId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const matrix = await buildVehicleChannelMatrix(prisma, dealershipId, vehicleId);
      if (!matrix) return reply.status(404).send({ error: 'Vehicle not found' });
      return reply.send(matrix);
    }
  );

  type ChannelSelectionParams = { dealershipId: string; vehicleId: string; channelKey: string };

  app.put<{ Params: ChannelSelectionParams }>(
    '/api/dealers/:dealershipId/inventory/vehicles/:vehicleId/channels/:channelKey/selection',
    async (request, reply) => {
      const { dealershipId, vehicleId, channelKey } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const body = request.body as Record<string, unknown> | null;
      const selected = body?.['selected'];
      if (typeof selected !== 'boolean') {
        return reply.status(400).send({ error: 'selected must be a boolean' });
      }

      const validChannel = channelKey === STOREFRONT_CHANNEL_KEY
        || platformProfiles.some(p => p.slug === channelKey);
      if (!validChannel) {
        return reply.status(400).send({ error: `Unknown channel '${channelKey}'` });
      }

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, dealershipId },
        select: { id: true },
      });
      if (!vehicle) return reply.status(404).send({ error: 'Vehicle not found' });

      const row = await prisma.vehicleChannelSelection.upsert({
        where: { vehicleId_channelKey: { vehicleId, channelKey } },
        update: { selected },
        create: { dealershipId, vehicleId, channelKey, selected },
        select: { channelKey: true, selected: true },
      });
      return reply.send(row);
    }
  );

  // ── Add / remove vehicle media ────────────────────────────────────────────────

  type MediaParams = { dealershipId: string; vehicleId: string };
  type MediaDeleteParams = { dealershipId: string; vehicleId: string; mediaId: string };

  app.post<{ Params: MediaParams }>(
    '/api/dealers/:dealershipId/inventory/vehicles/:vehicleId/media',
    async (request, reply) => {
      const { dealershipId, vehicleId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const body = request.body as Record<string, unknown>;
      const rawUrls = Array.isArray(body?.urls) ? body.urls : (body?.url ? [body.url] : []);
      const urls = rawUrls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
      if (urls.length === 0) return reply.status(400).send({ error: 'Provide url or urls array' });

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, dealershipId },
        select: { id: true, media: { select: { sortOrder: true }, orderBy: { sortOrder: 'desc' }, take: 1 } },
      });
      if (!vehicle) return reply.status(404).send({ error: 'Vehicle not found' });

      let nextOrder = (vehicle.media[0]?.sortOrder ?? -1) + 1;
      const created = await Promise.all(
        urls.map(url =>
          prisma.vehicleMedia.create({
            data: { vehicleId, url, kind: 'IMAGE', sortOrder: nextOrder++, mediaRole: 'GALLERY_IMAGE' },
            select: { id: true, url: true, kind: true, sortOrder: true, mediaSlotKey: true, mediaRole: true, customLabel: true, customGroup: true },
          })
        ),
      );

      return reply.status(201).send({ media: created });
    }
  );

  app.delete<{ Params: MediaDeleteParams }>(
    '/api/dealers/:dealershipId/inventory/vehicles/:vehicleId/media/:mediaId',
    async (request, reply) => {
      const { dealershipId, vehicleId, mediaId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const media = await prisma.vehicleMedia.findFirst({
        where: { id: mediaId, vehicleId, vehicle: { dealershipId } },
        select: { id: true },
      });
      if (!media) return reply.status(404).send({ error: 'Media not found' });

      await prisma.vehicleMedia.delete({ where: { id: mediaId } });
      return reply.status(204).send();
    }
  );
  app.post<{ Params: MediaParams }>(
    '/api/dealers/:dealershipId/inventory/vehicles/:vehicleId/media/upload',
    async (request, reply) => {
      const { dealershipId, vehicleId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, dealershipId },
        select: { id: true, media: { select: { sortOrder: true }, orderBy: { sortOrder: 'desc' }, take: 1 } },
      });
      if (!vehicle) return reply.status(404).send({ error: 'Vehicle not found' });

      let nextOrder = (vehicle.media[0]?.sortOrder ?? -1) + 1;
      const createdMedia = [];
      let slotKey: string | null = null;
      
      const { fileUploadService } = await import('../../services/storage/fileUploadService.js');

      let group: string | null = null;

      const parts = (request as unknown as { parts(): AsyncIterable<{ type: string; fieldname: string; value: string; file: NodeJS.ReadableStream; resume(): void; mimetype: string }> }).parts();
      for await (const part of parts) {
        if (part.type === 'field' && part.fieldname === 'slotKey') {
          slotKey = part.value;
        } else if (part.type === 'field' && part.fieldname === 'group') {
          group = part.value.trim() || null;
        } else if (part.type === 'file') {
          // Validation
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(part.mimetype)) {
            // Drain stream if invalid
            part.file.resume();
            continue;
          }

          try {
            const url = await fileUploadService.uploadFile(part.file, part.mimetype);
            const mediaRole = slotKey ? 'STRUCTURED_SHOT' : 'GALLERY_IMAGE';
            const media = await prisma.vehicleMedia.create({
              data: {
                vehicleId,
                url,
                kind: 'IMAGE',
                sortOrder: nextOrder++,
                mediaRole,
                mediaSlotKey: slotKey,
                customGroup: slotKey ? null : group,
                mimeType: part.mimetype
              },
              select: { id: true, url: true, kind: true, sortOrder: true, mediaSlotKey: true, mediaRole: true, customLabel: true, customGroup: true },
            });
            createdMedia.push(media);
          } catch (e) {
            request.log.error({ err: e }, 'File upload error');
          }
        }
      }

      if (createdMedia.length === 0) {
        return reply.status(400).send({ error: 'No valid files uploaded or all failed.' });
      }

      return reply.status(201).send({ media: createdMedia });
    }
  );

  // ── Generic category item: decode identifier ──────────────────────────────────
  // Decodes an identifier (ISBN, SKU, etc.) for any non-automotive category.
  // Returns decoded fields and a duplicate check against existing items.

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/items/decode',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(decodeCategoryIdentifierSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const { categoryId, identifier } = body.data;

      const decoder = resolveIdentifierDecoder(categoryId as BusinessCategoryId);
      const decoded = await decoder.decode(identifier);

      if (!decoded.valid) {
        return reply.status(400).send({
          error: decoded.warnings[0] ?? 'Invalid identifier',
          identifier,
          valid: false,
        });
      }

      const existing = await prisma.categoryInventoryItem.findFirst({
        where: { dealershipId, primaryIdentifier: identifier, categoryId },
        select: { id: true, stockNumber: true },
      });

      return reply.send({
        identifier: decoded.identifier,
        categoryId,
        valid: decoded.valid,
        decoded: decoded.decoded,
        provider: decoded.provider,
        fields: decoded.fields,
        warnings: decoded.warnings,
        duplicate: existing !== null,
        existingItemId: existing?.id ?? null,
        existingStockNumber: existing?.stockNumber ?? null,
      });
    }
  );

  // ── Generic category item: create ─────────────────────────────────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/items',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(createCategoryItemSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      // Block duplicate primary identifiers when one is provided
      if (body.data.primaryIdentifier) {
        const existing = await prisma.categoryInventoryItem.findFirst({
          where: {
            dealershipId,
            categoryId: body.data.categoryId,
            primaryIdentifier: body.data.primaryIdentifier,
          },
          select: { id: true, stockNumber: true },
        });
        if (existing) {
          return reply.status(409).send({
            error: 'An item with this identifier already exists in your inventory',
            itemId: existing.id,
            stockNumber: existing.stockNumber,
          });
        }
      }

      const operator = await requireOperator(prisma, request, reply);
      if (!operator) return;

      const result = await createCategoryItemShell(prisma, {
        dealershipId,
        categoryId:        body.data.categoryId as BusinessCategoryId,
        primaryIdentifier: body.data.primaryIdentifier,
        stockNumber:       body.data.stockNumber,
        priceCents:        body.data.priceCents,
        condition:         body.data.condition,
        data:              body.data.data as Record<string, unknown>,
        adminActorId: operator.role === 'SUPER_ADMIN' ? operator.id : undefined,
      });

      return reply.status(201).send(result);
    }
  );

  // ── Generic category item: list ───────────────────────────────────────────────

  app.get<{ Params: DealerParams; Querystring: { categoryId?: string; lifecycleScope?: string } }>(
    '/api/dealers/:dealershipId/inventory/items',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const { categoryId, lifecycleScope } = request.query;

      const where: import('@prisma/client').Prisma.CategoryInventoryItemWhereInput = { dealershipId };
      if (categoryId) where.categoryId = categoryId;

      if (lifecycleScope === 'sold') {
        where.soldAt = { not: null };
        where.removedAt = null;
      } else if (lifecycleScope === 'removed') {
        where.removedAt = { not: null };
      } else if (lifecycleScope !== 'all') {
        // default: active — not sold or removed
        where.soldAt = null;
        where.removedAt = null;
      }

      const items = await prisma.categoryInventoryItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, categoryId: true, stockNumber: true, primaryIdentifier: true,
          priceCents: true, condition: true, listingStatus: true,
          soldAt: true, removedAt: true, createdAt: true, updatedAt: true,
          data: true,
        },
      });

      return reply.send({ items, total: items.length });
    }
  );

  // ── Generic category item: detail ─────────────────────────────────────────────

  type ItemDetailParams = { dealershipId: string; itemId: string };

  app.get<{ Params: ItemDetailParams }>(
    '/api/dealers/:dealershipId/inventory/items/:itemId',
    async (request, reply) => {
      const { dealershipId, itemId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const item = await prisma.categoryInventoryItem.findFirst({
        where: { id: itemId, dealershipId },
        include: {
          media: {
            select: {
              id: true, url: true, kind: true, sortOrder: true,
              width: true, height: true, mimeType: true,
              mediaSlotKey: true, mediaRole: true,
              customLabel: true, customGroup: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      if (!item) return reply.status(404).send({ error: 'Item not found' });

      const record = categoryItemToInventoryRecord(item);

      const schema = getCategoryInventorySchema(item.categoryId as BusinessCategoryId);
      const assignedSlotKeys = item.media
        .filter(m => m.mediaSlotKey)
        .map(m => m.mediaSlotKey as string);

      // Flatten top-level fields + data for readiness evaluation
      const fields: Record<string, unknown> = {
        stockNumber: item.stockNumber,
        priceCents:  item.priceCents,
        condition:   item.condition,
        ...(item.data as Record<string, unknown>),
      };
      if (schema && item.primaryIdentifier) {
        fields[schema.primaryIdentifier.fieldKey] = item.primaryIdentifier;
      }

      const readiness = buildInventoryReadiness({
        category: item.categoryId as BusinessCategoryId,
        fields,
        assignedMediaSlotKeys: assignedSlotKeys,
        totalMediaCount: item.media.length,
      });

      return reply.send({
        ...record,
        media: item.media,
        readiness,
      });
    }
  );

  // ── Generic category item: update ─────────────────────────────────────────────

  app.patch<{ Params: ItemDetailParams }>(
    '/api/dealers/:dealershipId/inventory/items/:itemId',
    async (request, reply) => {
      const { dealershipId, itemId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      const existing = await prisma.categoryInventoryItem.findFirst({
        where: { id: itemId, dealershipId },
        select: { id: true, categoryId: true },
      });
      if (!existing) return reply.status(404).send({ error: 'Item not found' });

      const body = validateBody(updateCategoryItemSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const { stockNumber, priceCents, condition, data } = body.data;
      if (stockNumber === undefined && priceCents === undefined && condition === undefined && data === undefined) {
        return reply.status(400).send({ error: 'No fields to update' });
      }

      const updated = await prisma.categoryInventoryItem.update({
        where: { id: itemId },
        data: {
          ...(stockNumber !== undefined && { stockNumber }),
          ...(priceCents !== undefined && { priceCents }),
          ...(condition !== undefined && { condition }),
          ...(data !== undefined && { data: data as import('@prisma/client').Prisma.InputJsonValue }),
        },
        include: {
          media: {
            select: {
              id: true, url: true, kind: true, sortOrder: true,
              width: true, height: true, mimeType: true,
              mediaSlotKey: true, mediaRole: true,
              customLabel: true, customGroup: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      const record = categoryItemToInventoryRecord(updated);

      const schema = getCategoryInventorySchema(updated.categoryId as BusinessCategoryId);
      const assignedSlotKeys = updated.media
        .filter(m => m.mediaSlotKey)
        .map(m => m.mediaSlotKey as string);

      const fields: Record<string, unknown> = {
        stockNumber: updated.stockNumber,
        priceCents:  updated.priceCents,
        condition:   updated.condition,
        ...(updated.data as Record<string, unknown>),
      };
      if (schema && updated.primaryIdentifier) {
        fields[schema.primaryIdentifier.fieldKey] = updated.primaryIdentifier;
      }

      const readiness = buildInventoryReadiness({
        category: updated.categoryId as BusinessCategoryId,
        fields,
        assignedMediaSlotKeys: assignedSlotKeys,
        totalMediaCount: updated.media.length,
      });

      return reply.send({
        ...record,
        media: updated.media,
        readiness,
      });
    }
  );

}
