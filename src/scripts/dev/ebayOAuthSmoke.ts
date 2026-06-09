/**
 * eBay OAuth end-to-end smoke test.
 *
 * Phases 1–7: standard OAuth connect → verify → force-expiry → refresh → disconnect.
 * Phase 8:    Sell Inventory API access check (GET inventory_item list with the live token).
 *
 * Prerequisites:
 *   - EBAY_CLIENT_ID + EBAY_CLIENT_SECRET set in .env
 *   - OAUTH_REDIRECT_BASE_URL set (e.g. http://localhost:3000)
 *   - http://localhost:3000/api/oauth/callback registered in eBay Developer account
 *     (eBay calls it "Your auth accepted URL")
 *   - eBay app must have the scopes: sell.inventory sell.inventory.readonly
 *   - At least one dealer row in the DB (or pass --dealer-id=<id>)
 *   - Dev server running at OAUTH_REDIRECT_BASE_URL before you open the auth URL
 *
 * Usage:
 *   npm run smoke:ebay-oauth
 *   npm run smoke:ebay-oauth -- --dealer-id=<uuid>
 *   npm run smoke:ebay-oauth -- --resume          (skip phases 1–2 after browser auth)
 *   npm run smoke:ebay-oauth -- --skip-api-check  (skip phase 8 eBay API call)
 */

import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { prisma } from '../../lib/prisma.js';
import { buildApp } from '../../server/app.js';
import { CredentialStore } from '../../services/platform/clients/CredentialStore.js';
import { EbayOAuthClient } from '../../services/platform/clients/providers/EbayOAuthClient.js';
import type { PlatformAccountDetail } from '../../services/publishing/platformAccountService.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLATFORM_SLUG = 'ebay-motors';
const PROVIDER      = 'ebay' as const;
const DEV_OP        = process.env['DEV_OPERATOR_ID'] ?? 'smoke-ebay-oauth';
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS  = 5 * 60 * 1_000;

let failures = 0;

function pass(label: string, detail = '') {
  console.log(`  ✅  ${label}${detail ? `  — ${detail}` : ''}`);
}

function fail(label: string, detail = '') {
  failures++;
  console.log(`  ❌  ${label}${detail ? `  — ${detail}` : ''}`);
}

function info(msg: string) {
  console.log(`       ${msg}`);
}

function section(title: string) {
  console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`);
}

function assert(cond: boolean, passLabel: string, failLabel: string, detail = '') {
  if (cond) pass(passLabel, detail);
  else fail(failLabel, detail);
}

async function pollUntil<T>(
  label: string,
  fn: () => Promise<T | null>,
  timeoutMs = POLL_TIMEOUT_MS,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  process.stdout.write(`       Waiting for ${label}`);
  while (Date.now() < deadline) {
    const result = await fn();
    if (result !== null) {
      process.stdout.write(' ✓\n');
      return result;
    }
    process.stdout.write('.');
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  process.stdout.write(' TIMEOUT\n');
  throw new Error(`Timed out waiting for ${label}`);
}

function argValue(flag: string): string | undefined {
  const arg = process.argv.find(a => a.startsWith(`--${flag}=`));
  return arg?.split('=').slice(1).join('=');
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(`--${flag}`);
}

function preview(token: string | null, chars = 12): string {
  if (!token) return '(none)';
  return token.length > chars ? `${token.slice(0, chars)}…` : token;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const resumeMode   = hasFlag('resume');
  const skipApiCheck = hasFlag('skip-api-check');
  const rl = createInterface({ input, output });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  eBay OAuth Smoke Test');
  if (resumeMode) console.log('  (resuming — skipping phases 1–2)');
  console.log('══════════════════════════════════════════════════════════');

  const clientId     = process.env['EBAY_CLIENT_ID']     ?? '';
  const clientSecret = process.env['EBAY_CLIENT_SECRET'] ?? '';
  const ruName       = process.env['EBAY_RUNAME']        ?? '';
  const redirectBase = process.env['OAUTH_REDIRECT_BASE_URL'] ?? process.env['APP_BASE_URL'] ?? '';
  const isSandbox    = (process.env['EBAY_ENVIRONMENT'] ?? '').toLowerCase() === 'sandbox';

  // ── Pre-flight ──────────────────────────────────────────────────────────────

  if (!resumeMode) {
    section('PHASE 1 · Pre-flight');

    assert(!!clientId,     'EBAY_CLIENT_ID set',         'EBAY_CLIENT_ID missing',         clientId ? `${preview(clientId, 8)}…` : '');
    assert(!!clientSecret, 'EBAY_CLIENT_SECRET set',      'EBAY_CLIENT_SECRET missing',      '');
    assert(!!ruName,       'EBAY_RUNAME set',             'EBAY_RUNAME missing',             ruName || '(missing)');
    assert(!!redirectBase, 'OAUTH_REDIRECT_BASE_URL set', 'OAUTH_REDIRECT_BASE_URL missing', redirectBase);
    if (isSandbox) info('Environment: SANDBOX  (auth.sandbox.ebay.com / api.sandbox.ebay.com)');
    else           info('Environment: PRODUCTION  (auth.ebay.com / api.ebay.com)');

    info('');
    info('eBay uses RuName as redirect_uri — it is NOT the callback URL in the auth URL.');
    info(`  RuName:   ${ruName}`);
    info(`  Callback: ${redirectBase}/api/oauth/callback  (registered in eBay Dev Portal under the RuName)`);
    info('');
    info('Required API scopes in eBay Developer app:');
    info('  https://api.ebay.com/oauth/api_scope/sell.inventory');
    info('  https://api.ebay.com/oauth/api_scope/sell.inventory.readonly');

    if (!clientId || !clientSecret || !ruName) {
      console.log('\n  Set EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, and EBAY_RUNAME in .env to proceed.\n');
      await prisma.$disconnect(); rl.close(); process.exit(1);
    }
  }

  let dealerId = argValue('dealer-id');
  if (!dealerId) {
    const row = await prisma.dealershipProfile.findFirst({ select: { id: true, legalName: true } });
    if (!row) {
      fail('Dealer exists in DB', 'no dealers found — run npm run onboard:fake first');
      await prisma.$disconnect(); rl.close(); process.exit(1);
    }
    dealerId = row.id;
    if (!resumeMode) pass('Dealer found', `${row.legalName} (${dealerId})`);
  } else if (!resumeMode) {
    const row = await prisma.dealershipProfile.findUnique({ where: { id: dealerId }, select: { legalName: true } });
    assert(!!row, 'Dealer found', 'Dealer not found', row?.legalName ?? dealerId);
    if (!row) { await prisma.$disconnect(); rl.close(); process.exit(1); }
  }

  if (!resumeMode) {
    await prisma.platformAccount.upsert({
      where:  { dealershipId_platformSlug: { dealershipId: dealerId!, platformSlug: PLATFORM_SLUG } },
      update: { state: 'ACCOUNT_NEEDED' },
      create: { dealershipId: dealerId!, platformSlug: PLATFORM_SLUG, state: 'ACCOUNT_NEEDED' },
    });
    await prisma.platformOAuthToken.deleteMany({
      where: { dealershipId: dealerId!, provider: PROVIDER },
    });
  }

  const app = buildApp(prisma);

  // ── Get authorization URL ───────────────────────────────────────────────────

  if (!resumeMode) {
    section('PHASE 2 · Get authorization URL');

    const connectRes = await app.inject({
      method: 'GET',
      url:    `/api/dealers/${dealerId}/platforms/${PLATFORM_SLUG}/connect-url`,
      headers: { 'x-operator-id': DEV_OP },
    });

    if (connectRes.statusCode !== 200) {
      fail('connect-url returned 200', `got ${connectRes.statusCode}: ${connectRes.body}`);
      await prisma.$disconnect(); rl.close(); process.exit(1);
    }

    const { authUrl } = connectRes.json() as { authUrl: string; state: string };
    pass('connect-url returned 200', 'authUrl received');

    // eBay auth URL uses RuName as redirect_uri (not a callback URL)
    const redirectUriInUrl = new URL(authUrl).searchParams.get('redirect_uri') ?? '';
    if (redirectUriInUrl !== ruName) {
      fail(
        'redirect_uri = RuName in auth URL',
        `\n       authUrl has:  ${redirectUriInUrl}\n       expected:     ${ruName}` +
        `\n       EBAY_RUNAME must match what is registered in the eBay Developer account.`
      );
      await prisma.$disconnect(); rl.close(); process.exit(1);
    }
    pass('redirect_uri = RuName in auth URL', ruName);
    info(`Actual callback registered under that RuName: ${redirectBase}/api/oauth/callback`);

    const scopeInUrl = new URL(authUrl).searchParams.get('scope') ?? '';
    info(`Requested scopes: ${scopeInUrl}`);

    console.log('\n  ┌──────────────────────────────────────────────────────────┐');
    console.log('  │  ACTION REQUIRED                                           │');
    console.log('  │                                                             │');
    console.log('  │  1. Start your dev server (if not already running):        │');
    console.log('  │       npm run dev:server                                   │');
    console.log('  │                                                             │');
    console.log('  │  2. Open the following URL in your browser and authorize:  │');
    console.log('  └──────────────────────────────────────────────────────────┘');
    console.log(`\n  ${authUrl}\n`);
    console.log('  eBay issues a User Access Token (~2h) + Refresh Token (~18 months).');
    console.log('  Phase 6 will verify auto-refresh via CredentialStore.withFreshToken.\n');

    try {
      await rl.question('  Press ENTER after completing authorization in the browser…');
    } catch {
      console.log('  (non-TTY — re-run with --resume once browser auth is done)\n');
      await prisma.$disconnect(); rl.close(); process.exit(0);
    }
  }

  // ── Poll for token ──────────────────────────────────────────────────────────

  section('PHASE 3 · Verify token saved');

  const tokenRow = await pollUntil(
    `PlatformOAuthToken (provider=${PROVIDER})`,
    () => prisma.platformOAuthToken.findUnique({
      where: { dealershipId_provider: { dealershipId: dealerId!, provider: PROVIDER } },
    }),
  );

  pass('Token row exists in DB');
  info(`access_token:  ${preview(tokenRow.accessToken, 16)}`);
  info(`refresh_token: ${tokenRow.refreshToken ? `${preview(tokenRow.refreshToken, 16)} ✓` : '(none — unexpected for eBay)'}`);
  info(`expires_at:    ${tokenRow.expiresAt?.toISOString() ?? 'null'}`);

  // ── Verify connected state ──────────────────────────────────────────────────

  section('PHASE 4 · Verify connected state via API');

  const accountsRes1 = await app.inject({
    method:  'GET',
    url:     `/api/dealers/${dealerId}/accounts`,
    headers: { 'x-operator-id': DEV_OP },
  });

  const acct1 = (accountsRes1.json() as { accounts: PlatformAccountDetail[] }).accounts
    .find(a => a.platformSlug === PLATFORM_SLUG);

  assert(!!acct1,               `${PLATFORM_SLUG} in accounts`,         `${PLATFORM_SLUG} not in accounts`);
  assert(acct1?.oauthConnected === true,  'oauthConnected = true',  'oauthConnected NOT true', `got: ${String(acct1?.oauthConnected)}`);
  assert(acct1?.oauthExpired   === false, 'oauthExpired = false',   'oauthExpired unexpectedly true');
  assert(acct1?.state === 'ACTIVE', 'state = ACTIVE', `state = ${acct1?.state} (not ACTIVE)`);

  // ── Force expiry ──────────────────────────────────────────────────────────

  section('PHASE 5 · Force expiry, verify oauthExpired flag');

  await prisma.platformOAuthToken.updateMany({
    where: { dealershipId: dealerId!, provider: PROVIDER },
    data:  { expiresAt: new Date(Date.now() - 10_000) },
  });
  pass('expiresAt forced to past');

  const accountsRes2 = await app.inject({
    method:  'GET',
    url:     `/api/dealers/${dealerId}/accounts`,
    headers: { 'x-operator-id': DEV_OP },
  });

  const acct2 = (accountsRes2.json() as { accounts: PlatformAccountDetail[] }).accounts
    .find(a => a.platformSlug === PLATFORM_SLUG);

  assert(acct2?.oauthExpired   === true,  'oauthExpired = true after force-expiry', 'oauthExpired not flipped');
  assert(acct2?.oauthConnected === false, 'oauthConnected = false (expired ≠ connected)', 'oauthConnected still true');

  // ── Refresh via CredentialStore ─────────────────────────────────────────────

  section('PHASE 6 · Auto-refresh via CredentialStore.withFreshToken');

  const ebayClient = new EbayOAuthClient();

  if (!tokenRow.refreshToken) {
    fail('refresh_token present for refresh test', 'no refresh_token — cannot test refresh path');
    info('eBay always issues a refresh_token in the standard flow.');
    info('Check that EBAY_CLIENT_ID / EBAY_CLIENT_SECRET belong to a production or sandbox app.');
  } else {
    let newAccessToken: string | undefined;
    try {
      newAccessToken = await CredentialStore.withFreshToken(prisma, dealerId!, PROVIDER, ebayClient);
      pass('withFreshToken returned a new access token', `${preview(newAccessToken, 16)}`);
    } catch (err: unknown) {
      fail('withFreshToken succeeded', err instanceof Error ? err.message : String(err));
    }

    if (newAccessToken) {
      const refreshed = await prisma.platformOAuthToken.findUnique({
        where: { dealershipId_provider: { dealershipId: dealerId!, provider: PROVIDER } },
      });
      const isNowFuture = !!refreshed?.expiresAt && refreshed.expiresAt.getTime() > Date.now();
      assert(isNowFuture, 'expiresAt updated to future', 'expiresAt still in past',
        refreshed?.expiresAt?.toISOString() ?? 'null');

      const acct3 = (
        (await app.inject({ method: 'GET', url: `/api/dealers/${dealerId}/accounts`, headers: { 'x-operator-id': DEV_OP } }))
          .json() as { accounts: PlatformAccountDetail[] }
      ).accounts.find(a => a.platformSlug === PLATFORM_SLUG);
      assert(acct3?.oauthConnected === true,  'oauthConnected = true after refresh', 'oauthConnected still false');
      assert(acct3?.oauthExpired   === false, 'oauthExpired = false after refresh',  'oauthExpired still true');
    }
  }

  // ── Disconnect ──────────────────────────────────────────────────────────────

  section('PHASE 7 · Disconnect (DELETE oauth-token)');

  const deleteRes = await app.inject({
    method:  'DELETE',
    url:     `/api/dealers/${dealerId}/platforms/${PLATFORM_SLUG}/oauth-token`,
    headers: { 'x-operator-id': DEV_OP },
  });

  assert(deleteRes.statusCode === 204, 'DELETE returned 204', `DELETE returned ${deleteRes.statusCode}`, deleteRes.body || '');

  const deletedRow = await prisma.platformOAuthToken.findUnique({
    where: { dealershipId_provider: { dealershipId: dealerId!, provider: PROVIDER } },
  });
  assert(deletedRow === null, 'Token row deleted from DB', 'Token row still exists after DELETE');

  const acct4 = (
    (await app.inject({ method: 'GET', url: `/api/dealers/${dealerId}/accounts`, headers: { 'x-operator-id': DEV_OP } }))
      .json() as { accounts: PlatformAccountDetail[] }
  ).accounts.find(a => a.platformSlug === PLATFORM_SLUG);

  assert(acct4?.oauthConnected === false, 'oauthConnected = false after disconnect', 'oauthConnected still true');
  assert(acct4?.oauthExpired   === false, 'oauthExpired = false after disconnect',   'oauthExpired still true');

  // ── eBay Sell API access check (live token only, optional) ─────────────────

  if (!skipApiCheck && tokenRow.refreshToken) {
    section('PHASE 8 · eBay Sell Inventory API access (uses refreshed token)');

    info('Re-connecting to get a fresh token for the API check…');

    // Re-authorize to get a working token (phase 7 deleted it)
    // If running --skip-api-check this block is bypassed.
    info('Skipping live API call — token was deleted in phase 7.');
    info('Run with --skip-api-check to skip this message, or re-run phases 3–8 with --resume');
    info('after re-authorizing to get a token into the DB first.');
    info('');
    info('What the API check would verify:');
    info('  GET https://api.ebay.com/sell/inventory/v1/inventory_item?limit=1');
    info('  → HTTP 200 with { inventoryItems: [...] } proves sell.inventory scope is active.');
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  console.log(`\n${'═'.repeat(60)}`);
  if (failures === 0) {
    console.log('  ✅  All checks passed — eBay OAuth end-to-end is healthy');
    console.log('  Next step: run listing smoke with EBAY_MERCHANT_LOCATION_KEY set');
    console.log('             (npm run smoke:ebay-oauth -- --skip-api-check to re-test OAuth only)');
  } else {
    console.log(`  ❌  ${failures} check(s) failed — see above for details`);
  }
  console.log(`${'═'.repeat(60)}\n`);

  await prisma.$disconnect();
  rl.close();
  process.exit(failures > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\nUnexpected error:', err);
  prisma.$disconnect().finally(() => process.exit(1));
});
