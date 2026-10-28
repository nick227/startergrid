import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireDealerAccess } from '../security.js';
import { businessActivity, salesRegister } from '../../services/dealership/businessActivityService.js';

type Params = { dealershipId: string; threadId: string };
export const threadInput = z.object({ kind: z.enum(['POST', 'ANNOUNCEMENT', 'TASK']), title: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(10000), assigneeId: z.string().max(191).nullable().optional(), reference: z.string().max(512).nullable().optional() }).strict();
export const taskPatch = z.object({ completed: z.boolean().optional(), assigneeId: z.string().max(191).nullable().optional() }).strict().refine(v => v.completed !== undefined || v.assigneeId !== undefined);

export function registerWorkspaceRoutes(app: FastifyInstance, db: PrismaClient) {
  const base = '/api/dealers/:dealershipId';
  app.get<{ Params: Params; Querystring: { cursor?: string } }>(`${base}/business-activity`, async (req, reply) => {
    if (!await requireDealerAccess(db, req, reply, req.params.dealershipId)) return;
    let cursor;
    if (req.query.cursor) {
      try {
        cursor = z.object({ anchor: z.string().datetime(), offsets: z.array(z.number().int().min(0).max(1000000)).length(7) }).parse(JSON.parse(Buffer.from(req.query.cursor, 'base64url').toString()));
      } catch { return reply.code(400).send({ error: 'Invalid activity cursor' }); }
    }
    return businessActivity(db, req.params.dealershipId, cursor);
  });
  app.get<{ Params: Params }>(`${base}/sales-register`, async (req, reply) => {
    if (!await requireDealerAccess(db, req, reply, req.params.dealershipId)) return;
    return salesRegister(db, req.params.dealershipId);
  });
  app.get<{ Params: Params }>(`${base}/team`, async (req, reply) => {
    if (!await requireDealerAccess(db, req, reply, req.params.dealershipId)) return;
    const [threads, members] = await Promise.all([
      db.teamThread.findMany({ where: { dealershipId: req.params.dealershipId }, include: { comments: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' }, take: 201 }),
      db.operatorDealerAccess.findMany({ where: { dealershipId: req.params.dealershipId, operator: { isActive: true } }, select: { operator: { select: { id: true, email: true } } } }),
    ]);
    return { threads: threads.slice(0, 200), truncated: threads.length > 200, members: members.map(m => m.operator) };
  });
  async function validAssignee(dealershipId: string, id?: string | null) {
    return !id || Boolean(await db.operatorDealerAccess.findFirst({ where: { dealershipId, operatorAccountId: id, operator: { isActive: true } } }));
  }
  async function validReference(dealershipId: string, reference?: string | null) {
    if (!reference) return true;
    const match = /^#\/([^/]+)\/(inventory|channels|platforms|activity)(?:\/([^?]+))?(?:\?(.*))?$/.exec(reference);
    if (!match || match[1] !== encodeURIComponent(dealershipId)) return false;
    const query = new URLSearchParams(match[4]);
    if (query.get('assetId') && !await db.vehicle.findFirst({ where: { id: query.get('assetId')!, dealershipId } })) return false;
    if (query.get('leadId') && !await db.lead.findFirst({ where: { id: query.get('leadId')!, dealershipId } })) return false;
    if (query.get('importRunId') && !await db.ingressRun.findFirst({ where: { id: query.get('importRunId')!, dealershipId } })) return false;
    if (query.get('ids')) {
      const ids = [...new Set(query.get('ids')!.split(','))];
      if (await db.vehicle.count({ where: { id: { in: ids }, dealershipId } }) !== ids.length) return false;
    }
    if (!match[3]) return true;
    if (match[2] === 'inventory') {
      if (query.get('assetId')) return true;
      // Legacy vehicle bookmarks encode their display title and stock number.
      const vehicles = await db.vehicle.findMany({ where: { dealershipId }, select: { year: true, make: true, model: true, stockNumber: true } });
      const slug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return vehicles.some(v => `${slug(`${v.year} ${v.make} ${v.model}`)}-${slug(v.stockNumber)}` === match[3]);
    }
    if (match[2] === 'activity') return ['attention', 'leads', 'sales', 'all'].includes(match[3]);
    const [channel, view] = match[3].split('/');
    if (view && !['overview', 'setup', 'activity', 'settings', 'social', 'catalog', 'listings', 'leads', 'queue', 'history'].includes(view)) return false;
    return Boolean(await db.platformAccount.findFirst({ where: { dealershipId, platformSlug: channel } }));
  }
  app.post<{ Params: Params }>(`${base}/team`, async (req, reply) => {
    if (!await requireDealerAccess(db, req, reply, req.params.dealershipId)) return;
    const parsed = threadInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Enter a title, message and valid post type.' });
    const data = parsed.data;
    if (!await validAssignee(req.params.dealershipId, data.assigneeId) || !await validReference(req.params.dealershipId, data.reference)) return reply.code(400).send({ error: 'Choose a member or record from this dealership.' });
    return reply.code(201).send(await db.teamThread.create({ data: { ...data, assigneeId: data.kind === 'TASK' ? data.assigneeId : null, dealershipId: req.params.dealershipId, authorId: req.operator!.id, authorEmail: req.operator!.email } }));
  });
  app.patch<{ Params: Params }>(`${base}/team/:threadId`, async (req, reply) => {
    if (!await requireDealerAccess(db, req, reply, req.params.dealershipId)) return;
    const parsed = taskPatch.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid task update.' });
    if (!await validAssignee(req.params.dealershipId, parsed.data.assigneeId)) return reply.code(400).send({ error: 'Choose a member from this dealership.' });
    const result = await db.teamThread.updateMany({ where: { id: req.params.threadId, dealershipId: req.params.dealershipId, kind: 'TASK' }, data: { ...(parsed.data.completed !== undefined ? { completedAt: parsed.data.completed ? new Date() : null } : {}), ...(parsed.data.assigneeId !== undefined ? { assigneeId: parsed.data.assigneeId } : {}) } });
    return result.count ? { ok: true } : reply.code(404).send({ error: 'Task not found.' });
  });
  app.post<{ Params: Params }>(`${base}/team/:threadId/comments`, async (req, reply) => {
    if (!await requireDealerAccess(db, req, reply, req.params.dealershipId)) return;
    const parsed = z.object({ body: z.string().trim().min(1).max(10000) }).strict().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Enter a comment (up to 10,000 characters).' });
    const thread = await db.teamThread.findFirst({ where: { id: req.params.threadId, dealershipId: req.params.dealershipId } });
    if (!thread) return reply.code(404).send({ error: 'Discussion not found.' });
    return reply.code(201).send(await db.teamComment.create({ data: { threadId: thread.id, body: parsed.data.body, authorId: req.operator!.id, authorEmail: req.operator!.email } }));
  });
}
