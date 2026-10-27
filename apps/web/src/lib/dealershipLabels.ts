/**
 * The one place dealership management turns API enums into words people read.
 * UI code should never render a raw enum value.
 */

export type DealershipRole = 'DEALER_OWNER' | 'DEALER_STAFF' | 'INTERNAL_SUPPORT';

export const ROLE_LABEL: Record<DealershipRole, string> = {
  DEALER_OWNER: 'Owner',
  DEALER_STAFF: 'Staff',
  INTERNAL_SUPPORT: 'DealerGrid team',
};

export const ROLE_DESCRIPTION: Record<'DEALER_OWNER' | 'DEALER_STAFF', string> = {
  DEALER_OWNER: 'Manages everything: people, destinations, Autopilot, vehicles and leads.',
  DEALER_STAFF: 'Works on vehicles and leads. Cannot manage people or destinations.',
};

export function roleLabel(role: string | null | undefined): string {
  if (role === 'DEALER_OPERATOR') return ROLE_LABEL.DEALER_OWNER;
  if (role === 'OPERATOR') return ROLE_LABEL.INTERNAL_SUPPORT;
  return ROLE_LABEL[role as DealershipRole] ?? 'Member';
}

/** Account-level roles shown on the internal staff list. */
export function accountRoleLabel(role: string | null | undefined): string {
  switch (role) {
    case 'SUPER_ADMIN': return 'Site administrator';
    case 'INTERNAL_SUPPORT':
    case 'OPERATOR': return 'Internal support';
    case 'DEALER_OWNER':
    case 'DEALER_OPERATOR': return 'Dealership owner';
    case 'DEALER_STAFF': return 'Dealership staff';
    default: return 'Account';
  }
}

export type LifecycleTone = 'neutral' | 'progress' | 'ready' | 'live' | 'paused';

export function lifecycleLabel(status: string | null | undefined): { label: string; tone: LifecycleTone } {
  switch (status) {
    case 'DRAFT': return { label: 'Draft', tone: 'neutral' };
    case 'SETTING_UP': return { label: 'Setting up', tone: 'progress' };
    case 'READY_TO_LAUNCH': return { label: 'Ready for handoff', tone: 'ready' };
    case 'ACTIVE': return { label: 'Live', tone: 'live' };
    case 'PAUSED': return { label: 'Paused', tone: 'paused' };
    case 'ARCHIVED': return { label: 'Archived', tone: 'neutral' };
    default: return { label: 'Unknown', tone: 'neutral' };
  }
}

export const SETUP_LIFECYCLES = ['DRAFT', 'SETTING_UP', 'READY_TO_LAUNCH'];

export const STEP_TITLE: Record<string, string> = {
  CREATE: 'Dealership created',
  ACCESS: 'Owner can sign in',
  VEHICLES: 'Vehicles added',
  CHANNELS: 'Live listing verified',
  HANDOFF: 'Handoff complete',
};

export function stepTitle(stepKey: string): string {
  return STEP_TITLE[stepKey] ?? 'Setup step';
}

export type PersonStatus = { label: string; tone: 'ok' | 'waiting' | 'problem' | 'off' };

export function personStatus(person: {
  isActive: boolean;
  mustChangePassword?: boolean;
  firstLoginAt?: string | null;
  lastLoginAt?: string | null;
}): PersonStatus {
  if (!person.isActive) return { label: 'Suspended', tone: 'off' };
  if (person.mustChangePassword) return { label: 'Must choose a new password', tone: 'waiting' };
  if (person.firstLoginAt || person.lastLoginAt) return { label: 'Signed in', tone: 'ok' };
  return { label: 'Has not signed in yet', tone: 'waiting' };
}

/** Invite status is honest about delivery: PENDING means nobody was emailed. */
export function inviteStatus(invite: { deliveryStatus: string; expiresAt: string }, now = new Date()): PersonStatus {
  if (invite.deliveryStatus === 'EXPIRED' || new Date(invite.expiresAt) <= now) return { label: 'Link expired', tone: 'problem' };
  if (invite.deliveryStatus === 'SENT') return { label: 'Invitation emailed · not accepted yet', tone: 'waiting' };
  if (invite.deliveryStatus === 'FAILED') return { label: 'Email failed · share the link', tone: 'problem' };
  return { label: 'Link created · not accepted yet', tone: 'waiting' };
}

export type InviteDelivery = 'EMAIL_SENT' | 'EMAIL_FAILED' | 'LINK_ONLY';

export function deliveryMessage(delivery: InviteDelivery | undefined, email: string, error?: string | null): string {
  if (delivery === 'EMAIL_SENT') return `Invitation emailed to ${email}. You can also copy the link below.`;
  if (delivery === 'EMAIL_FAILED') return `The email to ${email} could not be sent${error ? ` (${error})` : ''}. Share the link below instead.`;
  return `Share this link with ${email}. DealerGrid does not email it automatically.`;
}

function str(detail: unknown, key: string): string | null {
  if (!detail || typeof detail !== 'object') return null;
  const value = (detail as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

const AUTOPILOT_WORD: Record<string, string> = { ON: 'on', OFF: 'off', PAUSED: 'paused' };

/** Turns a recorded activity event into a sentence. Unknown actions still read naturally. */
export function activitySentence(event: { action: string; detail?: unknown }): string {
  const email = str(event.detail, 'email');
  const role = str(event.detail, 'accessRole');
  const to = str(event.detail, 'to');
  switch (event.action) {
    case 'DEALERSHIP_CREATED': return 'Created the dealership';
    case 'INVITE_CREATED': return `Created a setup link for ${email ?? 'a person'}${role ? ` (${roleLabel(role)})` : ''}`;
    case 'INVITE_REVOKED': return `Cancelled the setup link for ${email ?? 'a person'}`;
    case 'INVITE_ACCEPTED': return `Accepted the invitation${role ? ` as ${roleLabel(role)}` : ''}`;
    case 'TEMPORARY_LOGIN_ISSUED': return `Issued a temporary password for ${email ?? 'a person'}`;
    case 'PASSWORD_RESET': return `Reset the password for ${email ?? 'a person'}`;
    case 'USER_SUSPENDED': return `Suspended ${email ?? 'a person'}`;
    case 'USER_REINSTATED': return `Reinstated ${email ?? 'a person'}`;
    case 'ROLE_CHANGED': return `Changed ${email ?? 'a person'} to ${roleLabel(role)}`;
    case 'PERSON_UPDATED': return `Updated access for ${email ?? 'a person'}`;
    case 'PERSON_REMOVED': return `Removed ${email ?? 'a person'} from the dealership`;
    case 'INTERNAL_OWNER_ASSIGNED': return 'Assigned the internal owner';
    case 'AUTOPILOT_PREFERENCE_CHANGED': return `Turned Autopilot ${AUTOPILOT_WORD[to ?? ''] ?? 'to a new setting'}`;
    case 'AUTOPILOT_POLICY_UPDATED': return 'Updated the Autopilot policy';
    case 'WAITING_FOR_STOCK_CHANGED':
      return (event.detail as { to?: unknown } | null)?.to === true ? 'Marked the dealership as waiting for stock' : 'Cleared waiting for stock';
    case 'LIFECYCLE_CHANGED': return `Changed the status to ${lifecycleLabel(to).label}`;
    case 'HANDOFF_COMPLETED': return 'Completed the handoff to the dealership';
    case 'CHANNEL_SETUP_INCOMPLETE': return 'Default channel setup did not finish';
    case 'CHANNEL_SETUP_COMPLETED': return 'Completed default channel setup';
    default: {
      const words = event.action.toLowerCase().replace(/_/g, ' ');
      return words.charAt(0).toUpperCase() + words.slice(1);
    }
  }
}

export function relativeTime(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return '—';
  const then = new Date(iso);
  const minutes = Math.round((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return then.toLocaleDateString();
}
