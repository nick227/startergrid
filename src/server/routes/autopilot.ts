import type { FastifyInstance } from 'fastify';
import { Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireCapability, requireDealerAccess, requireInternalStaff } from '../security.js';
import { createReconnectUrl } from './platformConnect.js';
import { autopilotEnabled, currentOutcomes, readPolicy, summary, updatePolicy, vehicleSnapshot } from '../../services/autopilot/service.js';
import { simulateAutopilotDistribution } from '../../services/autopilot/simulationService.js';
import { DEFAULT_SAFEGUARDS, snapshotHash } from '../../services/autopilot/policy.js';
import { auditDealershipSyndication, reconcileGhostListings } from '../../services/distribution/syndicationSentryService.js';

const guardsSchema = z.object({
  maxPriceChangeFraction: z.number().positive().max(10), minPriceCents: z.number().int().positive(),
  maxRemovalCount: z.number().int().positive(), minRemovalBatchSize: z.number().int().positive(), maxRemovalFraction: z.number().positive().max(1),
  maxAttempts: z.number().int().min(1).max(20), retryBaseMs: z.number().int().min(100), retryMaxMs: z.number().int().min(100).max(86_400_000),
  verificationTimeoutMs: z.number().int().min(1000).max(86_400_000), evidenceMaxAgeMs: z.number().int().min(1000).max(86_400_000),
}).strict();
const policySchema = z.object({ expectedVersion: z.number().int().min(0), mode: z.enum(['OFF', 'ON', 'PAUSED']),
  includedChannels: z.array(z.string().min(1).max(80)).max(100), excludedVehicleIds: z.array(z.string().min(1).max(191)).max(10000),
  safeguards: guardsSchema.default({ ...DEFAULT_SAFEGUARDS }),
}).strict();
type Scope = { dealershipId: string };
type IncidentScope = Scope & { incidentId: string };

export function registerAutopilotRoutes(app: FastifyInstance, db: PrismaClient): void {
  // Authentication runs before availability checks, so disabled routes still
  // cannot reveal account or operational information to anonymous requests.
  app.get<{ Params: Scope }>('/api/dealers/:dealershipId/autopilot', async (req, reply) => {
    if (!await requireDealerAccess(db, req, reply, req.params.dealershipId)) return;
    if (!autopilotEnabled()) return reply.status(503).send({ error: 'Verified Autopilot is not enabled on this server.' });
    return reply.send(await summary(db, req.params.dealershipId));
  });
  app.put<{ Params: Scope }>('/api/dealers/:dealershipId/autopilot', async (req, reply) => {
    const actor = await requireCapability(db, req, reply, req.params.dealershipId, 'change_autopilot');
    if (!actor) return;
    if (!autopilotEnabled()) return reply.status(503).send({ error: 'Verified Autopilot is not enabled on this server.' });
    const parsed = policySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    try {
      const { expectedVersion, ...data } = parsed.data;
      return reply.send(await updatePolicy(db, { ...data, version: expectedVersion, dealershipId: req.params.dealershipId,
        updatedAt: new Date().toISOString(), updatedBy: actor.id }, { id: actor.id, email: actor.email ?? actor.id }));
    } catch (error) { return reply.status(409).send({ error: error instanceof Error ? error.message : 'Policy update failed.' }); }
  });

  // Read-only distribution preview simulation
  app.post<{ Params: Scope }>('/api/dealers/:dealershipId/autopilot/preview', async (req, reply) => {
    if (!await requireDealerAccess(db, req, reply, req.params.dealershipId)) return;
    const body = z.object({
      mode: z.enum(['OFF', 'ON', 'PAUSED']).optional(),
      includedChannels: z.array(z.string().min(1).max(80)).max(100).optional(),
    }).safeParse(req.body ?? {});
    const opts = body.success ? body.data : {};
    try {
      const simulation = await simulateAutopilotDistribution(db, req.params.dealershipId, opts);
      return reply.send(simulation);
    } catch (error) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Simulation failed' });
    }
  });

  // Syndication Sentry: Ghost listing audit and feed reconciliation
  app.get<{ Params: Scope }>('/api/dealers/:dealershipId/distribution/sentry', async (req, reply) => {
    if (!await requireDealerAccess(db, req, reply, req.params.dealershipId)) return;
    try {
      const result = await auditDealershipSyndication(db, req.params.dealershipId);
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Syndication sentry audit failed.' });
    }
  });

  app.post<{ Params: Scope }>('/api/dealers/:dealershipId/distribution/sentry/reconcile', async (req, reply) => {
    const actor = await requireCapability(db, req, reply, req.params.dealershipId, 'change_autopilot');
    if (!actor) return;
    try {
      const result = await reconcileGhostListings(db, req.params.dealershipId, actor);
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Ghost listing reconciliation failed.' });
    }
  });
  const pageSchema = z.object({ vehicleId: z.string().optional(), channel: z.string().optional(), status: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50), offset: z.coerce.number().int().min(0).default(0) });
  app.get<{ Params: Scope }>('/api/dealers/:dealershipId/distribution', async (req, reply) => {
    if (!await requireDealerAccess(db, req, reply, req.params.dealershipId)) return;
    if (!autopilotEnabled()) return reply.status(503).send({ error: 'Verified Autopilot is not enabled on this server.' });
    const parsed = pageSchema.safeParse(req.query);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid filters or pagination.' });
    const { limit, offset, ...filters } = parsed.data;
    const where = { dealershipId: req.params.dealershipId, ...filters };
    const [rows, total, policy] = await Promise.all([
      db.distributionTarget.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: limit, skip: offset }),
      db.distributionTarget.count({ where }), readPolicy(db, req.params.dealershipId),
    ]);
    return reply.send({ items: await currentOutcomes(db, rows, policy), total, limit, offset });
  });
  app.get<{ Params: Scope }>('/api/dealers/:dealershipId/distribution/incidents', async (req, reply) => {
    if (!await requireDealerAccess(db, req, reply, req.params.dealershipId)) return;
    if (!autopilotEnabled()) return reply.status(503).send({ error: 'Verified Autopilot is not enabled on this server.' });
    const parsed = pageSchema.safeParse(req.query);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid filters or pagination.' });
    const { limit, offset, vehicleId, channel, status } = parsed.data;
    const where = { dealershipId: req.params.dealershipId, vehicleId, channel, ...(status ? { state: status } : { state: { not: 'RESOLVED' } }) };
    const [items, total] = await Promise.all([db.distributionIncident.findMany({ where, take: limit, skip: offset, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] }), db.distributionIncident.count({ where })]);
    return reply.send({ items, total, limit, offset });
  });
  for (const action of ['retry', 'approve', 'resolve', 'reconnect'] as const) {
    app.post<{ Params: IncidentScope }>(`/api/dealers/:dealershipId/distribution/incidents/:incidentId/${action}`, async (req, reply) => {
      const actor = await requireCapability(db, req, reply, req.params.dealershipId, action === 'reconnect' ? 'connect_channels' : 'change_autopilot');
      if (!actor) return;
      if (action === 'approve' && !await requireInternalStaff(db, req, reply)) return;
      if (!autopilotEnabled()) return reply.status(503).send({ error: 'Verified Autopilot is not enabled on this server.' });
      const { dealershipId, incidentId } = req.params;
      const incident = await db.distributionIncident.findFirst({ where: { id: incidentId, dealershipId } });
      if (!incident) return reply.status(404).send({ error: 'Incident not found.' });
      if (action === 'reconnect') {
        try {
          const connection = await createReconnectUrl(db, dealershipId, incident.channel);
          await db.adminAuditLog.create({ data: { action: 'DISTRIBUTION_RECONNECT_INITIATED', actorId: actor.id, actorEmail: actor.email ?? actor.id,
            detail: { incidentId, dealershipId, channel: incident.channel } } });
          return reply.send({ status: 'initiated', authUrl: connection.authUrl });
        } catch (error) { return reply.status(409).send({ error: error instanceof Error ? error.message : 'Connection unavailable.' }); }
      }
      const body = z.object({ expectedHash: z.string().max(64).optional(), reason: z.string().min(1).max(500).optional() }).strict().safeParse(req.body ?? {});
      if (!body.success) return reply.status(400).send({ error: 'Invalid action body.' });
      try {
        await db.$transaction(async tx => {
          await tx.$queryRaw`SELECT dealershipId FROM AutopilotPolicy WHERE dealershipId = ${dealershipId} FOR UPDATE`;
          const current = await tx.distributionIncident.findFirstOrThrow({ where: { id: incidentId, dealershipId } });
          const target = current.targetId ? await tx.distributionTarget.findFirst({ where: { id: current.targetId, dealershipId } }) : null;
          const evidence = current.technicalEvidence as Record<string, unknown>;
          if (action === 'approve') {
            if (!body.data.reason) throw new Error('An approval reason is required.');
            if (current.reasonCode === 'PRICE_MUTATION_HELD' && current.vehicleId) {
              if (typeof evidence.proposedPriceCents !== 'number' || typeof evidence.sourceUpdatedAt !== 'string') throw new Error('Invalid proposed price evidence.');
              const changed = await tx.vehicle.updateMany({ where: { id: current.vehicleId, dealershipId, updatedAt: new Date(evidence.sourceUpdatedAt) }, data: { priceCents: evidence.proposedPriceCents } });
              if (!changed.count) throw new Error('Vehicle changed since this proposal. Review a fresh proposal.');
              const v = await tx.vehicle.findUniqueOrThrow({ where: { id: current.vehicleId }, include: { media: true } });
              if (target) await tx.distributionTarget.update({ where: { id: target.id }, data: { approvedHash: snapshotHash(vehicleSnapshot(v)) } });
            } else if (current.reasonCode === 'REMOVAL_BATCH') {
              await tx.distributionIncident.update({ where: { id: incidentId }, data: { technicalEvidence: {
                ...evidence, approvedVehicleIds: evidence.vehicleIds, approvalExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
              } as Prisma.InputJsonValue } });
            } else {
              if (!target || !['PRICE_CHANGE', 'MASS_REMOVAL'].includes(current.reasonCode) || !body.data.expectedHash || body.data.expectedHash !== target.desiredHash)
                throw new Error('This hold requires a matching current target hash.');
              await tx.distributionTarget.update({ where: { id: target.id }, data: { approvedHash: target.desiredHash, attemptCount: 0, nextAttemptAt: null } });
            }
            await tx.distributionIncident.update({ where: { id: incidentId }, data: { state: 'ACKNOWLEDGED', ownerId: actor.id } });
          } else if (action === 'retry') {
            if (!target && current.reasonCode === 'RECONCILE_FAILED') {
              await tx.distributionIncident.update({ where: { id: incidentId }, data: { state: 'ACKNOWLEDGED', ownerId: actor.id,
                technicalEvidence: { ...evidence, attempt: 0, nextAttemptAt: null } as Prisma.InputJsonValue } });
              await tx.adminAuditLog.create({ data: { action: 'DISTRIBUTION_RETRY', actorId: actor.id, actorEmail: actor.email ?? actor.id,
                detail: { incidentId, dealershipId, reason: body.data.reason ?? null } } });
              return;
            }
            if (!target) throw new Error('Retry the original inventory/source action after addressing this incident.');
            if (['HELD', 'NEEDS_VEHICLE_INFORMATION'].includes(target.status)) throw new Error('Correct or approve the held input before retrying.');
            await tx.distributionTarget.update({ where: { id: target.id }, data: { attemptCount: 0, nextAttemptAt: null, status: 'UNKNOWN' } });
            await tx.distributionIncident.update({ where: { id: incidentId }, data: { state: 'ACKNOWLEDGED', ownerId: actor.id } });
          } else {
            const policy = await readPolicy(tx, dealershipId);
            if (current.reasonCode === 'PRICE_MUTATION_HELD' &&
              (current.state !== 'ACKNOWLEDGED' || (target?.verifiedSnapshot as { priceCents?: number } | null)?.priceCents !== evidence.proposedPriceCents))
              throw new Error('The proposed price must be approved and verified before resolution.');
            if (current.reasonCode === 'REMOVAL_BATCH' && current.state === 'ACKNOWLEDGED' && Array.isArray(evidence.approvedVehicleIds)) {
              const ids = evidence.approvedVehicleIds.filter((id): id is string => typeof id === 'string');
              const targets = await tx.distributionTarget.findMany({ where: { dealershipId, channel: current.channel, vehicleId: { in: ids } } });
              const outcomes = await currentOutcomes(tx, targets, policy);
              if (!ids.length || outcomes.length !== ids.length || outcomes.some(o => o.status !== 'VERIFIED_REMOVED'))
                throw new Error('Every vehicle in the approved batch must have a verified withdrawal.');
            } else if (!target || !['VERIFIED_LIVE', 'VERIFIED_REMOVED'].includes((await currentOutcomes(tx, [target], policy))[0]!.status))
              throw new Error('A fresh verified destination result is required before resolution.');
            await tx.distributionIncident.update({ where: { id: incidentId }, data: { state: 'RESOLVED', verificationState: 'VERIFIED', resolvedAt: new Date(), ownerId: actor.id } });
          }
          await tx.adminAuditLog.create({ data: { action: `DISTRIBUTION_${action.toUpperCase()}`, actorId: actor.id, actorEmail: actor.email ?? actor.id,
            detail: { incidentId, dealershipId, targetId: target?.id ?? null, generation: target?.generation ?? null, reason: body.data.reason ?? null } } });
        });
        return reply.send({ status: action === 'resolve' ? 'resolved' : action === 'approve' ? 'approved_pending_verification' : 'retry_scheduled' });
      } catch (error) { return reply.status(409).send({ error: error instanceof Error ? error.message : 'Incident action failed.' }); }
    });
  }
}
