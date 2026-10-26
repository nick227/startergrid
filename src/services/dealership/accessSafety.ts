import type { DealerAccessRole, Prisma, PrismaClient } from '@prisma/client';
import { HttpError } from './httpError.js';

type Db = PrismaClient | Prisma.TransactionClient;

export type AccessActor = { id: string; email: string; role?: string; devHeader?: boolean };

const DEALER_ACCOUNT_ROLES = ['DEALER_OWNER', 'DEALER_OPERATOR', 'DEALER_STAFF'];

export function isSiteAdmin(actor: AccessActor): boolean {
  return actor.role === 'SUPER_ADMIN' || Boolean(actor.devHeader);
}

export function isDealerAccountRole(role: string): boolean {
  return DEALER_ACCOUNT_ROLES.includes(role);
}

export function assertAssignableRole(actor: AccessActor, role?: DealerAccessRole): void {
  if (role === 'INTERNAL_SUPPORT' && !isSiteAdmin(actor))
    throw new HttpError(403, 'Only a site administrator can assign internal support access.');
}

export function assertManageableAccount(actor: AccessActor, targetRole: string): void {
  if (isSiteAdmin(actor)) return;
  if (!isDealerAccountRole(targetRole))
    throw new HttpError(403, 'Internal accounts must be managed by a site administrator.');
}

// Dealer-facing actors cannot demote, suspend or remove themselves; staff would otherwise
// be able to lock a rooftop out of its own administration by accident.
export function assertNotSelfChange(actor: AccessActor, accountId: string, change: 'role' | 'suspend' | 'remove'): void {
  if (accountId !== actor.id) return;
  if (change === 'suspend') throw new HttpError(400, 'You cannot suspend your own account');
  if (change === 'remove') throw new HttpError(400, 'You cannot remove yourself from this dealership');
  if (!isSiteAdmin(actor)) throw new HttpError(400, 'You cannot change your own role');
}

// Every dealership keeps at least one active owner once one exists.
export async function assertKeepsAnOwner(db: Db, dealershipId: string, accountId: string): Promise<void> {
  const owners = await db.operatorDealerAccess.findMany({
    where: { dealershipId, accessRole: 'DEALER_OWNER' },
    select: { operatorAccountId: true, operator: { select: { isActive: true } } },
  });
  const isOwner = owners.some(row => row.operatorAccountId === accountId);
  if (!isOwner) return;
  const others = owners.filter(row => row.operatorAccountId !== accountId && row.operator.isActive);
  if (others.length === 0)
    throw new HttpError(409, 'Every dealership needs at least one active owner. Add another owner first.');
}

// Password resets and suspensions act on the whole login, so non-admins may only do them
// when the login belongs to this dealership alone.
export async function assertSingleDealershipLogin(
  db: Db,
  actor: AccessActor,
  accountId: string,
  dealershipId: string,
): Promise<void> {
  if (isSiteAdmin(actor)) return;
  const memberships = await db.operatorDealerAccess.findMany({
    where: { operatorAccountId: accountId },
    select: { dealershipId: true },
  });
  if (memberships.some(m => m.dealershipId !== dealershipId))
    throw new HttpError(403, 'This account has access to other dealerships. Ask a site administrator to manage its login.');
}
