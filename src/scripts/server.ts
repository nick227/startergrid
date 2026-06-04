import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { buildApp } from '../server/app.js';

const PORT = Number(process.env['PORT'] ?? 3000);
const HOST = process.env['HOST'] ?? '127.0.0.1';

const app = buildApp(prisma);

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Dealer storefront API listening at ${address}`);
  console.log(`  GET  ${address}/health`);
  console.log(`  GET  ${address}/api/dealers/:dealershipId/storefront`);
  console.log(`  GET  ${address}/api/dealers/:dealershipId/vehicles/:stockNumber`);
  console.log(`  POST ${address}/api/dealers/:dealershipId/leads`);
});
