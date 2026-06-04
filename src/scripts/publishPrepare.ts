import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { runPrepareAndPublish, STATE_BADGE } from '../services/prepareAndPublishService.js';

const READINESS_ICON: Record<string, string> = { GREEN: '✅', YELLOW: '⚠️ ', RED: '❌' };
const CLASS_LABEL: Record<string, string> = {
  OWNED:            'Owned',
  FEEDABLE:         'Feed  ',
  ASSISTED:         'Packet',
  PARTNER_DEPENDENT:'Partner'
};

async function main() {
  const args = process.argv.slice(2);
  const dealershipId = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const platformFlag = args.indexOf('--platforms');
  const platformFilter = platformFlag >= 0
    ? (args[platformFlag + 1] ?? '').split(',').filter(Boolean)
    : undefined;

  if (!dealershipId) {
    console.error('Usage: publish:prepare <dealershipId> [--dry-run] [--platforms p1,p2,...]');
    process.exit(1);
  }

  console.log(`\nPrepare & Publish${dryRun ? ' [DRY RUN]' : ''}  — loading dealer...`);

  // Run with step-by-step feedback
  process.stdout.write('Step 1 — Inventory check ... ');
  let result;
  try {
    result = await runPrepareAndPublish(prisma, dealershipId, { platformFilter, dryRun });
  } catch (err: any) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }

  // Header
  console.log(`\r\nPrepare & Publish${dryRun ? ' [DRY RUN]' : ''} — ${result.dealerName}`);
  console.log('═'.repeat(70));
  console.log(`Prepared: ${result.preparedAt.slice(0, 16)} UTC`);
  if (platformFilter?.length) console.log(`Platform filter: ${platformFilter.join(', ')}`);
  console.log('');

  // Step 1 — Inventory
  console.log('Step 1 — Inventory');
  const v = result.vehicles;
  const vLine = `  ${v.total} vehicle${v.total !== 1 ? 's' : ''}  ·  ✅ ${v.ready} ready  ·  ⚠️  ${v.warning} warning  ·  ❌ ${v.blocked} blocked`;
  console.log(vLine);
  if (v.blocked > 0 || v.warning > 0) {
    for (const vh of v.details.filter(d => d.label !== 'ready')) {
      const icon = vh.label === 'blocked' ? '❌' : '⚠️ ';
      const topIssue = vh.issues[0];
      console.log(`  ${icon} ${vh.stockNumber}  ${topIssue?.message ?? ''}`);
    }
  }
  console.log('');

  // Step 2 — Readiness
  const rs = result.readinessSummary;
  console.log('Step 2 — Readiness');
  console.log(`  ${rs.green}G / ${rs.yellow}Y / ${rs.red}R  across ${result.platforms.length} platform${result.platforms.length !== 1 ? 's' : ''}`);
  if (rs.red > 0) {
    for (const p of result.platforms.filter(p => p.readiness === 'RED')) {
      console.log(`  ${READINESS_ICON['RED']} ${p.platformName} — ${p.detail}`);
    }
  }
  console.log('');

  // Step 3 — Actions taken (non-dry-run)
  if (!dryRun) {
    console.log('Step 3 — Artifacts & Queue');
    const activatedCount = result.platforms.filter(p => !['Blocked', 'Partner Required'].includes(p.state)).length;
    const queuedCount = result.platforms.filter(p => ['Ready', 'Scheduled'].includes(p.state)).length;
    console.log(`  ${activatedCount} platform${activatedCount !== 1 ? 's' : ''} prepared  ·  ${queuedCount} queued for dispatch`);
    console.log('');
  }

  // Step 4 — Platform Status Grid
  console.log('Step 4 — Platform Status Grid');
  console.log('─'.repeat(70));

  // Group by integration class
  const classOrder = ['OWNED', 'FEEDABLE', 'ASSISTED', 'PARTNER_DEPENDENT'] as const;
  const classLabel: Record<string, string> = {
    OWNED:             '── Owned channel ──',
    FEEDABLE:          '── Self-serve feed (FEEDABLE) ──',
    ASSISTED:          '── Assisted onboarding (ASSISTED) ──',
    PARTNER_DEPENDENT: '── Partner agreement required (PARTNER) ──'
  };

  for (const cls of classOrder) {
    const group = result.platforms.filter(p => p.integrationClass === cls);
    if (!group.length) continue;
    console.log(classLabel[cls]);
    for (const p of group) {
      const badge = STATE_BADGE[p.state] ?? p.state.padEnd(18);
      const readIcon = READINESS_ICON[p.readiness] ?? '  ';
      const when = p.scheduledFor ? `  → ${new Date(p.scheduledFor).toISOString().slice(0, 16)} UTC` : '';
      console.log(`  ${badge}  ${readIcon} ${p.platformName.padEnd(40)} ${when}`);
      if (['Blocked', 'Failed', 'Needs Approval'].includes(p.state)) {
        console.log(`              ${p.detail}`);
      }
    }
    console.log('');
  }

  // Summary
  const s = result.summary;
  console.log('─'.repeat(70));
  const summaryParts = [
    s['Active']           > 0 ? `${s['Active']} active`            : '',
    s['Ready']            > 0 ? `${s['Ready']} ready`              : '',
    s['Scheduled']        > 0 ? `${s['Scheduled']} scheduled`      : '',
    s['Packet Prepared']  > 0 ? `${s['Packet Prepared']} packet prepared` : '',
    s['Needs Approval']   > 0 ? `${s['Needs Approval']} needs approval`   : '',
    s['Blocked']          > 0 ? `${s['Blocked']} blocked`           : '',
    s['Partner Required'] > 0 ? `${s['Partner Required']} partner required` : '',
    s['Failed']           > 0 ? `${s['Failed']} failed`             : ''
  ].filter(Boolean);
  console.log(`  ${summaryParts.join('  ·  ')}`);
  console.log('');

  if (dryRun) {
    console.log('[DRY RUN] No DB changes made. Remove --dry-run to execute.');
  } else {
    const dispatchable = s['Ready'] + s['Scheduled'];
    if (dispatchable > 0) {
      console.log(`${dispatchable} item(s) queued. Run sync:scheduler to dispatch.`);
    }
    if (s['Needs Approval'] > 0) {
      console.log(`${s['Needs Approval']} item(s) need approval. Run sync:approval to review.`);
    }
  }

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
