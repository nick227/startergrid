import type { OperatorUser } from '@/lib/api/auth.ts';

export function operatorHasGlobalAccess(user: OperatorUser): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.devBypass && user.dealerAccessIds.length === 0) return true;
  return false;
}

export function canAccessDealer(user: OperatorUser, dealerId: string): boolean {
  if (operatorHasGlobalAccess(user)) return true;
  return user.dealerAccessIds.includes(dealerId);
}

export function filterDealersForOperator<T extends { id: string }>(
  dealers: T[],
  user: OperatorUser,
): T[] {
  if (operatorHasGlobalAccess(user)) return dealers;
  const allowed = new Set(user.dealerAccessIds);
  return dealers.filter(d => allowed.has(d.id));
}
