// Seed helper — creates operator accounts and a demo marketplace consumer for
// local development.
//
// Configure via env vars:
//   SEED_ADMIN_EMAIL      (default: admin@example.local)
//   SEED_ADMIN_PASSWORD   (default: dev-change-me)
//   SEED_OPERATOR_EMAIL   (default: a@a.com)
//   SEED_OPERATOR_PASSWORD (default: dev-change-me)
//
// Passwords are stored as argon2id hashes. The defaults are intentionally weak
// and for local development only.

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

export async function seedDemoOperator(prisma: PrismaClient, demoDealerIds: string[]): Promise<void> {
  const email    = process.env['SEED_OPERATOR_EMAIL']    ?? 'a@a.com';
  const password = process.env['SEED_OPERATOR_PASSWORD'] ?? 'dev-change-me';

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_OPERATOR_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters (got ${password.length})`
    );
  }

  let account = await prisma.operatorAccount.findUnique({ where: { email } });
  if (!account) {
    const passwordHash = await hashPassword(password);
    account = await prisma.operatorAccount.create({
      data: { email, passwordHash, role: OperatorRole.OPERATOR },
    });
    console.log(`[authSeed] Created OPERATOR: ${email} (id: ${account.id})`);
  } else {
    console.log(`[authSeed] Demo operator already exists: ${email} (id: ${account.id})`);
  }

  const existingAccess = await prisma.operatorDealerAccess.findMany({
    where: { operatorAccountId: account.id },
    select: { dealershipId: true },
  });
  const granted = new Set(existingAccess.map(a => a.dealershipId));

  for (const dealershipId of demoDealerIds) {
    if (granted.has(dealershipId)) continue;
    await prisma.operatorDealerAccess.create({
      data: { operatorAccountId: account.id, dealershipId, grantedBy: 'seed' },
    });
    console.log(`[authSeed] Granted ${email} access to ${dealershipId}`);
  }
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
