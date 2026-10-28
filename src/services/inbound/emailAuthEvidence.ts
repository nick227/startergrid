import type { AuthVerdict, EmailAuthEvidence } from './inboundEmailTypes.js';

type Header = { name: string; value: string };

/**
 * Reads sender-authentication evidence from the delivered headers.
 *
 * Preferred source is the receiving service's SpamAssassin `X-Spam-Tests` header
 * (Postmark adds it). A sender can include its own copy of any header, so when the
 * header appears more than once the evidence is marked ambiguous and treated as unknown.
 * `Authentication-Results` is recorded as a fallback but can be supplied by any upstream
 * hop, including a forwarding mailbox, so trust evaluation never upgrades on it alone.
 */
export function readAuthEvidence(headers: Header[]): EmailAuthEvidence {
  const spamTests = headers.filter(h => h.name.toLowerCase() === 'x-spam-tests');
  if (spamTests.length > 1) return { ...UNKNOWN, source: 'ambiguous', rawTests: null };
  if (spamTests.length === 1) return fromSpamTests(spamTests[0]!.value);

  const results = headers.filter(h => h.name.toLowerCase() === 'authentication-results');
  if (results.length > 1) return { ...UNKNOWN, source: 'ambiguous', rawTests: null };
  if (results.length === 1) return fromAuthenticationResults(results[0]!.value);
  return { ...UNKNOWN, source: 'none', rawTests: null };
}

const UNKNOWN: Omit<EmailAuthEvidence, 'source' | 'rawTests'> = {
  spf: 'unknown', dkim: 'unknown', dkimAuthorAligned: false, dmarc: 'unknown',
};

function fromSpamTests(value: string): EmailAuthEvidence {
  const tests = new Set(value.split(/[\s,]+/).map(t => t.trim().toUpperCase()).filter(Boolean));
  const spf: AuthVerdict = tests.has('SPF_PASS') ? 'pass'
    : tests.has('SPF_FAIL') || tests.has('SPF_SOFTFAIL') ? 'fail'
    : tests.has('SPF_NONE') ? 'none' : 'unknown';
  const dkim: AuthVerdict = tests.has('DKIM_INVALID') ? 'fail'
    : tests.has('DKIM_VALID') ? 'pass'
    : tests.has('DKIM_SIGNED') ? 'fail' : 'none';
  const dmarc: AuthVerdict = tests.has('DMARC_PASS') ? 'pass'
    : [...tests].some(t => t.startsWith('DMARC_') && t !== 'DMARC_MISSING' && t !== 'DMARC_NONE') ? 'fail'
    : tests.has('DMARC_MISSING') || tests.has('DMARC_NONE') ? 'none' : 'unknown';
  return {
    spf, dkim, dmarc,
    dkimAuthorAligned: dkim === 'pass' && tests.has('DKIM_VALID_AU'),
    source: 'x-spam-tests',
    rawTests: value.slice(0, 1000),
  };
}

function fromAuthenticationResults(value: string): EmailAuthEvidence {
  const verdict = (method: string): AuthVerdict => {
    const m = value.match(new RegExp(`\\b${method}=(pass|fail|softfail|neutral|none|temperror|permerror|policy)`, 'i'));
    if (!m) return 'unknown';
    const v = m[1]!.toLowerCase();
    return v === 'pass' ? 'pass' : v === 'none' ? 'none' : v === 'neutral' || v.endsWith('error') ? 'unknown' : 'fail';
  };
  return {
    spf: verdict('spf'), dkim: verdict('dkim'), dmarc: verdict('dmarc'),
    // Alignment cannot be established from an upstream header we did not add.
    dkimAuthorAligned: false,
    source: 'authentication-results',
    rawTests: value.slice(0, 1000),
  };
}

export function emailDomain(address: string | null | undefined): string | null {
  const at = address?.lastIndexOf('@') ?? -1;
  if (!address || at < 0) return null;
  const domain = address.slice(at + 1).trim().toLowerCase().replace(/\.$/, '');
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) ? domain : null;
}

/** True when `domain` is `base` or a subdomain of it (relaxed DMARC-style alignment). */
export function domainAligned(domain: string | null, base: string): boolean {
  if (!domain) return false;
  return domain === base || domain.endsWith(`.${base}`);
}
