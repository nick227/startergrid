import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireSuperAdmin } from '../security.js';
import {
  listProviderCredentials,
  validateProviderCredentials,
} from '../../services/platform/credentialHealthService.js';

export function registerAdminRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/api/admin/platform-credentials', async (request, reply) => {
    if (!await requireSuperAdmin(prisma, request, reply)) return;
    return reply.send({ providers: listProviderCredentials() });
  });

  app.post('/api/admin/platform-credentials/validate', async (request, reply) => {
    if (!await requireSuperAdmin(prisma, request, reply)) return;
    return reply.send({ results: await validateProviderCredentials() });
  });
}
