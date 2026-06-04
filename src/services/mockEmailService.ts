import fs from 'node:fs/promises';
import path from 'node:path';

export async function writeMockEmail(options: {
  outboxDir?: string;
  to: string;
  subject: string;
  body: string;
  payload: unknown;
}) {
  const outboxDir = options.outboxDir ?? process.env.MOCK_OUTBOX_DIR ?? './mock-outbox';
  await fs.mkdir(outboxDir, { recursive: true });
  const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-${options.subject.replace(/[^a-z0-9]+/gi, '-').slice(0, 60)}.json`;
  const fullPath = path.join(outboxDir, filename);
  await fs.writeFile(fullPath, JSON.stringify({ ...options, createdAt: new Date().toISOString() }, null, 2));
  return fullPath;
}
