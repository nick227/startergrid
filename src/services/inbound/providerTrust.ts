import type { AdfProspect } from './adfParser.js';
import { domainAligned, emailDomain } from './emailAuthEvidence.js';
import type { EmailAuthEvidence } from './inboundEmailTypes.js';

/**
 * Who sent the inquiry, and how sure we are.
 *
 * A verified webhook proves only that the delivery service handed us the message. A marketplace
 * identity is VERIFIED only when the ADF names the marketplace AND the message carries an
 * author-aligned DKIM pass for one of that marketplace's sending domains. Anything weaker keeps
 * the claim for display but must not be attributed to the marketplace in reporting.
 */

export type ProviderTrust = 'VERIFIED' | 'CLAIMED' | 'CONFLICTING' | 'UNKNOWN';

export type KnownLeadProvider = {
  platformSlug: string;
  label: string;
  /** Matched against ADF provider/vendor name, id source and URL. */
  namePattern: RegExp;
  /**
   * Domains the marketplace signs lead email from. Confirm each against a real delivered
   * sample before relying on it: a wrong entry here would attribute leads incorrectly.
   */
  senderDomains: string[];
};

export const KNOWN_LEAD_PROVIDERS: readonly KnownLeadProvider[] = Object.freeze([
  { platformSlug: 'cars-com', label: 'Cars.com', namePattern: /\bcars\.com\b|\bcars dot com\b/i, senderDomains: ['cars.com'] },
  { platformSlug: 'autotrader-cox', label: 'Autotrader', namePattern: /\bauto\s?trader\b/i, senderDomains: ['autotrader.com'] },
  { platformSlug: 'cargurus-dealer', label: 'CarGurus', namePattern: /\bcar\s?gurus\b/i, senderDomains: ['cargurus.com'] },
  { platformSlug: 'truecar-dealer-network', label: 'TrueCar', namePattern: /\btrue\s?car\b/i, senderDomains: ['truecar.com'] },
  { platformSlug: 'carfax-for-dealers', label: 'CARFAX', namePattern: /\bcarfax\b/i, senderDomains: ['carfax.com'] },
  { platformSlug: 'ebay-motors', label: 'eBay Motors', namePattern: /\bebay\b/i, senderDomains: ['ebay.com'] },
  { platformSlug: 'facebook-marketplace-general', label: 'Facebook Marketplace', namePattern: /\bfacebook\b|\bmeta\b/i, senderDomains: ['facebookmail.com'] },
]);

export type ProviderProvenance = {
  trust: ProviderTrust;
  /** Marketplace the ADF claims; kept for display even when unverified. */
  claimedPlatformSlug: string | null;
  /** Set only when trust is VERIFIED. Reporting attributes to this and nothing else. */
  verifiedPlatformSlug: string | null;
  /** Marketplace the authenticated sender domain belongs to, if any. */
  senderPlatformSlug: string | null;
  claims: Array<{ field: string; value: string; platformSlug: string | null }>;
  senderDomain: string | null;
  reasons: string[];
};

export function identifyProvider(text: string | null, registry: readonly KnownLeadProvider[] = KNOWN_LEAD_PROVIDERS): string | null {
  if (!text) return null;
  return registry.find(p => p.namePattern.test(text))?.platformSlug ?? null;
}

export function evaluateProviderTrust(
  prospects: AdfProspect[],
  sender: { email: string; auth: EmailAuthEvidence },
  registry: readonly KnownLeadProvider[] = KNOWN_LEAD_PROVIDERS,
): ProviderProvenance {
  const claims: ProviderProvenance['claims'] = [];
  for (const p of prospects) {
    const fields: Array<[string, string | null]> = [
      ['provider.name', p.provider?.name ?? null],
      ['provider.url', p.provider?.url ?? null],
      ['provider.id.source', p.provider?.idSource ?? null],
      ['prospect.id.source', p.ids.find(i => i.source)?.source ?? null],
    ];
    for (const [field, value] of fields) {
      if (value) claims.push({ field, value, platformSlug: identifyProvider(value, registry) });
    }
  }

  const claimed = [...new Set(claims.map(c => c.platformSlug).filter((s): s is string => !!s))];
  const senderDomain = emailDomain(sender.email);
  const senderPlatform = registry.find(p => p.senderDomains.some(d => domainAligned(senderDomain, d)));
  const authenticated = sender.auth.source === 'x-spam-tests'
    && sender.auth.dkim === 'pass'
    && sender.auth.dkimAuthorAligned
    && sender.auth.spf !== 'fail'
    && sender.auth.dmarc !== 'fail';
  const senderPlatformSlug = authenticated ? senderPlatform?.platformSlug ?? null : null;

  const reasons: string[] = [];
  const base = { claims, senderDomain, senderPlatformSlug };

  if (claimed.length > 1) {
    reasons.push(`ADF names more than one marketplace: ${claimed.join(', ')}`);
    return { ...base, trust: 'CONFLICTING', claimedPlatformSlug: null, verifiedPlatformSlug: null, reasons };
  }
  const claimedSlug = claimed[0] ?? null;
  if (senderPlatformSlug && claimedSlug && senderPlatformSlug !== claimedSlug) {
    reasons.push(`ADF names ${claimedSlug} but the authenticated sender belongs to ${senderPlatformSlug}`);
    return { ...base, trust: 'CONFLICTING', claimedPlatformSlug: claimedSlug, verifiedPlatformSlug: null, reasons };
  }
  if (!claimedSlug) {
    reasons.push(claims.length ? 'ADF provider is not a recognised marketplace' : 'ADF names no provider');
    return { ...base, trust: 'UNKNOWN', claimedPlatformSlug: null, verifiedPlatformSlug: null, reasons };
  }
  if (senderPlatformSlug === claimedSlug) {
    reasons.push(`Author-aligned DKIM pass for ${senderDomain}`);
    return { ...base, trust: 'VERIFIED', claimedPlatformSlug: claimedSlug, verifiedPlatformSlug: claimedSlug, reasons };
  }
  reasons.push(
    sender.auth.source === 'ambiguous' ? 'Authentication headers were duplicated and cannot be relied on'
      : !senderPlatform ? `Sender domain ${senderDomain ?? '(none)'} is not a known sending domain for ${claimedSlug} (forwarded mail is expected here)`
      : 'Sender domain matches but the message lacks an author-aligned DKIM pass',
  );
  return { ...base, trust: 'CLAIMED', claimedPlatformSlug: claimedSlug, verifiedPlatformSlug: null, reasons };
}
