/** Local-only acceptance runner. Creates and always drops its own disposable schema. */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const root = new URL('../../', import.meta.url);
const configured = process.env.DATABASE_URL;
if (!configured) throw new Error('Configure DATABASE_URL for a local MySQL server.');
const target = new URL(configured);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
  throw new Error('Redesign acceptance only runs against a local MySQL server.');
}
const name = `startergrid_v5_test_redesign_${randomBytes(6).toString('hex')}`;
const admin = new PrismaClient({ datasources: { db: { url: configured } } });
let created = false;
let child;
const stop = signal => { child?.kill(signal); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
async function run(command, args, env) {
  await new Promise((resolve, reject) => {
    child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      child = undefined;
      code === 0 ? resolve() : reject(new Error(`${command} failed (${signal ?? code})`));
    });
  });
}
try {
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${name}\``);
  created = true;
  target.pathname = `/${name}`;
  // Do not inherit provider credentials, production mail configuration or dev impersonation.
  const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'PLAYWRIGHT_BROWSERS_PATH'].flatMap(key =>
    process.env[key] ? [[key, process.env[key]]] : []));
  Object.assign(env, {
    DATABASE_URL: target.toString(), V5_TEST_DATABASE_URL: target.toString(),
    NODE_ENV: 'test', SMTP_ENABLED: 'false', V5_AUTOPILOT_ENABLED: 'true',
    DISPATCH_ENVIRONMENT: 'MOCK', VITE_API_URL: '', VITE_DEV_OPERATOR_ID: '',
  });
  await run('npx', ['prisma', 'migrate', 'deploy'], env);
  await run('node', ['--test', 'dist/src/tests/onboardingEvidenceDatabase.test.js'], env);
  await run('node', ['scripts/redesign/csv-import.mjs'], env);
} finally {
  if (created) {
    await admin.$executeRawUnsafe(`DROP DATABASE \`${name}\``);
    console.log('Removed disposable redesign database.');
  }
  await admin.$disconnect();
  process.off('SIGINT', stop);
  process.off('SIGTERM', stop);
}
