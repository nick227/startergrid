import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireCapability } from '../security.js';
import {
  applyBulkEdit,
  BulkEditUndoError,
  bulkEditRequestSchema,
  previewBulkEdit,
  undoBulkEdit,
} from '../../services/inventory/bulkEditService.js';

type DealerParams = { dealershipId: string };

export function registerBulkEditRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  // POST /api/dealers/:dealershipId/inventory/bulk-edits/preview
  // Per-vehicle before/after for a set of edits. Writes nothing.
  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/bulk-edits/preview',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireCapability(prisma, request, reply, dealershipId, 'edit_inventory')) return;
      const parsed = bulkEditRequestSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid bulk edit' });
      return reply.send(await previewBulkEdit(prisma, dealershipId, parsed.data));
    },
  );

  // POST /api/dealers/:dealershipId/inventory/bulk-edits
  // Applies each edit separately and reports every vehicle's outcome.
  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/bulk-edits',
    async (request, reply) => {
      const { dealershipId } = request.params;
      const operator = await requireCapability(prisma, request, reply, dealershipId, 'edit_inventory');
      if (!operator) return;
      const parsed = bulkEditRequestSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid bulk edit' });
      return reply.send(await applyBulkEdit(prisma, dealershipId, parsed.data, operator));
    },
  );

  // POST /api/dealers/:dealershipId/inventory/bulk-edits/:batchId/undo
  // Restores replaced values for vehicles nobody has changed since the batch.
  app.post<{ Params: DealerParams & { batchId: string } }>(
    '/api/dealers/:dealershipId/inventory/bulk-edits/:batchId/undo',
    async (request, reply) => {
      const { dealershipId, batchId } = request.params;
      const operator = await requireCapability(prisma, request, reply, dealershipId, 'edit_inventory');
      if (!operator) return;
      try {
        return reply.send(await undoBulkEdit(prisma, dealershipId, batchId, operator));
      } catch (err) {
        if (err instanceof BulkEditUndoError) return reply.status(err.statusCode).send({ error: err.message });
        throw err;
      }
    },
  );
}
