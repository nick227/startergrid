import 'dotenv/config';
import path from 'node:path';
import { prisma } from '../../lib/prisma.js';
import { exportProofFolderZip } from '../../services/commercial/proofFolderService.js';

async function main() {
  const args = process.argv.slice(2);
  const dealershipId = args[0];
  if (!dealershipId) {
    console.error('Usage: dealerProof <dealershipId> [--output <path>]');
    process.exit(1);
  }
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx >= 0
    ? args[outputIdx + 1]
    : path.join('./exports', `proof-${dealershipId}-${Date.now()}.zip`);

  console.log(`\nBuilding proof folder for ${dealershipId}...`);

  const { zipPath, manifest } = await exportProofFolderZip(prisma, dealershipId, outputPath);

  console.log(`\nDealer: ${manifest.dealerName}`);
  console.log(`Generated: ${manifest.generatedAt}`);
  if (manifest.readinessRunId) {
    console.log(`Readiness run: ${manifest.readinessRunId}  (${manifest.overallStatus})`);
  }
  console.log(`\nArtifacts (${manifest.artifacts.length}):`);
  for (const a of manifest.artifacts) {
    console.log(`  ${a.platformSlug}/${a.filename}  [${a.checksum.slice(0, 12)}…]  ${a.sizeBytes}B`);
  }
  console.log(`\nLeads: ${manifest.leadCount}`);
  console.log(`Active platforms: ${manifest.activePlatformCount}`);
  console.log(`\nZIP: ${zipPath}`);

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
