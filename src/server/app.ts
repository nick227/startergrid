import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import type { PrismaClient } from '@prisma/client';
import { registerAuthRoutes }        from './routes/auth.js';
import { registerDealerRoutes }     from './routes/dealers.js';
import { registerStorefrontRoutes } from './routes/storefront.js';
import { registerInventoryRoutes }  from './routes/inventory.js';
import { registerPublishRoutes }    from './routes/publish.js';
import { registerAccountRoutes }    from './routes/accounts.js';
import { registerIngressRoutes }    from './routes/ingress.js';
import { registerPerformanceRoutes }  from './routes/performance.js';
import { registerReportsRoutes }      from './routes/reports.js';
import { registerMarketplaceRoutes }  from './routes/marketplace.js';
import { registerMarketplaceAuthRoutes }     from './routes/marketplaceAuth.js';
import { registerMarketplaceFavoritesRoutes } from './routes/marketplaceFavorites.js';
import { registerPlatformConnectRoutes }     from './routes/platformConnect.js';
import { registerSocialPageRoutes }          from './routes/socialPages.js';
import { registerMarketplaceListingRoutes }  from './routes/marketplaceListings.js';
import { registerCatalogSyncRoutes }          from './routes/catalogSync.js';
import { registerLeadSyncRoutes }             from './routes/leadSync.js';
import { registerAdminRoutes }                from './routes/admin.js';
import { registerDealerLeadsRoutes }          from './routes/dealerLeads.js';
import { registerDealerNotificationsRoutes }  from './routes/dealerNotifications.js';
import { registerBuyerOutreachRoutes }         from './routes/buyerOutreach.js';
import { demoFeedPayload }          from '../fixtures/scenarios/connectedInventoryDemo.fixture.js';

export function buildApp(prisma: PrismaClient): FastifyInstance {
  const app = Fastify({ logger: false });

  const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '')
    .split(',').map(o => o.trim()).filter(Boolean);
  app.register(cors, {
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });

  app.register(fastifyMultipart, {
    limits: {
      fileSize: 15 * 1024 * 1024, // 15MB limit
      files: 20, // Max 20 files per request
    }
  });

  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  app.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Committed demo sample images — referenced by seeded demo vehicles, so a
  // fresh clone + db:seed renders photos without depending on local uploads/.
  const demoAssetsDir = path.join(process.cwd(), 'assets', 'demo-vehicles');
  if (fs.existsSync(demoAssetsDir)) {
    app.register(fastifyStatic, {
      root: demoAssetsDir,
      prefix: '/demo-assets/',
      decorateReply: false,
    });
  }

  app.get('/health', async (_req, reply) => {
    return reply.send({ ok: true, ts: new Date().toISOString() });
  });

  // Built SPA bundles (apps/web, apps/marketplace, apps/splash) are served
  // from this same process in production — one Railway service, one deploy.
  // Each gets its own encapsulated context so the fastify-static `sendFile`
  // reply decorator doesn't collide across the three registrations, and each
  // falls back to its own index.html for client-side routes.
  const registerSpa = (prefix: string, distDir: string): void => {
    if (!fs.existsSync(path.join(distDir, 'index.html'))) return;
    app.register(async (scoped) => {
      scoped.register(fastifyStatic, { root: distDir, prefix: '/' });
      scoped.setNotFoundHandler((_req, reply) => {
        return reply.sendFile('index.html', distDir);
      });
    }, { prefix });
  };

  registerSpa('/app/', path.join(process.cwd(), 'apps/web/dist'));
  registerSpa('/marketplace/', path.join(process.cwd(), 'apps/marketplace/dist'));
  registerSpa('/', path.join(process.cwd(), 'apps/splash/dist'));

  // Dev-only demo feed — not registered in production.
  if (process.env['NODE_ENV'] !== 'production') {
    app.get('/dev/demo-feed', async (_req, reply) => {
      return reply.send(demoFeedPayload);
    });
  }

  registerAuthRoutes(app, prisma);
  registerDealerRoutes(app, prisma);
  registerStorefrontRoutes(app, prisma);
  registerInventoryRoutes(app, prisma);
  registerPublishRoutes(app, prisma);
  registerAccountRoutes(app, prisma);
  registerIngressRoutes(app, prisma);
  registerPerformanceRoutes(app, prisma);
  registerReportsRoutes(app, prisma);
  registerMarketplaceRoutes(app, prisma);
  registerMarketplaceAuthRoutes(app, prisma);
  registerMarketplaceFavoritesRoutes(app, prisma);
  registerPlatformConnectRoutes(app, prisma);
  registerSocialPageRoutes(app, prisma);
  registerMarketplaceListingRoutes(app, prisma);
  registerCatalogSyncRoutes(app, prisma);
  registerLeadSyncRoutes(app, prisma);
  registerAdminRoutes(app, prisma);
  registerDealerLeadsRoutes(app, prisma);
  registerDealerNotificationsRoutes(app, prisma);
  registerBuyerOutreachRoutes(app, prisma);

  return app;
}
