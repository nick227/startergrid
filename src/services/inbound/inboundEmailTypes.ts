/**
 * Provider-neutral shape of one inbound email. Everything downstream of an adapter
 * (routing, ADF parsing, provenance, matching) depends only on these types.
 */

export type AuthVerdict = 'pass' | 'fail' | 'none' | 'unknown';

export type InboundAttachment = {
  name: string;
  contentType: string;
  size: number;
  /** Decoded bytes. Only attachments that could carry ADF are decoded; others are metadata only. */
  content: Buffer | null;
};

export type EmailAuthEvidence = {
  spf: AuthVerdict;
  dkim: AuthVerdict;
  /** DKIM signature that verified for the header From domain (author-aligned). */
  dkimAuthorAligned: boolean;
  dmarc: AuthVerdict;
  /** Which header the verdicts came from. Message-supplied headers can be forged, so this is evidence, not proof. */
  source: 'x-spam-tests' | 'authentication-results' | 'none' | 'ambiguous';
  rawTests: string | null;
};

export type NormalizedInboundEmail = {
  provider: string;
  providerMessageId: string;
  rfcMessageId: string | null;
  /** Every recipient the provider reported; routing picks the one on our inbound domain. */
  recipients: string[];
  /** Provider-side plus-address hash, used only when no recipient is on our inbound domain. */
  mailboxHash: string | null;
  from: { email: string; name: string | null };
  replyTo: string | null;
  subject: string | null;
  receivedAt: Date;
  headers: Array<{ name: string; value: string }>;
  auth: EmailAuthEvidence;
  textBody: string | null;
  htmlBody: string | null;
  attachments: InboundAttachment[];
  attachmentCount: number;
  hasRawMime: boolean;
};

/** Metadata the webhook needs before acknowledging a delivery. Full normalization happens in the worker. */
export type InboundDeliveryEnvelope = {
  provider: string;
  providerMessageId: string;
  rfcMessageId: string | null;
  recipients: string[];
  mailboxHash: string | null;
  fromEmail: string;
  fromName: string | null;
  subject: string | null;
  receivedAt: Date;
  attachmentCount: number;
};

export interface InboundEmailAdapter {
  readonly provider: string;
  /** Proves the request came from the delivery service. It says nothing about the original sender. */
  verifyDelivery(headers: Record<string, string | string[] | undefined>): 'ok' | 'unauthorized' | 'not-configured';
  /** Cheap, total extraction for persistence. Returns null when the body is not a delivery at all. */
  envelope(body: unknown): InboundDeliveryEnvelope | null;
  /** Full normalization from the stored payload, run by the worker. */
  normalize(storedPayload: string): NormalizedInboundEmail;
}

export const INBOUND_LIMITS = Object.freeze({
  /** Whole webhook request. Larger deliveries get 413 and stay in the provider's inbound activity. */
  maxRequestBytes: 10 * 1024 * 1024,
  maxAttachments: 25,
  /** Any single ADF candidate (attachment or extracted block). */
  maxAdfBytes: 256 * 1024,
  /** Body text scanned for an embedded ADF block. */
  maxBodyScanBytes: 1024 * 1024,
  maxHeaders: 300,
  maxHeaderValueLength: 4000,
  maxXmlDepth: 32,
  maxProspects: 20,
  maxVehiclesPerProspect: 50,
});
