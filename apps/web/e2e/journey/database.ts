// Disposable database for the real-API journey: created from migrations only, dropped after.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const DB_NAME = 'startergrid_e2e_journey';
export const API_PORT = process.env.JOURNEY_API_PORT ?? '3110';
export const WEB_PORT = process.env.JOURNEY_WEB_PORT ?? '5188';
export const STAFF = { email: 'journey-staff@e2e.test', password: 'journey-password-123' };

/** E2E_DATABASE_URL, or the root .env DATABASE_URL pointed at the disposable database. */
export function journeyDatabaseUrl(): string {
  const configured = process.env.E2E_DATABASE_URL
    ?? /^DATABASE_URL="?([^"\n]+)"?/m.exec(readFileSync(path.join(ROOT, '.env'), 'utf8'))?.[1];
  if (!configured) throw new Error('Set E2E_DATABASE_URL or DATABASE_URL in the root .env');
  const url = new URL(configured);
  // It creates and drops a database, so never point it at a shared server.
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('The journey suite only runs against a local MySQL server.');
  }
  url.pathname = `/${DB_NAME}`;
  return url.toString();
}

function prismaFor(url: string) {
  const { PrismaClient } = createRequire(path.join(ROOT, 'package.json'))('@prisma/client');
  return new PrismaClient({ datasources: { db: { url } } });
}

async function withServerConnection<T>(fn: (db: ReturnType<typeof prismaFor>) => Promise<T>): Promise<T> {
  const url = new URL(journeyDatabaseUrl());
  if (url.pathname !== `/${DB_NAME}`) throw new Error('refusing: not the disposable journey database');
  url.pathname = '/mysql';
  const db = prismaFor(url.toString());
  try { return await fn(db); } finally { await db.$disconnect(); }
}

export async function createJourneyDatabase(): Promise<void> {
  await withServerConnection(async (db) => {
    await db.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
    await db.$executeRawUnsafe(`CREATE DATABASE \`${DB_NAME}\``);
  });
  const env = { ...process.env, DATABASE_URL: journeyDatabaseUrl() };
  execSync('npx prisma migrate deploy', { cwd: ROOT, env, stdio: 'pipe' });

  const db = prismaFor(journeyDatabaseUrl());
  try {
    const { hashPassword } = await import(pathToFileURL(path.join(ROOT, 'dist/src/services/auth/passwordService.js')).href);
    await db.operatorAccount.create({
      data: { email: STAFF.email, role: 'INTERNAL_SUPPORT', passwordHash: await hashPassword(STAFF.password) },
    });
  } finally {
    await db.$disconnect();
  }
}

export async function dropJourneyDatabase(): Promise<void> {
  if (process.env.JOURNEY_KEEP_DB) return;
  await withServerConnection(db => db.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${DB_NAME}\``));
}
