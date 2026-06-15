import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { registerPublishRoutes } from './src/server/routes/publish.js';

const prisma = new PrismaClient();
const app = Fastify();

app.decorateRequest('operator', null);
app.addHook('onRequest', async (request) => {
  // Mock Operator
  request.operator = {
    id: 'operator-1', // Assuming this is an operator ID
    email: 'a@a.com',
    role: 'OPERATOR',
    dealerAccessIds: ['dealer_messy_motors']
  } as any;
});

registerPublishRoutes(app, prisma);

async function main() {
  await app.ready();
  const res = await app.inject({
    method: 'GET',
    url: '/api/dealers/dealer_messy_motors/publish/status',
  });
  console.log("Status Code:", res.statusCode);
  const data = JSON.parse(res.payload);
  console.log("Error:", data.error);
  console.log("Platforms length:", data.platforms?.length);
  console.log("Platforms content:", data.platforms?.map((p: any) => p.platformSlug));
  await prisma.$disconnect();
}
main().catch(console.error);
