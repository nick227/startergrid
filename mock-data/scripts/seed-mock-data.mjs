#!/usr/bin/env node
/**
 * Schema-aware mock seed for the dealer distribution platform.
 *
 * Usage:
 *   node scripts/seed-mock-data.mjs
 *   DRY_RUN=1 node scripts/seed-mock-data.mjs
 *   CLEAR_MOCK=1 node scripts/seed-mock-data.mjs
 *
 * Notes:
 * - This script is intentionally id-based and upsert-heavy.
 * - It targets the Prisma schema shared in the conversation on 2026-06-10.
 * - If your local Prisma model names differ, adjust SEED_PLAN below.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "mock-data");

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const CLEAR_MOCK = process.env.CLEAR_MOCK === "1" || process.env.CLEAR_MOCK === "true";

const prisma = new PrismaClient();

const SEED_PLAN = [
  ["operatorAccount", "operatorAccounts.json"],
  ["dealershipProfile", "dealershipProfiles.json"],
  ["operatorDealerAccess", "operatorDealerAccess.json"],
  ["dealerSubscription", "dealerSubscriptions.json"],
  ["platformProfile", "platformProfiles.json"],
  ["vehicle", "vehicles.json"],
  ["vehicleMedia", "vehicleMedia.json"],
  ["platformApplication", "platformApplications.json"],
  ["platformAccount", "platformAccounts.json"],
  ["syncPolicy", "syncPolicies.json"],
  ["platformOAuthToken", "platformOAuthTokens.json"],
  ["socialPageAccount", "socialPageAccounts.json"],
  ["socialPost", "socialPosts.json"],
  ["platformCatalogSync", "platformCatalogSyncs.json"],
  ["marketplaceListing", "marketplaceListings.json"],
  ["lead", "leads.json"],
  ["channelEvent", "channelEvents.json"],
  ["syncRun", "syncRuns.json"],
  ["syncEvent", "syncEvents.json"],
  ["publishQueueItem", "publishQueueItems.json"],
  ["vehicleUpdate", "vehicleUpdates.json"],
  ["vehicleLifecycleEvent", "vehicleLifecycleEvents.json"],
  ["inventorySource", "inventorySources.json"],
  ["ingressRun", "ingressRuns.json"],
  ["vehiclePerformanceCache", "vehiclePerformanceCaches.json"],
  ["platformPerformanceSummary", "platformPerformanceSummaries.json"],
  ["dealerNotification", "dealerNotifications.json"],
  ["adminAuditLog", "adminAuditLogs.json"],
];

const CLEAR_ORDER = [...SEED_PLAN].reverse();

function convertDates(value) {
  if (Array.isArray(value)) return value.map(convertDates);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === "string" && (key.endsWith("At") || key.endsWith("From") || key.endsWith("To") || key === "expiresAt" || key === "scheduledFor" || key === "receivedAt" || key === "completedAt" || key === "statusChangedAt" || key === "occurredAt" || key === "firstListedAt" || key === "listedAt" || key === "endedAt")) {
        out[key] = val ? new Date(val) : null;
      } else {
        out[key] = convertDates(val);
      }
    }
    return out;
  }
  return value;
}

async function readJson(filename) {
  const raw = await fs.readFile(path.join(DATA_DIR, filename), "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, "")).map(convertDates);
}

async function clearMockRows() {
  console.log("CLEAR_MOCK enabled: deleting seeded rows by id prefix...");
  for (const [modelName] of CLEAR_ORDER) {
    const model = prisma[modelName];
    if (!model) {
      console.warn(`skip clear: prisma.${modelName} not found`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`[dry] clear ${modelName}`);
      continue;
    }
    try {
      await model.deleteMany({
        where: {
          OR: [
            { id: { startsWith: "dealer_" } },
            { id: { startsWith: "veh_" } },
            { id: { startsWith: "media_" } },
            { id: { startsWith: "platform_" } },
            { id: { startsWith: "app_" } },
            { id: { startsWith: "acct_" } },
            { id: { startsWith: "policy_" } },
            { id: { startsWith: "oauth_" } },
            { id: { startsWith: "social_" } },
            { id: { startsWith: "spost_" } },
            { id: { startsWith: "catalog_" } },
            { id: { startsWith: "mlist_" } },
            { id: { startsWith: "lead_" } },
            { id: { startsWith: "chev_" } },
            { id: { startsWith: "sync_run_" } },
            { id: { startsWith: "syncev_" } },
            { id: { startsWith: "queue_" } },
            { id: { startsWith: "upd_" } },
            { id: { startsWith: "life_" } },
            { id: { startsWith: "src_" } },
            { id: { startsWith: "ingress_" } },
            { id: { startsWith: "perf_" } },
            { id: { startsWith: "pperf_" } },
            { id: { startsWith: "notif_" } },
            { id: { startsWith: "audit_" } },
            { id: { startsWith: "sub_" } },
            { id: { startsWith: "op_" } },
            { id: { startsWith: "access_" } },
          ],
        },
      });
      console.log(`cleared ${modelName}`);
    } catch (err) {
      // Some Prisma connectors/models may reject OR branches if the model lacks id, but these models all have id in the target schema.
      console.warn(`clear warning for ${modelName}: ${err.message}`);
    }
  }
}

async function upsertRows(modelName, rows) {
  const model = prisma[modelName];
  if (!model) {
    console.warn(`skip: prisma.${modelName} not found`);
    return;
  }

  console.log(`${DRY_RUN ? "[dry] " : ""}${modelName}: ${rows.length} rows`);
  if (DRY_RUN) return;

  for (const row of rows) {
    try {
      const where =
        modelName === "platformProfile"
          ? { slug: row.slug }
          : { id: row.id };

      await model.upsert({
        where,
        create: row,
        update: row,
      });
    } catch (err) {
      console.error(`failed ${modelName}.${row.id}: ${err.message}`);
      throw err;
    }
  }
}

async function main() {
  if (CLEAR_MOCK) await clearMockRows();

  for (const [modelName, filename] of SEED_PLAN) {
    const rows = await readJson(filename);
    await upsertRows(modelName, rows);
  }

  console.log("Mock seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
