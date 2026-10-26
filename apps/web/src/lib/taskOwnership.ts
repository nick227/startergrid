export type TaskOwnerKind = 'YOU' | 'OUR_TEAM' | 'SYSTEM' | 'PARTNER' | 'DEALER';

export type OwnershipTone = 'you' | 'team' | 'system' | 'partner';

export function ownerLabel(kind: TaskOwnerKind | string | null | undefined, ownerName?: string | null): string {
  const name = ownerName?.trim();
  switch (kind) {
    case 'YOU':
    case 'DEALER':
      return name ? `Dealership · ${name}` : 'Dealership';
    case 'OUR_TEAM':
      return name ? `Our team · ${name}` : 'Our team';
    case 'SYSTEM':
      return 'System';
    case 'PARTNER':
      return name ? `Partner · ${name}` : 'Partner';
    default:
      return name || 'Unassigned';
  }
}

export function ownerTone(kind: TaskOwnerKind | string | null | undefined): OwnershipTone {
  if (kind === 'YOU' || kind === 'DEALER') return 'you';
  if (kind === 'SYSTEM') return 'system';
  if (kind === 'PARTNER') return 'partner';
  return 'team';
}

export function ownershipSentence(input: {
  action: string;
  ownerKind?: string | null;
  ownerName?: string | null;
  due?: string | null;
}): string {
  const parts = [`Next: ${input.action}`, ownerLabel(input.ownerKind, input.ownerName)];
  if (input.due) parts.push(input.due);
  return parts.join(' · ');
}
