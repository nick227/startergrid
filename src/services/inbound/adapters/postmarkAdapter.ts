import { createHash, timingSafeEqual } from 'node:crypto';
import { readAuthEvidence } from '../emailAuthEvidence.js';
import {
  INBOUND_LIMITS,
  type InboundAttachment,
  type InboundDeliveryEnvelope,
  type InboundEmailAdapter,
  type NormalizedInboundEmail,
} from '../inboundEmailTypes.js';

/**
 * Postmark inbound webhook adapter.
 *
 * Postmark does not sign inbound webhooks. The webhook URL carries Basic Auth credentials
 * (https://user:pass@host/api/inbound/email/postmark) and must be HTTPS. Passing this check
 * proves only that Postmark delivered the request; sender trust is evaluated separately.
 */

type PostmarkAddress = { Email?: unknown; Name?: unknown; MailboxHash?: unknown };
type PostmarkPayload = {
  MessageID?: unknown;
  From?: unknown;
  FromName?: unknown;
  FromFull?: PostmarkAddress;
  ToFull?: unknown;
  CcFull?: unknown;
  BccFull?: unknown;
  OriginalRecipient?: unknown;
  MailboxHash?: unknown;
  ReplyTo?: unknown;
  Subject?: unknown;
  Date?: unknown;
  TextBody?: unknown;
  HtmlBody?: unknown;
  Headers?: unknown;
  Attachments?: unknown;
  RawEmail?: unknown;
};

export type PostmarkCredentials = { username: string; password: string };

export function postmarkCredentialsFromEnv(env: Record<string, string | undefined> = process.env): PostmarkCredentials | null {
  const username = env['INBOUND_POSTMARK_WEBHOOK_USERNAME']?.trim();
  const password = env['INBOUND_POSTMARK_WEBHOOK_PASSWORD']?.trim();
  return username && password ? { username, password } : null;
}

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();

function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function addresses(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    const email = str((entry as PostmarkAddress | null)?.Email, 320);
    return email ? [email.toLowerCase()] : [];
  });
}

function recipientsOf(p: PostmarkPayload): string[] {
  const all = [str(p.OriginalRecipient, 320)?.toLowerCase() ?? null, ...addresses(p.ToFull), ...addresses(p.CcFull), ...addresses(p.BccFull)];
  return [...new Set(all.filter((a): a is string => !!a))].slice(0, 50);
}

function headerList(value: unknown): Array<{ name: string; value: string }> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, INBOUND_LIMITS.maxHeaders).flatMap(entry => {
    const name = str((entry as { Name?: unknown } | null)?.Name, 200);
    const raw = (entry as { Value?: unknown } | null)?.Value;
    if (!name || typeof raw !== 'string') return [];
    return [{ name, value: raw.slice(0, INBOUND_LIMITS.maxHeaderValueLength) }];
  });
}

/** Attachments that could hold ADF are decoded; everything else is kept as metadata only. */
export function isAdfCandidate(name: string, contentType: string): boolean {
  return /(^|\/)(xml|adf)|\+xml$/i.test(contentType) || /\.(xml|adf)$/i.test(name) || /^text\/plain$/i.test(contentType) && /adf/i.test(name);
}

function attachmentList(value: unknown): { attachments: InboundAttachment[]; count: number } {
  if (!Array.isArray(value)) return { attachments: [], count: 0 };
  const attachments = value.slice(0, INBOUND_LIMITS.maxAttachments).map(entry => {
    const a = (entry ?? {}) as { Name?: unknown; ContentType?: unknown; ContentLength?: unknown; Content?: unknown };
    const name = str(a.Name, 255) ?? 'attachment';
    const contentType = str(a.ContentType, 120)?.toLowerCase() ?? 'application/octet-stream';
    const encoded = typeof a.Content === 'string' ? a.Content : '';
    const size = typeof a.ContentLength === 'number' ? a.ContentLength : Math.floor(encoded.length * 3 / 4);
    const decode = isAdfCandidate(name, contentType) && size <= INBOUND_LIMITS.maxAdfBytes && encoded.length <= INBOUND_LIMITS.maxAdfBytes * 2;
    return { name, contentType, size, content: decode ? Buffer.from(encoded, 'base64') : null };
  });
  return { attachments, count: value.length };
}

function parsePayload(body: unknown): PostmarkPayload | null {
  return body && typeof body === 'object' && !Array.isArray(body) ? body as PostmarkPayload : null;
}

export class PostmarkInboundAdapter implements InboundEmailAdapter {
  readonly provider = 'postmark';

  constructor(private readonly credentials: () => PostmarkCredentials | null = () => postmarkCredentialsFromEnv()) {}

  verifyDelivery(headers: Record<string, string | string[] | undefined>): 'ok' | 'unauthorized' | 'not-configured' {
    const expected = this.credentials();
    if (!expected) return 'not-configured';
    const header = headers['authorization'];
    const value = Array.isArray(header) ? header[0] : header;
    const match = value?.match(/^Basic\s+([A-Za-z0-9+/=]+)\s*$/i);
    if (!match) return 'unauthorized';
    const decoded = Buffer.from(match[1]!, 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    if (sep < 0) return 'unauthorized';
    // Compare fixed-length digests so neither length nor content leaks through timing.
    const userOk = timingSafeEqual(digest(decoded.slice(0, sep)), digest(expected.username));
    const passOk = timingSafeEqual(digest(decoded.slice(sep + 1)), digest(expected.password));
    return userOk && passOk ? 'ok' : 'unauthorized';
  }

  envelope(body: unknown): InboundDeliveryEnvelope | null {
    const p = parsePayload(body);
    const providerMessageId = str(p?.MessageID, 120);
    const fromEmail = str(p?.FromFull?.Email, 320) ?? str(p?.From, 320);
    if (!p || !providerMessageId || !fromEmail) return null;
    return {
      provider: this.provider,
      providerMessageId,
      rfcMessageId: rfcMessageIdOf(headerList(p.Headers)),
      recipients: recipientsOf(p),
      mailboxHash: str(p.MailboxHash, 120),
      fromEmail: fromEmail.toLowerCase(),
      fromName: str(p.FromFull?.Name, 160) ?? str(p.FromName, 160),
      subject: str(p.Subject, 255),
      receivedAt: new Date(),
      attachmentCount: Array.isArray(p.Attachments) ? p.Attachments.length : 0,
    };
  }

  normalize(storedPayload: string): NormalizedInboundEmail {
    const p = parsePayload(JSON.parse(storedPayload));
    const envelope = this.envelope(p);
    if (!p || !envelope) throw new Error('Stored Postmark payload is not a delivery.');
    const headers = headerList(p.Headers);
    const { attachments, count } = attachmentList(p.Attachments);
    const scan = (v: unknown) => typeof v === 'string' && v ? v.slice(0, INBOUND_LIMITS.maxBodyScanBytes) : null;
    const dated = typeof p.Date === 'string' ? new Date(p.Date) : null;
    return {
      provider: this.provider,
      providerMessageId: envelope.providerMessageId,
      rfcMessageId: envelope.rfcMessageId,
      recipients: envelope.recipients,
      mailboxHash: envelope.mailboxHash,
      from: { email: envelope.fromEmail, name: envelope.fromName },
      replyTo: str(p.ReplyTo, 320),
      subject: envelope.subject,
      receivedAt: dated && !Number.isNaN(dated.getTime()) ? dated : envelope.receivedAt,
      headers,
      auth: readAuthEvidence(headers),
      textBody: scan(p.TextBody),
      htmlBody: scan(p.HtmlBody),
      attachments,
      attachmentCount: count,
      hasRawMime: typeof p.RawEmail === 'string' && p.RawEmail.length > 0,
    };
  }
}

function rfcMessageIdOf(headers: Array<{ name: string; value: string }>): string | null {
  const ids = headers.filter(h => h.name.toLowerCase() === 'message-id');
  // A duplicated Message-ID header is not a usable identifier.
  return ids.length === 1 ? ids[0]!.value.trim().slice(0, 255) || null : null;
}
