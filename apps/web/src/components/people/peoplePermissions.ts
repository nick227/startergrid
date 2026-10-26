import type { DealershipPerson } from '@/lib/api/dealershipRecordApi.ts';

export type PeopleViewer = {
  /** internal: StarterGrid staff on the dealership record; dealer: the dealership's own Settings → Team. */
  kind: 'internal' | 'dealer';
  userId?: string | null;
  isSiteAdmin?: boolean;
};

/**
 * Mirrors the server's rules so the UI only offers actions that will succeed.
 * The server stays authoritative; these checks only decide what to show.
 */
export function canManagePeople(viewer: PeopleViewer, people: DealershipPerson[]): boolean {
  if (viewer.kind === 'internal') return true;
  const self = people.find(p => p.accountId === viewer.userId);
  return self?.accessRole === 'DEALER_OWNER';
}

export type PersonActions = { changeRole: boolean; resetPassword: boolean; remove: boolean; reason?: string };

export function personActions(viewer: PeopleViewer, person: DealershipPerson, people: DealershipPerson[]): PersonActions {
  const none = (reason: string): PersonActions => ({ changeRole: false, resetPassword: false, remove: false, reason });
  if (!canManagePeople(viewer, people)) return none('Only owners can manage people.');
  if (person.isInternal && !viewer.isSiteAdmin) return none('Managed by StarterGrid.');
  if (person.accountId === viewer.userId) return none('This is you.');
  const activeOwners = people.filter(p => p.accessRole === 'DEALER_OWNER' && p.isActive);
  const lastOwner = person.accessRole === 'DEALER_OWNER' && activeOwners.length <= 1;
  return {
    changeRole: !person.isInternal && !lastOwner,
    resetPassword: !person.isInternal,
    remove: !lastOwner,
    reason: lastOwner ? 'Every dealership needs an active owner. Add another owner first.' : undefined,
  };
}
