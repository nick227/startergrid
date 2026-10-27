import { roleLabel } from './dealershipLabels.ts';

/**
 * Copyable message that goes with a setup link. It promises only what the link does:
 * no distribution claims, no placeholder branding.
 */
export function welcomeMessage(input: {
  dealershipName: string;
  email: string;
  accessRole: string;
  setupUrl: string;
  expiresAt?: string | null;
  signInUrl: string;
  name?: string | null;
}): string {
  const expires = input.expiresAt ? ` It expires on ${new Date(input.expiresAt).toLocaleDateString()}.` : ' It expires in 7 days.';
  return [
    `Hi${input.name?.trim() ? ` ${input.name.trim()}` : ''},`,
    '',
    `You've been invited to ${input.dealershipName} on DealerGrid as ${roleLabel(input.accessRole).toLowerCase()}.`,
    '',
    `Set up your login with this link (it works once):${expires}`,
    input.setupUrl,
    '',
    `Afterwards, sign in at ${input.signInUrl} with ${input.email}.`,
  ].join('\n');
}

export function signInUrlFallback(): string {
  return `${window.location.origin}${window.location.pathname}#/login`;
}
