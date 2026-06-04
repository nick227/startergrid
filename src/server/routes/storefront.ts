import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  fetchStorefrontFromDb,
  fetchVehicleDetailFromDb,
  resolveVehicleIdByStockNumber,
  validateLeadInput
} from '../../services/storefront/storefrontQueryService.js';
import { persistLead } from '../../services/publishing/lifecyclePersistenceService.js';
import { notifyLeadCaptured } from '../../services/dealer/dealerNotificationService.js';
import { checkPublicWriteAbuseLimit } from '../security.js';
import { leadCaptureSchema, validateBody } from '../requestValidation.js';

type DealerParams = { dealershipId: string };
type VehicleParams = { dealershipId: string; stockNumber: string };

export function registerStorefrontRoutes(app: FastifyInstance, prisma: PrismaClient): void {
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

      if (!checkPublicWriteAbuseLimit(request, reply, `lead:${dealershipId}`)) return;

      const body = validateBody(leadCaptureSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const validation = validateLeadInput(body.data);
      if (!validation.ok) return reply.status(400).send({ error: validation.error });

      const { data } = validation;

      const vehicleId = data.stockNumber
        ? await resolveVehicleIdByStockNumber(prisma, dealershipId, data.stockNumber)
        : null;

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
}
