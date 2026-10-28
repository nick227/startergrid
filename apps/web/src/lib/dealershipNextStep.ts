import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { SETUP_LIFECYCLES } from './dealershipLabels.ts';

/**
 * One primary next action per dealership, derived from server-side onboarding evidence.
 * Nothing here marks steps complete; completion comes from what actually happened.
 */
export type NextActionKind =
  | 'retryChannelSetup'
  | 'inviteOwner'
  | 'shareOwnerLink'
  | 'waitForOwner'
  | 'addVehicles'
  | 'setAutopilot'
  | 'reviewLeads'
  | 'completeHandoff'
  | 'none';

export type NextAction = {
  kind: NextActionKind;
  label: string;
  /** Who has to move: our team, or the dealership. */
  owner: 'OUR_TEAM' | 'DEALER';
  /** False when the next move belongs to someone else and there is nothing to click. */
  actionable: boolean;
  detail?: string;
};

type Step = { key: string; status: string; ownerKind?: string | null; blockingReason?: string | null };
type Invite = { email: string; accessRole: string; deliveryStatus: string; expiresAt: string };
type Person = { accessRole: string; isActive: boolean; firstLoginAt: string | null; lastLoginAt: string | null; isInternal?: boolean; mustChangePassword?: boolean };

function categoryItemPhrases(businessCategory?: string) {
  if (!businessCategory) return null;
  const schema = resolveCategorySchema(businessCategory);
  if (schema.inventorySource !== 'category_item') return null;
  const noun = schema.asset.singular;
  return {
    add: `Add ${noun === 'item' ? 'items' : `${noun}s`}`,
    send: `Send a ${noun} to Marketplace`,
    channel: `A ready ${noun} has been sent to Marketplace`,
  };
}

export function recordNextAction(record: {
  lifecycleStatus: string;
  businessCategory?: string;
  onboardingSteps: Step[];
  invitations: Invite[];
  people: Person[];
  channelSetup?: { status: string; missing: string[] };
}, now = new Date()): NextAction {
  const phrases = categoryItemPhrases(record.businessCategory);
  // A failed setup step is our team's to fix and outranks waiting on anyone else.
  if (record.channelSetup?.status === 'NEEDS_ATTENTION') {
    const n = record.channelSetup.missing.length;
    return {
      kind: 'retryChannelSetup', label: 'Finish default destinations', owner: 'OUR_TEAM', actionable: true,
      detail: `Default setup did not finish for ${n} destination${n === 1 ? '' : 's'}. Retrying is safe and never creates duplicates.`,
    };
  }
  const open = (key: string) => record.onboardingSteps.find(s => s.key === key && s.status !== 'COMPLETE');
  const owners = record.people.filter(p => p.accessRole === 'DEALER_OWNER' && !p.isInternal && p.isActive && !p.mustChangePassword);
  const ownerSignedIn = owners.some(p => p.firstLoginAt || p.lastLoginAt);
  const ownerInvites = record.invitations.filter(i => i.accessRole === 'DEALER_OWNER');
  const liveInvite = ownerInvites.find(i => i.deliveryStatus !== 'EXPIRED' && new Date(i.expiresAt) > now);

  if (open('ACCESS')) {
    if (owners.length > 0 && !ownerSignedIn) {
      return { kind: 'waitForOwner', label: 'Owner to sign in for the first time', owner: 'DEALER', actionable: false };
    }
    if (liveInvite) {
      return {
        kind: 'shareOwnerLink', label: 'Owner to accept the invitation', owner: 'DEALER', actionable: true,
        detail: `Waiting on ${liveInvite.email}. Share the setup link so they can complete access and sign in.`,
      };
    }
    if (ownerInvites.length > 0) {
      return { kind: 'inviteOwner', label: 'Send the owner a new invitation', owner: 'OUR_TEAM', actionable: true, detail: 'The previous link expired.' };
    }
    return { kind: 'inviteOwner', label: 'Invite the owner', owner: 'OUR_TEAM', actionable: true };
  }
  if (open('VEHICLES')) {
    return {
      kind: 'addVehicles', label: phrases?.add ?? 'Add vehicles', owner: 'DEALER', actionable: true,
      detail: 'Add or import stock in their workspace. You will leave this record.',
    };
  }
  if (open('CHANNELS')) {
    return { kind: 'setAutopilot', label: phrases?.send ?? 'Send a vehicle to Auto Marketplace', owner: 'OUR_TEAM', actionable: true, detail: open('CHANNELS')?.blockingReason ?? undefined };
  }
  if (open('HANDOFF')) {
    if (!ownerSignedIn) return { kind: 'waitForOwner', label: 'Owner to sign in before handoff', owner: 'DEALER', actionable: false };
    if (open('HANDOFF')?.status === 'BLOCKED' || open('HANDOFF')?.status === 'NEEDS_RECHECK') {
      return { kind: 'reviewLeads', label: 'Verify the shared Leads inbox', owner: 'OUR_TEAM', actionable: true, detail: open('HANDOFF')?.blockingReason ?? undefined };
    }
    return { kind: 'completeHandoff', label: 'Complete the handoff', owner: 'OUR_TEAM', actionable: true };
  }
  return { kind: 'none', label: 'No setup work left', owner: 'OUR_TEAM', actionable: false };
}

/** Mirror server checks; the handoff endpoint rechecks authoritative evidence. */
export function handoffReadiness(record: { onboardingSteps: Step[]; people: Person[]; businessCategory?: string }): { ready: boolean; missing: string[] } {
  const phrases = categoryItemPhrases(record.businessCategory);
  const done = (key: string) => record.onboardingSteps.some(s => s.key === key && s.status === 'COMPLETE');
  const ownerSignedIn = record.people.some(p => p.accessRole === 'DEALER_OWNER' && !p.isInternal && p.isActive && !p.mustChangePassword && (p.firstLoginAt || p.lastLoginAt));
  const missing: string[] = [];
  if (!done('ACCESS') || !ownerSignedIn) missing.push('The owner has signed in');
  if (!done('VEHICLES')) missing.push('Stock is available for launch');
  if (!done('CHANNELS')) missing.push(phrases?.channel ?? 'A ready vehicle has been sent to Auto Marketplace');
  const handoff = record.onboardingSteps.find(s => s.key === 'HANDOFF');
  if (!handoff || ['BLOCKED', 'NEEDS_RECHECK', 'NOT_STARTED'].includes(handoff.status)) {
    missing.push(handoff?.blockingReason ?? 'A marketplace inquiry has reached the shared Leads inbox');
  }
  return { ready: missing.length === 0, missing };
}

type Summary = {
  lifecycleStatus: string;
  blockedStepCount?: number;
  waitingForStock?: boolean;
  nextStep?: { key: string; ownerKind: string; status?: string } | null;
};

/** Directory wording for the same next step, from the list summary. */
export function summaryNextAction(summary: Summary): { label: string; owner: 'OUR_TEAM' | 'DEALER' | null } {
  const step = summary.nextStep;
  if (!step) return { label: summary.lifecycleStatus === 'PAUSED' ? 'Paused' : 'No action needed', owner: null };
  if (step.key === 'CHANNELS' && step.status === 'BLOCKED') return { label: 'Finish default destinations', owner: 'OUR_TEAM' };
  const dealerMoves = step.ownerKind === 'DEALER' || step.ownerKind === 'YOU';
  switch (step.key) {
    case 'ACCESS': return dealerMoves ? { label: 'Owner to accept invitation', owner: 'DEALER' } : { label: 'Invite the owner', owner: 'OUR_TEAM' };
    case 'VEHICLES': return { label: 'Add vehicles', owner: 'DEALER' };
    case 'CHANNELS': return { label: 'Send a vehicle to Auto Marketplace', owner: 'OUR_TEAM' };
    case 'HANDOFF': if (step.status === 'BLOCKED' || step.status === 'NEEDS_RECHECK') return { label: 'Verify the shared Leads inbox', owner: 'OUR_TEAM' };
      return dealerMoves ? { label: 'Owner to sign in', owner: 'DEALER' } : { label: 'Complete the handoff', owner: 'OUR_TEAM' };
    default: return { label: 'Continue setup', owner: 'OUR_TEAM' };
  }
}

/** "Needs action" means our team has the next move, or something is blocked. */
export function needsOurAction(summary: Summary, channelIssues = 0): boolean {
  if (channelIssues > 0 || (summary.blockedStepCount ?? 0) > 0) return true;
  if (!SETUP_LIFECYCLES.includes(summary.lifecycleStatus)) return false;
  return summaryNextAction(summary).owner === 'OUR_TEAM';
}
