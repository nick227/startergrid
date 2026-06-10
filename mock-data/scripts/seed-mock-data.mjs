#!/usr/bin/env node
/**
 * Seed mock dealer-distribution data from ./mock-data/*.json.
 *
 * Usage:
 *   node scripts/seed-mock-data.mjs
 *   MOCK_DATA_DIR=./mock-data node scripts/seed-mock-data.mjs
 *   DRY_RUN=1 node scripts/seed-mock-data.mjs
 *
 * This script is intentionally schema-tolerant:
 * - It tries common Prisma model names for each JSON file.
 * - It uses upsert when records have `id`, otherwise createMany.
 * - If your model names/fields differ, edit MODEL_MAP below.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

let PrismaClient;
try {
  ({ PrismaClient } = await import("@prisma/client"));
} catch (error) {
  console.error("Could not import @prisma/client. Run npm install and prisma generate first.");
  console.error(error.message);
  process.exit(1);
}

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.resolve(process.env.MOCK_DATA_DIR || path.join(root, "mock-data"));
const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

const MODEL_MAP = {
  "dealers.json": ["dealer", "dealership", "organization"],
  "platformProfiles.json": ["platformProfile", "platformProfileSeed"],
  "vehicles.json": ["vehicle", "inventoryVehicle"],
  "vehiclePhotos.json": ["vehiclePhoto", "asset", "mediaAsset"],
  "categoryItems.json": ["categoryItem", "vehicle", "inventoryItem"],
  "oauthAccounts.json": ["oauthAccount", "platformCredential", "connectedAccount"],
  "socialDestinations.json": ["socialDestination", "socialPageAccount", "platformDestination"],
  "catalogAccounts.json": ["catalogAccount", "platformCatalogAccount"],
  "partnerFeedSetups.json": ["partnerFeedSetup", "platformSetup"],
  "syncRuns.json": ["syncRun"],
  "syncEvents.json": ["syncEvent"],
  "validationErrors.json": ["validationError", "inventoryValidationError"],
  "marketplaceListings.json": ["marketplaceListing"],
  "queueItems.json": ["publishQueueItem", "queueItem"],
  "performanceMetrics.json": ["platformPerformanceMetric", "channelMetric", "performanceMetric"],
  "leadEvents.json": ["leadEvent", "marketplaceLead"],
  "priceChanges.json": ["priceChange", "vehiclePriceChange"],
  "soldEvents.json": ["soldEvent", "vehicleSoldEvent"],
  "notifications.json": ["notification", "operatorNotification"],
  "users.json": ["user", "operatorUser"]
};

const LOAD_ORDER = [
  "dealers.json",
  "users.json",
  "platformProfiles.json",
  "vehicles.json",
  "vehiclePhotos.json",
  "categoryItems.json",
  "oauthAccounts.json",
  "socialDestinations.json",
  "catalogAccounts.json",
  "partnerFeedSetups.json",
  "marketplaceListings.json",
  "syncRuns.json",
  "syncEvents.json",
  "validationErrors.json",
  "queueItems.json",
  "performanceMetrics.json",
  "leadEvents.json",
  "priceChanges.json",
  "soldEvents.json",
  "notifications.json"
];

function delegateFor(fileName) {
  for (const modelName of MODEL_MAP[fileName] || []) {
    if (prisma[modelName]) return { modelName, delegate: prisma[modelName] };
  }
  return null;
}

async function readJson(fileName) {
  const filePath = path.join(dataDir, fileName);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function insertRecords(fileName, records) {
  const found = delegateFor(fileName);
  if (!found) {
    console.warn(`SKIP ${fileName}: no matching Prisma model found. Tried: ${(MODEL_MAP[fileName] || []).join(", ")}`);
    return { fileName, modelName: null, count: 0, skipped: true };
  }

  const { modelName, delegate } = found;
  console.log(`${dryRun ? "DRY" : "SEED"} ${fileName} -> prisma.${modelName} (${records.length})`);

  if (dryRun || records.length === 0) {
    return { fileName, modelName, count: records.length, skipped: false };
  }

  let inserted = 0;

  for (const record of records) {
    try {
      if (record.id && delegate.upsert) {
        await delegate.upsert({
          where: { id: record.id },
          create: record,
          update: record
        });
      } else if (delegate.create) {
        await delegate.create({ data: record });
      }
      inserted++;
    } catch (error) {
      console.error(`FAILED ${fileName} -> ${modelName} id=${record.id || "(none)"}`);
      console.error(error.message);
      throw error;
    }
  }

  return { fileName, modelName, count: inserted, skipped: false };
}

async function main() {
  console.log(`Mock data dir: ${dataDir}`);
  const summary = [];

  for (const fileName of LOAD_ORDER) {
    try {
      const records = await readJson(fileName);
      summary.push(await insertRecords(fileName, Array.isArray(records) ? records : [records]));
    } catch (error) {
      if (error.code === "ENOENT") {
        console.warn(`SKIP ${fileName}: file not found`);
        continue;
      }
      throw error;
    }
  }

  console.log("\nSeed summary:");
  for (const row of summary) {
    console.log(`- ${row.fileName}: ${row.skipped ? "skipped" : row.count} ${row.modelName ? `(${row.modelName})` : ""}`);
  }
}

main()
  .catch((error) => {
    console.error("\nSeed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
