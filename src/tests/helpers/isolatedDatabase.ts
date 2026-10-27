/**
 * Database integration tests run only against a disposable `startergrid_v5_test_*` schema
 * named in V5_TEST_DATABASE_URL, never the DATABASE_URL a developer's .env points at.
 * Without it they skip, unless REQUIRE_DATABASE_TESTS=true (CI), where skipping would hide them.
 */
export function isolatedDatabaseUrl(env: Record<string, string | undefined> = process.env): string | undefined {
  const url = env['V5_TEST_DATABASE_URL'];
  if (!url) {
    if (env['REQUIRE_DATABASE_TESTS'] === 'true') throw new Error('REQUIRE_DATABASE_TESTS is set but V5_TEST_DATABASE_URL is missing.');
    return undefined;
  }
  if (!new URL(url).pathname.startsWith('/startergrid_v5_test_')) {
    throw new Error('V5_TEST_DATABASE_URL must name an isolated startergrid_v5_test_* database.');
  }
  return url;
}
