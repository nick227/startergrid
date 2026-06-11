// Seed helper — creates one SUPER_ADMIN OperatorAccount and a demo marketplace
// consumer account for local development.
//
// Configure via env vars:
//   SEED_ADMIN_EMAIL    (default: admin@example.local)
//   SEED_ADMIN_PASSWORD (default: dev-change-me)
//
// Password is stored as a real argon2id hash. The default password is
// intentionally weak and for local development only.

import type { PrismaClient } from '@prisma/client';
import { OperatorRole } from '@prisma/client';
import { hashPassword, MIN_PASSWORD_LENGTH } from './passwordService.js';

export async function seedSuperAdmin(prisma: PrismaClient): Promise<void> {
  const email    = process.env['SEED_ADMIN_EMAIL']    ?? 'admin@example.local';
  const password = process.env['SEED_ADMIN_PASSWORD'] ?? 'dev-change-me';

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters (got ${password.length})`
    );
  }

  const existing = await prisma.operatorAccount.findUnique({ where: { email } });
  if (existing) {
    console.log(`[authSeed] SUPER_ADMIN already exists: ${email} (id: ${existing.id})`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const account = await prisma.operatorAccount.create({
    data: { email, passwordHash, role: OperatorRole.SUPER_ADMIN },
  });
  console.log(`[authSeed] Created SUPER_ADMIN: ${email} (id: ${account.id})`);
}

export async function seedMarketplaceConsumer(prisma: PrismaClient): Promise<void> {
  const email    = process.env['SEED_BUYER_EMAIL']    ?? 'buyer@example.local';
  const password = process.env['SEED_BUYER_PASSWORD'] ?? 'dev-change-me';

  const existing = await prisma.marketplaceUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`[authSeed] Marketplace consumer already exists: ${email} (id: ${existing.id})`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.marketplaceUser.create({
    data: { email, passwordHash, displayName: 'Demo Buyer', isActive: true },
  });
  console.log(`[authSeed] Created marketplace consumer: ${email} (id: ${user.id})`);
}
