import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { getQueueView } from '../services/publishQueueService.js';
import { ageLabel } from '../services/approvalService.js';

const STATUS_BADGE: Record<string, string> = {
  READY:          '🟢 READY         ',
  SCHEDULED:      '🔵 SCHEDULED     ',
  NEEDS_APPROVAL: '🟡 NEEDS APPROVAL',
  HELD:           '🟠 HELD          ',
  BLOCKED:        '⚪ BLOCKED       ',
  CLAIMED:        '⏳ IN PROGRESS   ',
  SENT:           '✅ SENT          ',
  FAILED:         '❌ FAILED        ',
  CANCELLED:      '── CANCELLED     '
};

const ACCOUNT_BADGE: Record<string, string> = {
  ACTIVE:             '🟢 ACTIVE',
  PENDING_REVIEW:     '🔵 PENDING REVIEW',
  CREDENTIALS_NEEDED: '🟡 CREDENTIALS NEEDED',
  ACCOUNT_NEEDED:     '⚪ ACCOUNT NEEDED',
  PARTNER_REQUIRED:   '⚪ PARTNER REQUIRED',
  BLOCKED:            '❌ BLOCKED',
  SUSPENDED:          '❌ SUSPENDED'
};

async function main() {
  const dealershipId = process.argv[2];
  if (!dealershipId) {
    console.error('Usage: sync:queue <dealershipId>');
    process.exit(1);
  }

  const view = await getQueueView(prisma, dealershipId);

  console.log(`\nPublishing Control Center — ${view.dealerName}`);
  console.log('═'.repeat(70));
  console.log(`Generated: ${view.generatedAt}`);
  console.log('');

  // Summary
  const s = view.summary;
  const alerts = [
    s.overdue > 0      ? `⚠️  ${s.overdue} OVERDUE` : '',
    s.retryPending > 0 ? `🔄 ${s.retryPending} RETRY PENDING` : '',
    s.claimed > 0      ? `⏳ ${s.claimed} IN PROGRESS` : ''
  ].filter(Boolean).join('  ');
  if (alerts) console.log(alerts + '\n');

  const nextDue = view.pending
    .filter(i => i.scheduledFor && i.status === 'SCHEDULED')
    .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime())[0];
  if (nextDue) {
    console.log(`Next due:  ${new Date(nextDue.scheduledFor!).toISOString().slice(0, 16)} UTC  (${nextDue.platformName} · ${nextDue.triggerKind})`);
  }

  console.log(`Queue: ${view.pending.length} pending  (${s.ready} ready · ${s.scheduled} scheduled · ${s.needsApproval} needs approval · ${s.blocked} blocked)`);
  console.log('');

  if (view.pending.length === 0) {
    console.log('  No pending items.');
  } else {
    // Group pending by policyMode
    const byMode: Record<string, typeof view.pending> = {};
    for (const item of view.pending) {
      (byMode[item.policyMode] ??= []).push(item);
    }

    const modeOrder = ['REAL_TIME', 'SCHEDULED', 'APPROVAL_REQUIRED', 'MANUAL'];
    const modeLabel: Record<string, string> = {
      REAL_TIME:          'Real-time (OWNED — immediate)',
      SCHEDULED:          'Scheduled batch (FEEDABLE)',
      APPROVAL_REQUIRED:  'Awaiting approval (ASSISTED)',
      MANUAL:             'Manual / partner required (PARTNER_DEPENDENT)'
    };

    for (const mode of modeOrder) {
      const items = byMode[mode];
      if (!items?.length) continue;
      console.log(`── ${modeLabel[mode]} ──`);
      for (const item of items) {
        const badge = STATUS_BADGE[item.status] ?? item.status;
        const when = item.scheduledFor
          ? `→ ${new Date(item.scheduledFor).toISOString().slice(0, 16)} UTC`
          : item.status === 'READY'          ? '→ next sync:scheduler'
          : item.status === 'NEEDS_APPROVAL' ? '→ awaiting operator decision'
          : item.status === 'HELD'           ? `→ held: ${item.holdReason ?? '—'}`
          : item.blockReason                 ? `→ ${item.blockReason}`
          : '';
        const vehicle = item.vehicleTitle
          ? `${item.stockNumber} ${item.vehicleTitle}`
          : '(no vehicle)';
        const age = ageLabel(new Date(item.createdAt));
        const approvalNote = item.status === 'NEEDS_APPROVAL' && item.approvalRequiredReason
          ? `\n      Reason: ${item.approvalRequiredReason}  Age: ${age}  ID: ${item.id}`
          : item.status === 'HELD'
          ? `\n      Hold by: ${item.claimedBy ?? 'operator'}  Age: ${age}  ID: ${item.id}`
          : '';
        console.log(`  ${badge}  ${item.platformName.padEnd(36)} ${vehicle.padEnd(28)} ${item.triggerKind.padEnd(16)} ${when}${approvalNote}`);
      }
      console.log('');
    }
  }

  // Claimed / in-progress
  if (view.claimed.length > 0) {
    console.log('── ⏳ In Progress (claimed by scheduler) ──');
    for (const item of view.claimed) {
      const vehicle = item.vehicleTitle ? `${item.stockNumber} ${item.vehicleTitle}` : '—';
      console.log(`  ⏳ IN PROGRESS   ${item.platformName.padEnd(36)} ${vehicle.padEnd(28)} claimed by: ${item.claimedBy ?? '?'}`);
    }
    console.log('');
  }

  // Overdue scheduled items
  if (view.overdue.length > 0) {
    console.log('── ⚠️  Overdue (scheduled window missed) ──');
    for (const item of view.overdue) {
      const vehicle = item.vehicleTitle ? `${item.stockNumber} ${item.vehicleTitle}` : '—';
      const due = item.scheduledFor ? new Date(item.scheduledFor).toISOString().slice(0, 16) : '?';
      console.log(`  ⚠️  OVERDUE      ${item.platformName.padEnd(36)} ${vehicle.padEnd(28)} was due: ${due} UTC`);
    }
    console.log('  → Run sync:scheduler to dispatch overdue items.');
    console.log('');
  }

  // Retry-eligible failures
  if (view.retryPending.length > 0) {
    console.log('── 🔄 Retry Pending ──');
    for (const item of view.retryPending) {
      const vehicle = item.vehicleTitle ? `${item.stockNumber} ${item.vehicleTitle}` : '—';
      const next = item.nextAttemptAt ? new Date(item.nextAttemptAt).toISOString().slice(0, 16) : 'now';
      console.log(`  🔄 RETRY         ${item.platformName.padEnd(36)} ${vehicle.padEnd(28)} attempt ${item.attemptCount + 1}/${3}  next: ${next}`);
    }
    console.log('');
  }

  // Platform accounts
  if (view.platformAccounts.length > 0) {
    console.log('── Platform Accounts ──');
    for (const acct of view.platformAccounts) {
      const badge = ACCOUNT_BADGE[acct.state] ?? acct.state;
      console.log(`  ${badge.padEnd(28)}  ${acct.platformName}`);
    }
    console.log('');
  }

  // Recent sent/failed (last 5)
  const recent = view.terminal.filter(i => i.status === 'SENT' || i.status === 'FAILED').slice(0, 5);
  if (recent.length > 0) {
    console.log('── Recent history ──');
    for (const item of recent) {
      const badge = STATUS_BADGE[item.status] ?? item.status;
      const when = item.sentAt ? new Date(item.sentAt).toISOString().slice(0, 16) : item.createdAt.slice(0, 16);
      const vehicle = item.vehicleTitle ? `${item.stockNumber} ${item.vehicleTitle}` : '—';
      const retryNote = item.attemptCount > 1 ? ` [${item.attemptCount} attempts]` : '';
      console.log(`  ${badge}  ${item.platformName.padEnd(36)} ${vehicle.padEnd(28)} ${when}${retryNote}`);
    }
    console.log('');
  }

  console.log('──────────────────────────────────────────────────────────────────────');
  console.log(`  ${s.ready} ready · ${s.scheduled} scheduled · ${s.needsApproval} needs approval · ${s.blocked} blocked · ${s.sent} sent · ${s.failed} failed`);

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
