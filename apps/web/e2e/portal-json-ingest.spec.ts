import { test, expect, type APIRequestContext } from '@playwright/test';
import { snapshotDryRunJson } from './fixtures/jsonIngest.ts';

const OPERATOR_HEADERS = { 'x-operator-id': 'dev-operator' };

async function requireDemoDealer(request: APIRequestContext): Promise<string | null> {
  const res = await request.get('http://localhost:3000/api/dealers', {
    headers: OPERATOR_HEADERS,
  });
  if (!res.ok()) return null;

  const body = await res.json() as { dealers?: Array<{ id: string; legalName: string }> };
  const dealer = body.dealers?.find(d => d.legalName.includes('Prairie Ridge'));
  return dealer?.id ?? body.dealers?.[0]?.id ?? null;
}

async function openJsonIngestPanel(page: import('@playwright/test').Page, dealerId: string) {
  await page.goto(`/#/${dealerId}/inventory`);
  await page.getByTestId('json-ingest-toggle').click();
  await expect(page.getByTestId('json-ingest-textarea')).toBeVisible();
}

let demoDealerId: string | null = null;

test.describe('Portal JSON ingest', () => {
  test.beforeAll(async ({ request }) => {
    demoDealerId = await requireDemoDealer(request);
  });

  test.beforeEach(({}, testInfo) => {
    if (!demoDealerId) {
      testInfo.skip(true, 'No demo dealer — run npm run demo:reset with API + DB available');
    }
  });

  test('shows client-side errors for invalid and empty payloads', async ({ page }) => {
    await openJsonIngestPanel(page, demoDealerId!);

    await page.getByTestId('json-ingest-textarea').fill('{ broken json');
    await page.getByTestId('json-ingest-submit').click();
    await expect(page.getByTestId('json-ingest-parse-error')).toContainText('Invalid JSON');

    await page.getByTestId('json-ingest-textarea').fill('{"vehicles":[]}');
    await page.getByTestId('json-ingest-submit').click();
    await expect(page.getByTestId('json-ingest-parse-error')).toContainText('empty');
  });

  test('snapshot dry-run surfaces missing-from-feed candidates', async ({ page }) => {
    await openJsonIngestPanel(page, demoDealerId!);

    await page.getByTestId('json-ingest-snapshot').check();
    await page.getByTestId('json-ingest-textarea').fill(snapshotDryRunJson());
    await page.getByTestId('json-ingest-submit').click();

    await expect(page.getByTestId('json-ingest-outcome')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('json-ingest-outcome')).toContainText('COMMITTED');

    const ingestReview = page.getByTestId('json-ingest-outcome').getByTestId('snapshot-review-card');
    await expect(ingestReview).toBeVisible();
    await expect(ingestReview).toContainText('missing from latest feed');
    await expect(ingestReview.getByText('PRM-24002')).toBeVisible();
    await expect(ingestReview.getByText('PRM-24003')).toBeVisible();
  });

  test('panel remains usable on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openJsonIngestPanel(page, demoDealerId!);

    const textarea = page.getByTestId('json-ingest-textarea');
    await expect(textarea).toBeVisible();
    const box = await textarea.boundingBox();
    expect(box?.width ?? 0).toBeLessThanOrEqual(375);

    await page.getByTestId('json-ingest-snapshot').check();
    await expect(page.getByTestId('json-ingest-submit')).toBeVisible();
    await expect(page.getByTestId('json-ingest-submit')).toContainText('snapshot dry-run');
  });
});
