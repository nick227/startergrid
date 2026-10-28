import { randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { NormalizedInboundEmail } from './inboundEmailTypes.js';

const TOKEN = /^[a-z0-9_-]{16,40}$/i;

export function inboundAddress(routeToken: string, domain = process.env['INBOUND_EMAIL_DOMAIN']?.trim() || 'in.dealergrid.example'): string {
  return `leads+${routeToken}@${domain}`;
}

/** The dealership is identified only from the plus-address token, never from the ADF body. */
export function routeTokenFromEmail(email: NormalizedInboundEmail): string | null {
  for (const recipient of email.recipients) {
    const plus = recipient.toLowerCase().match(/^[^@]*\+([a-z0-9_-]{16,40})@/);
    if (plus?.[1] && TOKEN.test(plus[1])) return plus[1];
  }
  return email.mailboxHash && TOKEN.test(email.mailboxHash) ? email.mailboxHash : null;
}

export async function issueInboundRoute(db: PrismaClient, dealershipId: string): Promise<string> {
  const active = await db.inboundEmailRoute.findFirst({ where: { dealershipId, status: 'ACTIVE' }, select: { routeToken: true } });
  if (active) return active.routeToken;
  const routeToken = randomBytes(16).toString('hex');
  await db.inboundEmailRoute.create({ data: { dealershipId, routeToken, status: 'ACTIVE' } });
  return routeToken;
}
