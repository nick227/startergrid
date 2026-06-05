import Fastify, { type FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { registerDealerRoutes }     from './routes/dealers.js';
import { registerStorefrontRoutes } from './routes/storefront.js';
import { registerInventoryRoutes }  from './routes/inventory.js';
import { registerPublishRoutes }    from './routes/publish.js';
import { registerAccountRoutes }    from './routes/accounts.js';
import { registerIngressRoutes }    from './routes/ingress.js';
import { registerPerformanceRoutes } from './routes/performance.js';
import { demoFeedPayload }          from '../fixtures/scenarios/connectedInventoryDemo.fixture.js';

export function buildApp(prisma: PrismaClient): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/health', async (_req, reply) => {
    return reply.send({ ok: true, ts: new Date().toISOString() });
  });

  // Dev-only demo feed — not in OpenAPI contract; serves fixture for local demo.
  // Consumed by the Connected Inventory Demo source (http://localhost:PORT/dev/demo-feed).
  app.get('/dev/demo-feed', async (_req, reply) => {
    return reply.send(demoFeedPayload);
  });

  registerDealerRoutes(app, prisma);
  registerStorefrontRoutes(app, prisma);
  registerInventoryRoutes(app, prisma);
  registerPublishRoutes(app, prisma);
  registerAccountRoutes(app, prisma);
  registerIngressRoutes(app, prisma);
  registerPerformanceRoutes(app, prisma);

  return app;
}
