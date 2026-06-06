import 'dotenv/config';
import { execSync } from 'node:child_process';
import { prisma } from '../../lib/prisma.js';
import { platformProfiles } from '../../data/platformProfiles.js';
import { checkPlatformStaleness } from '../../services/inventory/mediaValidationService.js';
import { buildApp } from '../../server/app.js';

type CheckResult = { name: string; ok: boolean; detail: string };

async function run(): Promise<void> {
  const results: CheckResult[] = [];
  let exitCode = 0;

  const check = (name: string, ok: boolean, detail: string) => {
    results.push({ name, ok, detail });
    if (!ok) exitCode = 1;
  };

  // 1. DB connectivity
  try {
    await prisma.$connect();
    check('DB connection', true, 'MySQL reachable');
  } catch (err: any) {
    check('DB connection', false, err.message);
  }

  // 2. Platform profiles seeded
  try {
    const count = await prisma.platformProfile.count();
    check('Platform profiles', count === platformProfiles.length, `${count}/${platformProfiles.length} seeded`);
  } catch {
    check('Platform profiles', false, 'query failed');
  }

  // 3. At least one dealer exists
  try {
    const count = await prisma.dealershipProfile.count();
    check('Dealer records', count >= 1, `${count} dealer(s) in DB`);
  } catch {
    check('Dealer records', false, 'query failed');
  }

  // 4. Platform profile staleness
  const staleEntries = checkPlatformStaleness(platformProfiles).filter(e => e.stale);
  check(
    'Profile freshness',
    staleEntries.length === 0,
    staleEntries.length === 0
      ? 'all profiles within 180-day window'
      : `${staleEntries.length} stale: ${staleEntries.map(e => e.slug).join(', ')}`
  );

  // 5. validate:pristine
  try {
    execSync('npm run -s validate:pristine', { stdio: 'pipe' });
    check('validate:pristine', true, '19/19 GREEN, 0 RED');
  } catch {
    check('validate:pristine', false, 'one or more platforms failed');
  }

  // 6. Typecheck
  try {
    execSync('npm run -s typecheck', { stdio: 'pipe' });
    check('typecheck', true, 'no TypeScript errors');
  } catch {
    check('typecheck', false, 'TypeScript errors found');
  }

  // 7. Dev auth guard contract
  try {
    const app = buildApp(prisma);
    const unauthenticated = await app.inject({ method: 'GET', url: '/api/dealers' });
    const authenticated = await app.inject({
      method: 'GET',
      url: '/api/dealers',
      headers: { 'x-operator-id': process.env['DEV_OPERATOR_ID'] ?? 'smoke-dev-operator' },
    });

    check(
      'Dev operator auth',
      unauthenticated.statusCode === 401 && authenticated.statusCode === 200,
      `unauth=${unauthenticated.statusCode}, auth=${authenticated.statusCode}`
    );
  } catch (err: any) {
    check('Dev operator auth', false, err.message);
  }

  // 8. Ingress poll dry-run
  try {
    execSync('node dist/src/scripts/inventory/pollSources.js --dry-run', { stdio: 'pipe' });
    check('ingress:poll dry-run', true, 'exits cleanly');
  } catch {
    check('ingress:poll dry-run', false, 'non-zero exit');
  }

  await prisma.$disconnect();

  // Print results
  console.log('\nSmoke Test Results');
  console.log('═'.repeat(50));
  for (const r of results) {
    const badge = r.ok ? '✅' : '❌';
    console.log(`${badge}  ${r.name.padEnd(24)} ${r.detail}`);
  }
  console.log('─'.repeat(50));
  const passed = results.filter(r => r.ok).length;
  console.log(`${passed}/${results.length} checks passed`);
  if (exitCode !== 0) console.log('\nFailed checks must be resolved before shipping.');
  console.log('');

  process.exit(exitCode);
}

run().catch(err => { console.error(err); process.exit(1); });
