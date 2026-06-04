import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { PrismaClient, Prisma } from '@prisma/client';
import type { FeedArtifact } from '../lib/types.js';

const EXPORTS_DIR = process.env['FEED_EXPORTS_DIR'] ?? './exports';

export function computeChecksum(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function writeAndRegisterArtifact(
  prisma: PrismaClient,
  dealershipId: string,
  artifact: FeedArtifact,
  options?: {
    linkedRunId?: string;
    linkedSubmissionId?: string;
    environment?: 'MOCK' | 'SANDBOX' | 'PRODUCTION';
    expiresAt?: Date;
  }
): Promise<{ artifactId: string; storagePath: string; checksum: string }> {
  const checksum = computeChecksum(artifact.content);
  const dir = path.join(EXPORTS_DIR, artifact.platformSlug);
  await fs.mkdir(dir, { recursive: true });
  const storagePath = path.join(dir, artifact.filename);
  await fs.writeFile(storagePath, artifact.content, 'utf8');
  const sizeBytes = Buffer.byteLength(artifact.content, 'utf8');

  const row = await prisma.generatedArtifact.create({
    data: {
      dealershipId,
      platformSlug: artifact.platformSlug,
      format: artifact.format,
      filename: artifact.filename,
      storagePath,
      checksum,
      sizeBytes,
      environment: options?.environment ?? 'MOCK',
      linkedRunId: options?.linkedRunId ?? null,
      linkedSubmissionId: options?.linkedSubmissionId ?? null,
      expiresAt: options?.expiresAt ?? null
    }
  });

  return { artifactId: row.id, storagePath, checksum };
}

export async function verifyArtifact(storagePath: string, expectedChecksum: string): Promise<boolean> {
  try {
    const content = await fs.readFile(storagePath, 'utf8');
    return computeChecksum(content) === expectedChecksum;
  } catch {
    return false;
  }
}
