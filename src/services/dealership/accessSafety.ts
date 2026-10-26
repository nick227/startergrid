import type { DealerAccessRole } from '@prisma/client';
import { HttpError } from './httpError.js';

export type AccessActor = { id: string; email: string; role?: string; devHeader?: boolean };
export function assertAssignableRole(actor: AccessActor, role?: DealerAccessRole): void {
  if (role === 'INTERNAL_SUPPORT' && actor.role !== 'SUPER_ADMIN' && !actor.devHeader)
    throw new HttpError(403, 'Only a site administrator can assign internal support access.');
}
export function assertManageableAccount(actor: AccessActor, targetRole: string): void {
  if (actor.role === 'SUPER_ADMIN' || actor.devHeader) return;
  if (!['DEALER_OWNER', 'DEALER_OPERATOR', 'DEALER_STAFF'].includes(targetRole))
    throw new HttpError(403, 'Internal accounts must be managed by a site administrator.');
}
