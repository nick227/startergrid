import fs from 'node:fs/promises';
import path from 'node:path';
import type { PlatformReadinessReport } from '../lib/types.js';

export async function writeMockReceipt(options: {
  receiptDir?: string;
  platformSlug: string;
  authorizationKey: string;
  report: PlatformReadinessReport;
  packet: unknown;
}) {
  const receiptDir = options.receiptDir ?? process.env.MOCK_RECEIPT_DIR ?? './mock-platform-receipts';
  await fs.mkdir(receiptDir, { recursive: true });
  const receipt = {
    platformSlug: options.platformSlug,
    authorizationKey: options.authorizationKey,
    accepted: options.report.readiness === 'GREEN',
    status: options.report.readiness,
    receiptCode: options.report.receiptCode,
    mockEndpoint: options.report.mockEndpoint,
    checkedAt: new Date().toISOString(),
    generatedOutputs: options.report.generatedOutputs,
    issues: options.report.issues,
    packet: options.packet
  };
  const filename = `${options.platformSlug}-${options.report.receiptCode.toLowerCase()}.json`;
  const fullPath = path.join(receiptDir, filename);
  await fs.writeFile(fullPath, JSON.stringify(receipt, null, 2));
  return { fullPath, receipt };
}
