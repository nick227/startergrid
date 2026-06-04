import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';
import { processReadyItems } from '../../services/publishing/publishQueueService.js';

async function main() {
  const dealershipId = process.argv[2];
  if (!dealershipId) {
    console.error('Usage: sync:run <dealershipId>');
    process.exit(1);
  }

  console.log(`\nSync Run — ${dealershipId}`);
  console.log('─'.repeat(50));

  const { runId, sent, skipped } = await processReadyItems(prisma, dealershipId, 'OPERATOR_CLI');

  console.log(`Run ID:  ${runId}`);
  console.log(`Sent:    ${sent}  (MOCK env — no real API calls)`);
  console.log(`Skipped: ${skipped}  (scheduled for future / awaiting approval)`);

  if (sent === 0 && skipped === 0) {
    console.log('\nNothing to process. Queue may be empty or all items need approval.');
  } else if (sent > 0) {
    console.log(`\n${sent} item(s) dispatched. Run sync:queue to review the updated state.`);
  }

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
