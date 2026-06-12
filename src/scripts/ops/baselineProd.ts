import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// One-time baseline for a database that was created with `prisma db push`
// (no _prisma_migrations history) before switching to `prisma migrate deploy`.
// Marks every migration in prisma/migrations as already applied — it does NOT
// run any SQL. Only use against a DB whose schema already matches the chain.
//
// Usage (point DATABASE_URL at the target DB, e.g. Railway prod):
//   DATABASE_URL="mysql://…" npm run db:baseline
//
// A fresh/empty database does NOT need this — `migrate deploy` handles it.

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  console.error('DATABASE_URL must be set to the target database.');
  process.exit(1);
}

const migrationsDir = join(process.cwd(), 'prisma', 'migrations');
const migrations = readdirSync(migrationsDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();

if (migrations.length === 0) {
  console.error('No migrations found in prisma/migrations.');
  process.exit(1);
}

console.log(`Baselining ${migrations.length} migrations against ${dbUrl.replace(/:[^:@/]*@/, ':***@')}`);

for (const name of migrations) {
  process.stdout.write(`  resolve --applied ${name} … `);
  try {
    execFileSync('npx', ['prisma', 'migrate', 'resolve', '--applied', name], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: { ...process.env, DATABASE_URL: dbUrl },
    });
    console.log('ok');
  } catch (err) {
    const msg = err instanceof Error && 'stderr' in err
      ? String((err as { stderr?: Buffer }).stderr ?? err.message)
      : String(err);
    if (msg.includes('is already recorded as applied')) {
      console.log('already applied');
    } else {
      console.error(`failed\n${msg}`);
      process.exit(1);
    }
  }
}

console.log('Baseline complete. `prisma migrate status` should now report up to date.');
