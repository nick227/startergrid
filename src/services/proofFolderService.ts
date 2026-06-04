import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import type { PrismaClient } from '@prisma/client';

export type ProofFolderManifest = {
  dealershipId: string;
  dealerName: string;
  generatedAt: string;
  readinessRunId: string | null;
  overallStatus: string | null;
  artifacts: Array<{
    artifactId: string;
    platformSlug: string;
    format: string;
    filename: string;
    storagePath: string;
    checksum: string;
    sizeBytes: number;
    environment: string;
    createdAt: string;
  }>;
  leadCount: number;
  activePlatformCount: number;
};

export async function buildProofFolderManifest(
  prisma: PrismaClient,
  dealershipId: string,
  linkedRunId?: string
): Promise<ProofFolderManifest> {
  const dealership = await prisma.dealershipProfile.findUniqueOrThrow({
    where: { id: dealershipId }
  });

  const artifactRows = await prisma.generatedArtifact.findMany({
    where: {
      dealershipId,
      ...(linkedRunId ? { linkedRunId } : {})
    },
    orderBy: { createdAt: 'asc' }
  });

  const run = linkedRunId
    ? await prisma.readinessRun.findUnique({ where: { id: linkedRunId } })
    : await prisma.readinessRun.findFirst({
        where: { dealershipId },
        orderBy: { createdAt: 'desc' }
      });

  const leadCount = await prisma.lead.count({ where: { dealershipId } });
  const activePlatformCount = await prisma.platformApplication.count({
    where: { dealershipId, status: 'ACTIVE' }
  });

  return {
    dealershipId,
    dealerName: dealership.legalName,
    generatedAt: new Date().toISOString(),
    readinessRunId: run?.id ?? null,
    overallStatus: run?.overallStatus ?? null,
    artifacts: artifactRows.map(a => ({
      artifactId: a.id,
      platformSlug: a.platformSlug,
      format: a.format,
      filename: a.filename,
      storagePath: a.storagePath,
      checksum: a.checksum,
      sizeBytes: a.sizeBytes,
      environment: a.environment,
      createdAt: a.createdAt.toISOString()
    })),
    leadCount,
    activePlatformCount
  };
}

export async function exportProofFolderZip(
  prisma: PrismaClient,
  dealershipId: string,
  outputPath: string,
  linkedRunId?: string
): Promise<{ zipPath: string; manifest: ProofFolderManifest }> {
  const manifest = await buildProofFolderManifest(prisma, dealershipId, linkedRunId);
  const zip = new JSZip();

  for (const artifact of manifest.artifacts) {
    try {
      const content = await fs.readFile(artifact.storagePath, 'utf8');
      zip.file(path.join(artifact.platformSlug, artifact.filename), content);
    } catch {
      // skip missing artifact files gracefully
    }
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, zipBuffer);

  return { zipPath: outputPath, manifest };
}
