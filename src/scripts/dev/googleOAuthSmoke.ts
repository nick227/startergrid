/**
 * Google OAuth end-to-end smoke test.
 *
 * Walks through the full connect → verify → expire → refresh → disconnect cycle
 * against a real dealer record and a real Google OAuth app.
 *
 * Prerequisites:
 *   - GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET set in .env
 *   - OAUTH_REDIRECT_BASE_URL set (e.g. http://localhost:3000)
 *   - http://localhost:3000/api/oauth/callback registered in Google Console
 *   - At least one dealer row in the DB (or pass --dealer-id=<id>)
 *   - Dev server running at OAUTH_REDIRECT_BASE_URL before you open the auth URL
 *
 * Usage:
 *   npm run smoke:google-oauth
 *   npm run smoke:google-oauth -- --dealer-id=<uuid>
 */

import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { prisma } from '../../lib/prisma.js';
import { buildApp } from '../../server/app.js';
import { CredentialStore } from '../../services/platform/clients/CredentialStore.js';
import { GoogleOAuthClient } from '../../services/platform/clients/providers/GoogleOAuthClient.js';
import type { PlatformAccountDetail } from '../../services/publishing/platformAccountService.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEV_OP = process.env['DEV_OPERATOR_ID'] ?? 'smoke-google-oauth';
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
  console.log('  Google OAuth Smoke Test');
  if (resumeMode) console.log('  (resuming — skipping phases 1–2)');
  console.log('══════════════════════════════════════════════════════════');

  const clientId     = process.env['GOOGLE_CLIENT_ID']    ?? '';
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET'] ?? '';
  const redirectBase = process.env['OAUTH_REDIRECT_BASE_URL'] ?? process.env['APP_BASE_URL'] ?? '';

  // ── Pre-flight ──────────────────────────────────────────────────────────────

  if (!resumeMode) {
    section('PHASE 1 · Pre-flight');

    assert(!!clientId,     'GOOGLE_CLIENT_ID set',    'GOOGLE_CLIENT_ID missing',    clientId ? `${preview(clientId, 8)}…` : '');
    assert(!!clientSecret, 'GOOGLE_CLIENT_SECRET set', 'GOOGLE_CLIENT_SECRET missing', '');
    assert(!!redirectBase, 'OAUTH_REDIRECT_BASE_URL set', 'OAUTH_REDIRECT_BASE_URL missing', redirectBase);

    if (!clientId || !clientSecret) {
      console.log('\n  Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to proceed.\n');
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
    info('Ensure this URI is registered in your Google Cloud Console OAuth app.');
  }

  if (!resumeMode) {
    // Reset account state and clear any leftover token so the test is
    // repeatable regardless of what state prior runs left behind.
    await prisma.platformAccount.updateMany({
      where: { dealershipId: dealerId, platformSlug: 'google-vehicle-ads' },
      data: { state: 'ACCOUNT_NEEDED' },
    });
    await prisma.platformOAuthToken.deleteMany({
      where: { dealershipId: dealerId, provider: 'google' },
    });
  }

  const app = buildApp(prisma);

  // ── Get authorization URL ───────────────────────────────────────────────────

  if (!resumeMode) {
    section('PHASE 2 · Get authorization URL');

    const connectRes = await app.inject({
      method: 'GET',
      url: `/api/dealers/${dealerId}/platforms/google-vehicle-ads/connect-url`,
      headers: { 'x-operator-id': DEV_OP },
    });

    if (connectRes.statusCode !== 200) {
      fail('connect-url returned 200', `got ${connectRes.statusCode}: ${connectRes.body}`);
      await prisma.$disconnect(); rl.close(); process.exit(1);
    }

    const { authUrl } = connectRes.json() as { authUrl: string; state: string };
    pass('connect-url returned 200', 'authUrl received');

    // Fail fast if the redirect_uri baked into the authUrl doesn't match what we
    // told the user to register in Google Console. A mismatch here causes a
    // redirect_uri_mismatch error from Google before any token exchange happens.
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

    // In a non-TTY environment readline.question throws. Exit cleanly with
    // instructions — the user re-runs with --resume after completing the auth.
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
    'PlatformOAuthToken (provider=google)',
    () => prisma.platformOAuthToken.findUnique({
      where: { dealershipId_provider: { dealershipId: dealerId!, provider: 'google' } },
    }),
  );

  pass('Token row exists in DB');
  info(`access_token:  ${preview(tokenRow.accessToken, 16)}`);
  info(`refresh_token: ${tokenRow.refreshToken ? `${preview(tokenRow.refreshToken, 16)} ✓` : '(none — Google may not have returned one)'}`);
  info(`expires_at:    ${tokenRow.expiresAt?.toISOString() ?? 'null (no expiry)'}`);

  // ── Verify connected state ──────────────────────────────────────────────────

  section('PHASE 4 · Verify connected state via API');

  const accountsRes1 = await app.inject({
    method: 'GET',
    url: `/api/dealers/${dealerId}/accounts`,
    headers: { 'x-operator-id': DEV_OP },
  });

  const accounts1 = (accountsRes1.json() as { accounts: PlatformAccountDetail[] }).accounts;
  const gva1 = accounts1.find(a => a.platformSlug === 'google-vehicle-ads');

  assert(!!gva1, 'google-vehicle-ads found in accounts', 'google-vehicle-ads not in accounts response');
  assert(gva1?.oauthConnected === true,  'oauthConnected = true',  'oauthConnected is NOT true',  `got: ${String(gva1?.oauthConnected)}`);
  assert(gva1?.oauthExpired  === false,  'oauthExpired = false',   'oauthExpired is unexpectedly true');
  assert(gva1?.state === 'ACTIVE', 'state = ACTIVE', `state = ${gva1?.state} (not ACTIVE — callback may have failed)`);

  // ── Force expiry + verify expired ──────────────────────────────────────────

  section('PHASE 5 · Force expiry, then verify oauthExpired flag');

  await prisma.platformOAuthToken.updateMany({
    where: { dealershipId: dealerId, provider: 'google' },
    data:  { expiresAt: new Date(Date.now() - 10_000) }, // 10 s in the past
  });
  pass('expiresAt forced to past in DB');

  const accountsRes2 = await app.inject({
    method: 'GET',
    url: `/api/dealers/${dealerId}/accounts`,
    headers: { 'x-operator-id': DEV_OP },
  });

  const accounts2 = (accountsRes2.json() as { accounts: PlatformAccountDetail[] }).accounts;
  const gva2 = accounts2.find(a => a.platformSlug === 'google-vehicle-ads');

  assert(gva2?.oauthExpired   === true,  'oauthExpired = true after force-expiry', 'oauthExpired not flipped to true');
  assert(gva2?.oauthConnected === false, 'oauthConnected = false (expired ≠ connected)', 'oauthConnected still true after expiry');

  // ── Refresh token ───────────────────────────────────────────────────────────

  section('PHASE 6 · Refresh expired token via CredentialStore.withFreshToken');

  const googleClient = new GoogleOAuthClient();

  if (!tokenRow.refreshToken) {
    info('Google did not return a refresh_token — skipping refresh phase.');
    info('Re-authorize with prompt=consent (already set) to obtain a refresh_token.');
    fail('refresh_token available', 'no refresh_token — cannot test refresh path');
  } else {
    let newAccessToken: string | undefined;
    try {
      newAccessToken = await CredentialStore.withFreshToken(prisma, dealerId, 'google', googleClient);
      pass('withFreshToken returned a new access token', `${preview(newAccessToken, 16)}`);
    } catch (err: unknown) {
      fail('withFreshToken succeeded', err instanceof Error ? err.message : String(err));
    }

    if (newAccessToken) {
      const refreshed = await prisma.platformOAuthToken.findUnique({
        where: { dealershipId_provider: { dealershipId: dealerId, provider: 'google' } },
      });
      const isNowFuture = !!refreshed?.expiresAt && refreshed.expiresAt.getTime() > Date.now();
      assert(isNowFuture, 'expiresAt updated to future after refresh', 'expiresAt still in past after refresh',
        refreshed?.expiresAt?.toISOString() ?? 'null');

      const accountsRes3 = await app.inject({
        method: 'GET',
        url: `/api/dealers/${dealerId}/accounts`,
        headers: { 'x-operator-id': DEV_OP },
      });
      const gva3 = (accountsRes3.json() as { accounts: PlatformAccountDetail[] }).accounts
        .find(a => a.platformSlug === 'google-vehicle-ads');
      assert(gva3?.oauthConnected === true,  'oauthConnected = true after refresh', 'oauthConnected still false after refresh');
      assert(gva3?.oauthExpired   === false, 'oauthExpired = false after refresh',  'oauthExpired still true after refresh');
    }
  }

  // ── Disconnect ──────────────────────────────────────────────────────────────

  section('PHASE 7 · Disconnect (DELETE oauth-token)');

  const deleteRes = await app.inject({
    method: 'DELETE',
    url:    `/api/dealers/${dealerId}/platforms/google-vehicle-ads/oauth-token`,
    headers: { 'x-operator-id': DEV_OP },
  });

  assert(deleteRes.statusCode === 204, `DELETE returned 204`, `DELETE returned ${deleteRes.statusCode}`, deleteRes.body || '');

  const deletedRow = await prisma.platformOAuthToken.findUnique({
    where: { dealershipId_provider: { dealershipId: dealerId, provider: 'google' } },
  });
  assert(deletedRow === null, 'Token row deleted from DB', 'Token row still exists after DELETE');

  const accountsRes4 = await app.inject({
    method: 'GET',
    url: `/api/dealers/${dealerId}/accounts`,
    headers: { 'x-operator-id': DEV_OP },
  });
  const gva4 = (accountsRes4.json() as { accounts: PlatformAccountDetail[] }).accounts
    .find(a => a.platformSlug === 'google-vehicle-ads');

  assert(gva4?.oauthConnected === false, 'oauthConnected = false after disconnect', 'oauthConnected still true after disconnect');
  assert(gva4?.oauthExpired   === false, 'oauthExpired = false after disconnect',   'oauthExpired still true after disconnect');

  // ── Summary ─────────────────────────────────────────────────────────────────

  const totalChecks = /* count assertions */ 15 + (tokenRow.refreshToken ? 4 : 0);
  console.log(`\n${'═'.repeat(60)}`);
  if (failures === 0) {
    console.log('  ✅  All checks passed — Google OAuth end-to-end is healthy');
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
