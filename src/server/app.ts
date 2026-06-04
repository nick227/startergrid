import Fastify, { type FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import {
  fetchStorefrontFromDb,
  fetchVehicleDetailFromDb,
  resolveVehicleIdByStockNumber,
  validateLeadInput
} from '../services/storefrontQueryService.js';
import { persistLead } from '../services/lifecyclePersistenceService.js';
import { notifyLeadCaptured } from '../services/dealerNotificationService.js';
import {
  applyVehicleUpdate,
  validatePriceUpdate,
  validatePhotoUpdate
} from '../services/inventoryUpdateService.js';

type DealerParams = { dealershipId: string };
type VehicleParams = { dealershipId: string; stockNumber: string };

export function buildApp(prisma: PrismaClient): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/health', async (_req, reply) => {
    return reply.send({ ok: true, ts: new Date().toISOString() });
  });

  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/storefront',
    async (request, reply) => {
      const storefront = await fetchStorefrontFromDb(prisma, request.params.dealershipId);
      if (!storefront) return reply.status(404).send({ error: 'Dealer not found' });
      return reply.send(storefront);
    }
  );

  app.get<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/vehicles/:stockNumber',
    async (request, reply) => {
      const listing = await fetchVehicleDetailFromDb(
        prisma,
        request.params.dealershipId,
        request.params.stockNumber
      );
      if (!listing) return reply.status(404).send({ error: 'Vehicle not found' });
      return reply.send(listing);
    }
  );

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/leads',
    async (request, reply) => {
      const { dealershipId } = request.params;

      const validation = validateLeadInput(request.body);
      if (!validation.ok) return reply.status(400).send({ error: validation.error });

      const { data } = validation;

      // Resolve vehicleId from stockNumber if provided
      const vehicleId = data.stockNumber
        ? await resolveVehicleIdByStockNumber(prisma, dealershipId, data.stockNumber)
        : null;

      // Confirm dealer exists before persisting
      const dealerExists = await prisma.dealershipProfile.findUnique({
        where: { id: dealershipId },
        select: { id: true }
      });
      if (!dealerExists) return reply.status(404).send({ error: 'Dealer not found' });

      await persistLead(prisma, dealershipId, {
        source: 'DEALER_STOREFRONT',
        platformSlug: 'dealer-storefront',
        vehicleId,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        message: data.message,
        vehicleInterest: data.stockNumber ? { stockNumber: data.stockNumber } : null
      });

      // Fetch the lead we just created to get its id for the notification
      const lead = await prisma.lead.findFirst({
        where: { dealershipId, platformSlug: 'dealer-storefront' },
        orderBy: { createdAt: 'desc' },
        select: { id: true }
      });

      if (lead) {
        await notifyLeadCaptured(prisma, dealershipId, lead.id, 'dealer-storefront', {
          name: data.contactName ?? undefined,
          email: data.contactEmail ?? undefined,
          stockNumber: data.stockNumber
        });
      }

      return reply.status(201).send({ message: 'Lead received', leadId: lead?.id ?? null });
    }
  );

  // ── Inventory update routes ─────────────────────────────────────────────

  app.patch<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/vehicles/:stockNumber/price',
    async (request, reply) => {
      const validation = validatePriceUpdate(request.body);
      if (!validation.ok) return reply.status(400).send({ error: validation.error });
      try {
        const result = await applyVehicleUpdate(
          prisma, request.params.dealershipId, request.params.stockNumber,
          'PRICE_CHANGE', { priceCents: validation.priceCents }
        );
        return reply.send(result);
      } catch (err: any) {
        if (err.message?.includes('not found')) return reply.status(404).send({ error: err.message });
        throw err;
      }
    }
  );

  app.post<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/vehicles/:stockNumber/sold',
    async (request, reply) => {
      try {
        const result = await applyVehicleUpdate(
          prisma, request.params.dealershipId, request.params.stockNumber, 'SOLD'
        );
        return reply.send(result);
      } catch (err: any) {
        if (err.message?.includes('not found')) return reply.status(404).send({ error: err.message });
        throw err;
      }
    }
  );

  app.post<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/vehicles/:stockNumber/removed',
    async (request, reply) => {
      try {
        const result = await applyVehicleUpdate(
          prisma, request.params.dealershipId, request.params.stockNumber, 'REMOVED'
        );
        return reply.send(result);
      } catch (err: any) {
        if (err.message?.includes('not found')) return reply.status(404).send({ error: err.message });
        throw err;
      }
    }
  );

  app.patch<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/vehicles/:stockNumber/photos',
    async (request, reply) => {
      const validation = validatePhotoUpdate(request.body);
      if (!validation.ok) return reply.status(400).send({ error: validation.error });
      try {
        const result = await applyVehicleUpdate(
          prisma, request.params.dealershipId, request.params.stockNumber,
          'PHOTO_CHANGE', { photoUrls: validation.photoUrls }
        );
        return reply.send(result);
      } catch (err: any) {
        if (err.message?.includes('not found')) return reply.status(404).send({ error: err.message });
        throw err;
      }
    }
  );

  return app;
}
