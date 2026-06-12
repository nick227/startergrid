import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireOperator, requireDealerAccess } from '../security.js';
import { fileUploadService } from '../../services/storage/fileUploadService.js';
import { createDealershipSchema, validateBody } from '../requestValidation.js';
import { createDealership } from '../../services/dealer/createDealershipService.js';

function sendCreateDealershipError(reply: FastifyReply, err: unknown) {
  const statusCode = typeof err === 'object' && err !== null && 'statusCode' in err
    ? Number((err as { statusCode?: number }).statusCode)
    : 500;
  const message = err instanceof Error ? err.message : 'Failed to create dealership';
  return reply.status(statusCode || 500).send({ error: message });
}

export function registerDealerRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/api/dealers', async (request, reply) => {
    if (!await requireOperator(prisma, request, reply)) return;

    const dealers = await prisma.dealershipProfile.findMany({
      select: {
        id: true,
        legalName: true,
        dbaName: true,
        logoUrl: true,
        businessCategory: true,
        createdAt: true,
      },
      orderBy: { legalName: 'asc' }
    });
    return reply.send({ dealers });
  });

  app.post('/api/dealers', async (request, reply) => {
    const operator = await requireOperator(prisma, request, reply);
    if (!operator) return;

    const parsed = validateBody(createDealershipSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });

    try {
      const result = await createDealership(prisma, parsed.data, {
        createdByOperatorId: operator.devHeader ? null : operator.id,
        // Only grant access when we have a real OperatorAccount DB id.
        // Dev-bypass headers produce a synthetic id that is not a FK-valid PK.
        grantAccessToOperatorId: operator.devHeader ? null : operator.id,
      });
      return reply.status(201).send({
        dealer: result.dealer,
        nextHref: `#/${result.dealer.id}/platforms`,
        mode: 'operator',
      });
    } catch (err) {
      return sendCreateDealershipError(reply, err);
    }
  });

  app.post('/api/dealers/signup', async (request, reply) => {
    const parsed = validateBody(createDealershipSchema, request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });

    try {
      const result = await createDealership(prisma, parsed.data);
      return reply.status(201).send({
        dealer: result.dealer,
        nextHref: '#/',
        mode: 'signup',
      });
    } catch (err) {
      return sendCreateDealershipError(reply, err);
    }
  });

  app.post<{ Params: { dealershipId: string } }>('/api/dealers/signup/:dealershipId/logo', async (request, reply) => {
    const { dealershipId } = request.params;
    const dealer = await prisma.dealershipProfile.findUnique({
      where: { id: dealershipId },
      select: { id: true },
    });
    if (!dealer) return reply.status(404).send({ error: 'Dealer not found' });

    type MultipartPart = { type: string; fieldname: string; file: NodeJS.ReadableStream; resume(): void; mimetype: string };
    const parts = (request as unknown as { parts(): AsyncIterable<MultipartPart> }).parts();
    let fileStream: NodeJS.ReadableStream | null = null;
    let mimeType = '';

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'logo') {
        fileStream = part.file;
        mimeType = part.mimetype;
        break;
      }
    }

    if (!fileStream) return reply.status(400).send({ error: 'No logo file provided' });

    const url = await fileUploadService.uploadFile(fileStream, mimeType);
    const updated = await prisma.dealershipProfile.update({
      where: { id: dealershipId },
      data: { logoUrl: url },
      select: { logoUrl: true },
    });

    return reply.send({ logoUrl: updated.logoUrl });
  });

  app.post<{ Params: { dealershipId: string } }>('/api/dealers/:dealershipId/logo', async (request, reply) => {
    const { dealershipId } = request.params;
    if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

    type MultipartPart = { type: string; fieldname: string; file: NodeJS.ReadableStream; resume(): void; mimetype: string };
    const parts = (request as unknown as { parts(): AsyncIterable<MultipartPart> }).parts();
    let fileStream: NodeJS.ReadableStream | null = null;
    let mimeType = '';

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'logo') {
        fileStream = part.file;
        mimeType = part.mimetype;
        break;
      }
    }

    if (!fileStream) {
      return reply.status(400).send({ error: 'No logo file provided' });
    }

    const url = await fileUploadService.uploadFile(fileStream, mimeType);

    const updated = await prisma.dealershipProfile.update({
      where: { id: dealershipId },
      data: { logoUrl: url }
    });

    return reply.send({ logoUrl: updated.logoUrl });
  });
}
