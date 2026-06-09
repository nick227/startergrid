/**
 * Facebook Business Page OAuth end-to-end smoke test.
 *
 * Walks through the full connect → verify → expire → token-exchange → disconnect cycle
 * against a real dealer record and a real Facebook App.
 *
 * This tests the facebook-business-page provider (page posting scopes).
 * For the catalog/ads provider (meta-catalog-ads) a separate smoke test will be added
 * once the Facebook App has catalog_management + ads_management approved.
 *
 * Facebook does not issue standard refresh_tokens. Instead it supports exchanging a
 * short-lived access token for a long-lived one (60-day) via the fb_exchange_token grant.
 * The platform stores the short-lived token and uses fb_exchange_token on first refresh.
 *
 * Prerequisites:
 *   - META_APP_ID + META_APP_SECRET set in .env
 *   - OAUTH_REDIRECT_BASE_URL set (e.g. http://localhost:3000)
 *   - http://localhost:3000/api/oauth/callback in Facebook App → Valid OAuth Redirect URIs
 *   - Facebook App has permissions: pages_show_list, pages_read_engagement, pages_manage_posts
 *   - Your account added as App Tester (App Roles) if App is in Development mode
 *   - At least one dealer row in the DB (or pass --dealer-id=<id>)
 *   - Dev server running at OAUTH_REDIRECT_BASE_URL before you open the auth URL
 *
 * Usage:
 *   npm run smoke:meta-oauth
 *   npm run smoke:meta-oauth -- --dealer-id=<uuid>
 *   npm run smoke:meta-oauth -- --resume          (skip phases 1–2 after browser auth done)
 */

import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { prisma } from '../../lib/prisma.js';
import { buildApp } from '../../server/app.js';
import { CredentialStore } from '../../services/platform/clients/CredentialStore.js';
import { FacebookBusinessPageOAuthClient } from '../../services/platform/clients/providers/FacebookBusinessPageOAuthClient.js';
import type { PlatformAccountDetail } from '../../services/publishing/platformAccountService.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLATFORM_SLUG = 'facebook-business-page';
const PROVIDER      = 'facebook-business-page' as const;
const DEV_OP        = process.env['DEV_OPERATOR_ID'] ?? 'smoke-meta-oauth';
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS  = 5 * 60 * 1_000; // 5 minutes

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
  const resumeMode = hasFlag('resume');
  const rl = createInterface({ input, output });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  Facebook Business Page OAuth Smoke Test');
  if (resumeMode) console.log('  (resuming — skipping phases 1–2)');
  console.log('══════════════════════════════════════════════════════════');

  const appId     = process.env['META_APP_ID']     ?? process.env['META_CLIENT_ID']     ?? '';
  const appSecret = process.env['META_APP_SECRET'] ?? process.env['META_CLIENT_SECRET'] ?? '';
  const redirectBase = process.env['OAUTH_REDIRECT_BASE_URL'] ?? process.env['APP_BASE_URL'] ?? '';

  // ── Pre-flight ──────────────────────────────────────────────────────────────

  if (!resumeMode) {
    section('PHASE 1 · Pre-flight');

    assert(!!appId,     'META_APP_ID set',     'META_APP_ID missing',     appId ? `${preview(appId, 8)}…` : '');
    assert(!!appSecret, 'META_APP_SECRET set',  'META_APP_SECRET missing',  '');
    assert(!!redirectBase, 'OAUTH_REDIRECT_BASE_URL set', 'OAUTH_REDIRECT_BASE_URL missing', redirectBase);

    info('Facebook App must have these permissions (no approval needed in Dev mode):');
    info('  pages_show_list  pages_read_engagement  pages_manage_posts');
    info('Your account must be listed under App Roles → Testers (if app is in Development mode).');

    if (!appId || !appSecret) {
      console.log('\n  Set META_APP_ID and META_APP_SECRET in .env to proceed.\n');
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
  } else {
    if (!resumeMode) {
      const row = await prisma.dealershipProfile.findUnique({ where: { id: dealerId }, select: { legalName: true } });
      assert(!!row, 'Dealer found', 'Dealer not found', row?.legalName ?? dealerId);
      if (!row) { await prisma.$disconnect(); rl.close(); process.exit(1); }
    }
  }

  if (!resumeMode) {
    info(`Callback URL: ${redirectBase}/api/oauth/callback`);
    info('Ensure this URI is in Facebook App → Facebook Login → Valid OAuth Redirect URIs.');

    // Reset to a known state so the test is repeatable.
    // Upsert so the row exists even for newly-added platform profiles the dealer
    // was onboarded before — the callback's updateMany requires an existing row.
    await prisma.platformAccount.upsert({
      where: { dealershipId_platformSlug: { dealershipId: dealerId, platformSlug: PLATFORM_SLUG } },
      update: { state: 'ACCOUNT_NEEDED' },
      create: { dealershipId: dealerId, platformSlug: PLATFORM_SLUG, state: 'ACCOUNT_NEEDED' },
    });
    await prisma.platformOAuthToken.deleteMany({
      where: { dealershipId: dealerId, provider: PROVIDER },
    });
  }

  const app = buildApp(prisma);

  // ── Get authorization URL ───────────────────────────────────────────────────

  if (!resumeMode) {
    section('PHASE 2 · Get authorization URL');

    const connectRes = await app.inject({
      method: 'GET',
      url: `/api/dealers/${dealerId}/platforms/${PLATFORM_SLUG}/connect-url`,
      headers: { 'x-operator-id': DEV_OP },
    });

    if (connectRes.statusCode !== 200) {
      fail('connect-url returned 200', `got ${connectRes.statusCode}: ${connectRes.body}`);
      await prisma.$disconnect(); rl.close(); process.exit(1);
    }

    const { authUrl } = connectRes.json() as { authUrl: string; state: string };
    pass('connect-url returned 200', 'authUrl received');

    const redirectUriInUrl = new URL(authUrl).searchParams.get('redirect_uri') ?? '';
    const expectedCallbackUrl = `${redirectBase}/api/oauth/callback`;
    if (redirectUriInUrl !== expectedCallbackUrl) {
      fail(
        'redirect_uri matches expected callback',
        `\n       authUrl has:  ${redirectUriInUrl}\n       expected:     ${expectedCallbackUrl}\n       Fix OAUTH_REDIRECT_BASE_URL in .env — they must be identical.`
      );
      await prisma.$disconnect(); rl.close(); process.exit(1);
    }
    pass('redirect_uri matches expected callback', expectedCallbackUrl);

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
    console.log('  The callback will save your token automatically.');
    console.log('  (Authorization state expires in 10 minutes)\n');
    console.log('  NOTE: Facebook issues short-lived user tokens (~1hr). Phase 6 will');
    console.log('  attempt to exchange it for a long-lived token (60d) via fb_exchange_token.');
    console.log('  This exchange only works after you authorize and a token is saved.\n');

    try {
      await rl.question('  Press ENTER after completing authorization in the browser…');
    } catch {
      console.log('  (non-TTY — re-run with --resume once browser auth is done)\n');
      await prisma.$disconnect(); rl.close(); process.exit(0);
    }
  } // end !resumeMode phase 2

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
  info(`refresh_token: ${tokenRow.refreshToken
    ? `${preview(tokenRow.refreshToken, 16)} ✓`
    : '(none — Facebook short-lived token, refresh via fb_exchange_token using the access_token)'}`);
  info(`expires_at:    ${tokenRow.expiresAt?.toISOString() ?? 'null (no expiry in Facebook response)'}`);

  // ── Verify connected state ──────────────────────────────────────────────────

  section('PHASE 4 · Verify connected state via API');

  const accountsRes1 = await app.inject({
    method: 'GET',
    url: `/api/dealers/${dealerId}/accounts`,
    headers: { 'x-operator-id': DEV_OP },
  });

  const accounts1 = (accountsRes1.json() as { accounts: PlatformAccountDetail[] }).accounts;
  const acct1 = accounts1.find(a => a.platformSlug === PLATFORM_SLUG);

  assert(!!acct1, `${PLATFORM_SLUG} found in accounts`, `${PLATFORM_SLUG} not in accounts response`);
  assert(acct1?.oauthConnected === true,  'oauthConnected = true',  'oauthConnected is NOT true',  `got: ${String(acct1?.oauthConnected)}`);
  assert(acct1?.oauthExpired  === false,  'oauthExpired = false',   'oauthExpired is unexpectedly true');
  assert(acct1?.state === 'ACTIVE', 'state = ACTIVE', `state = ${acct1?.state} (not ACTIVE — callback may have failed)`);

  // ── Force expiry + verify expired ──────────────────────────────────────────

  section('PHASE 5 · Force expiry, then verify oauthExpired flag');

  await prisma.platformOAuthToken.updateMany({
    where: { dealershipId: dealerId, provider: PROVIDER },
    data:  { expiresAt: new Date(Date.now() - 10_000) },
  });
  pass('expiresAt forced to past in DB');

  const accountsRes2 = await app.inject({
    method: 'GET',
    url: `/api/dealers/${dealerId}/accounts`,
    headers: { 'x-operator-id': DEV_OP },
  });

  const accounts2 = (accountsRes2.json() as { accounts: PlatformAccountDetail[] }).accounts;
  const acct2 = accounts2.find(a => a.platformSlug === PLATFORM_SLUG);

  assert(acct2?.oauthExpired   === true,  'oauthExpired = true after force-expiry', 'oauthExpired not flipped to true');
  assert(acct2?.oauthConnected === false, 'oauthConnected = false (expired ≠ connected)', 'oauthConnected still true after expiry');

  // ── Long-lived token exchange ───────────────────────────────────────────────

  section('PHASE 6 · Long-lived token exchange via CredentialStore.withFreshToken');

  info('Facebook does not issue a refresh_token. Instead, withFreshToken calls');
  info('refreshAccessToken which uses fb_exchange_token to get a 60-day token.');
  info('CredentialStore.withFreshToken will use the stored accessToken as the fb_exchange_token.');

  // To use withFreshToken on a Facebook token we need a refreshToken in the row.
  // Facebook's token exchange works differently: the "refresh" input is the short-lived
  // access token itself. Temporarily copy accessToken → refreshToken so withFreshToken
  // can drive the exchange through the standard path.
  const currentToken = await prisma.platformOAuthToken.findUnique({
    where: { dealershipId_provider: { dealershipId: dealerId!, provider: PROVIDER } },
  });

  if (!currentToken) {
    fail('Token row still present for exchange test', 'token disappeared unexpectedly');
  } else {
    // Seed refreshToken with the original access token if it's absent (Facebook flow).
    if (!currentToken.refreshToken) {
      await prisma.platformOAuthToken.update({
        where: { dealershipId_provider: { dealershipId: dealerId!, provider: PROVIDER } },
        data: { refreshToken: currentToken.accessToken },
      });
      info('Seeded refreshToken ← accessToken for fb_exchange_token call');
    }

    const fbClient = new FacebookBusinessPageOAuthClient();
    let newAccessToken: string | undefined;

    try {
      newAccessToken = await CredentialStore.withFreshToken(prisma, dealerId!, PROVIDER, fbClient);
      pass('withFreshToken returned a new access token', `${preview(newAccessToken, 16)}`);
    } catch (err: unknown) {
      fail('withFreshToken succeeded', err instanceof Error ? err.message : String(err));
    }

    if (newAccessToken) {
      const refreshed = await prisma.platformOAuthToken.findUnique({
        where: { dealershipId_provider: { dealershipId: dealerId!, provider: PROVIDER } },
      });
      const isNowFuture = !!refreshed?.expiresAt && refreshed.expiresAt.getTime() > Date.now();
      assert(isNowFuture, 'expiresAt updated to future after long-lived exchange', 'expiresAt still in past after exchange',
        refreshed?.expiresAt?.toISOString() ?? 'null');

      const accountsRes3 = await app.inject({
        method: 'GET',
        url: `/api/dealers/${dealerId}/accounts`,
        headers: { 'x-operator-id': DEV_OP },
      });
      const acct3 = (accountsRes3.json() as { accounts: PlatformAccountDetail[] }).accounts
        .find(a => a.platformSlug === PLATFORM_SLUG);
      assert(acct3?.oauthConnected === true,  'oauthConnected = true after exchange', 'oauthConnected still false after exchange');
      assert(acct3?.oauthExpired   === false, 'oauthExpired = false after exchange',  'oauthExpired still true after exchange');
    }
  }

  // ── Disconnect ──────────────────────────────────────────────────────────────

  section('PHASE 7 · Disconnect (DELETE oauth-token)');

  const deleteRes = await app.inject({
    method: 'DELETE',
    url:    `/api/dealers/${dealerId}/platforms/${PLATFORM_SLUG}/oauth-token`,
    headers: { 'x-operator-id': DEV_OP },
  });

  assert(deleteRes.statusCode === 204, `DELETE returned 204`, `DELETE returned ${deleteRes.statusCode}`, deleteRes.body || '');

  const deletedRow = await prisma.platformOAuthToken.findUnique({
    where: { dealershipId_provider: { dealershipId: dealerId!, provider: PROVIDER } },
  });
  assert(deletedRow === null, 'Token row deleted from DB', 'Token row still exists after DELETE');

  const accountsRes4 = await app.inject({
    method: 'GET',
    url: `/api/dealers/${dealerId}/accounts`,
    headers: { 'x-operator-id': DEV_OP },
  });
  const acct4 = (accountsRes4.json() as { accounts: PlatformAccountDetail[] }).accounts
    .find(a => a.platformSlug === PLATFORM_SLUG);

  assert(acct4?.oauthConnected === false, 'oauthConnected = false after disconnect', 'oauthConnected still true after disconnect');
  assert(acct4?.oauthExpired   === false, 'oauthExpired = false after disconnect',   'oauthExpired still true after disconnect');

  // ── Summary ─────────────────────────────────────────────────────────────────

  console.log(`\n${'═'.repeat(60)}`);
  if (failures === 0) {
    console.log('  ✅  All checks passed — Facebook Business Page OAuth is healthy');
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
