import Fastify, { type FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { registerDealerRoutes }     from './routes/dealers.js';
import { registerStorefrontRoutes } from './routes/storefront.js';
import { registerInventoryRoutes }  from './routes/inventory.js';
import { registerPublishRoutes }    from './routes/publish.js';
import { registerAccountRoutes }    from './routes/accounts.js';
import { registerIngressRoutes }    from './routes/ingress.js';

export function buildApp(prisma: PrismaClient): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/health', async (_req, reply) => {
    return reply.send({ ok: true, ts: new Date().toISOString() });
  });

  registerDealerRoutes(app, prisma);
  registerStorefrontRoutes(app, prisma);
  registerInventoryRoutes(app, prisma);
  registerPublishRoutes(app, prisma);
  registerAccountRoutes(app, prisma);
  registerIngressRoutes(app, prisma);

  return app;
}
