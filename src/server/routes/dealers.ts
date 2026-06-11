import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireOperator, requireDealerAccess } from '../security.js';
import { fileUploadService } from '../../services/storage/fileUploadService.js';

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
