import type { Prisma, PrismaClient } from '@prisma/client';
import { emailTransport } from '../dealer/emailTransport.js';

type Db = PrismaClient | Prisma.TransactionClient;

// LINK_ONLY: no delivery service is configured, so the person who created the invite
// must share the link. Only EMAIL_SENT means a mail server accepted the message.
export type InviteDelivery = 'EMAIL_SENT' | 'EMAIL_FAILED' | 'LINK_ONLY';

export function inviteEmailDeliveryEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env['NODE_ENV'] === 'production' && env['SMTP_ENABLED']?.trim().toLowerCase() === 'true';
}

export function inviteEmailBody(input: { dealershipName: string; roleLabel: string; setupUrl: string; supportEmail: string }): string {
  return [
    'Hello,',
    '',
    `You've been invited to ${input.dealershipName} on StarterGrid as ${input.roleLabel}.`,
    '',
    'Use this secure link to choose your password and sign in. It expires in 7 days and works once:',
    input.setupUrl,
    '',
    `Questions? Contact ${input.supportEmail}.`,
  ].join('\n');
}

export async function deliverInvitation(
  db: Db,
  input: { inviteId: string; email: string; dealershipName: string; roleLabel: string; setupUrl: string },
  env: Record<string, string | undefined> = process.env,
  send: typeof emailTransport = emailTransport,
): Promise<{ delivery: InviteDelivery; deliveryError: string | null }> {
  if (!inviteEmailDeliveryEnabled(env)) return { delivery: 'LINK_ONLY', deliveryError: null };
  const supportEmail = env['SUPPORT_EMAIL'] ?? 'support@startergrid.com';
  try {
    await send({
      to: input.email,
      subject: `Set up your StarterGrid account for ${input.dealershipName}`,
      body: inviteEmailBody({ ...input, supportEmail }),
    }, env);
    await db.operatorInvitation.update({
      where: { id: input.inviteId },
      data: { deliveryStatus: 'SENT', deliveryError: null },
    });
    return { delivery: 'EMAIL_SENT', deliveryError: null };
  } catch (err) {
    const deliveryError = (err instanceof Error ? err.message : 'Email delivery failed').slice(0, 255);
    await db.operatorInvitation.update({
      where: { id: input.inviteId },
      data: { deliveryStatus: 'FAILED', deliveryError },
    });
    return { delivery: 'EMAIL_FAILED', deliveryError };
  }
}

export function roleLabel(accessRole: string): string {
  if (accessRole === 'DEALER_OWNER') return 'an owner';
  if (accessRole === 'DEALER_STAFF') return 'a staff member';
  return 'StarterGrid support';
}
