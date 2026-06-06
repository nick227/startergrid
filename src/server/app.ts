import Fastify, { type FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { registerDealerRoutes }     from './routes/dealers.js';
import { registerStorefrontRoutes } from './routes/storefront.js';
import { registerInventoryRoutes }  from './routes/inventory.js';
import { registerPublishRoutes }    from './routes/publish.js';
import { registerAccountRoutes }    from './routes/accounts.js';
import { registerIngressRoutes }    from './routes/ingress.js';
import { registerPerformanceRoutes }  from './routes/performance.js';
import { registerMarketplaceRoutes }  from './routes/marketplace.js';
import { demoFeedPayload }          from '../fixtures/scenarios/connectedInventoryDemo.fixture.js';

export function buildApp(prisma: PrismaClient): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/health', async (_req, reply) => {
    return reply.send({ ok: true, ts: new Date().toISOString() });
  });

  // Dev-only demo feed — not registered in production.
  if (process.env['NODE_ENV'] !== 'production') {
    app.get('/dev/demo-feed', async (_req, reply) => {
      return reply.send(demoFeedPayload);
    });
  }

  registerDealerRoutes(app, prisma);
  registerStorefrontRoutes(app, prisma);
  registerInventoryRoutes(app, prisma);
  registerPublishRoutes(app, prisma);
  registerAccountRoutes(app, prisma);
  registerIngressRoutes(app, prisma);
  registerPerformanceRoutes(app, prisma);
  registerMarketplaceRoutes(app, prisma);

  return app;
}
