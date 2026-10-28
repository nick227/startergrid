import { XMLParser } from 'fast-xml-parser';
import { INBOUND_LIMITS, type InboundAttachment } from './inboundEmailTypes.js';

/**
 * Safe ADF/XML 1.0 parser for inbound marketplace inquiries.
 *
 * Hostile input is expected: DOCTYPE and ENTITY declarations are rejected before parsing
 * (no XXE, no entity expansion), documents are size- and depth-limited, and every string is
 * stripped of control characters and capped to the column it will eventually occupy.
 * The parser never throws on bad input; it returns a typed failure.
 */

export type AdfVehicle = {
  interest: string | null;   // buy | lease | sell | trade-in | test-drive
  status: string | null;     // new | used
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  vin: string | null;
  stock: string | null;
  price: string | null;
  comments: string | null;
};

export type AdfParty = {
  id: string | null;
  idSource: string | null;
  name: string | null;
  url: string | null;
  email: string | null;
  service: string | null;
};

export type AdfProspect = {
  status: string | null;     // new | resend
  ids: Array<{ value: string; source: string | null; sequence: string | null }>;
  requestDate: string | null;
  vehicles: AdfVehicle[];
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    preferredContact: 'email' | 'phone' | null;
    postalCode: string | null;
  };
  comments: string | null;
  vendor: AdfParty | null;
  provider: AdfParty | null;
  warnings: string[];
};

export type AdfLocation = 'attachment' | 'text-body' | 'html-body';

export type AdfParseResult =
  | { ok: true; location: AdfLocation; documentsFound: number; prospects: AdfProspect[] }
  | { ok: false; reason: AdfFailure; detail: string };

export type AdfFailure = 'NO_ADF_FOUND' | 'FORBIDDEN_XML' | 'LIMIT_EXCEEDED' | 'MALFORMED_XML' | 'NO_PROSPECT';

const REPEATED = new Set(['prospect', 'vehicle', 'contact', 'name', 'email', 'phone', 'id', 'price', 'address', 'postalcode', 'comments']);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,     // predefined XML entities only; DOCTYPE is rejected before this runs
  htmlEntities: false,
  maxNestedTags: INBOUND_LIMITS.maxXmlDepth,
  transformTagName: name => name.toLowerCase(),
  transformAttributeName: name => name.toLowerCase(),
  isArray: name => REPEATED.has(name),
});

// ── Locating the ADF document ───────────────────────────────────────────────

export type AdfSources = { attachments: InboundAttachment[]; textBody: string | null; htmlBody: string | null };

export function parseAdfFromEmail(sources: AdfSources): AdfParseResult {
  const candidates: Array<{ location: AdfLocation; xml: string }> = [];
  for (const a of sources.attachments) {
    if (!a.content) continue;
    const block = extractAdfBlock(a.content.toString('utf8'));
    if (block) candidates.push({ location: 'attachment', xml: block });
  }
  if (sources.textBody) {
    const block = extractAdfBlock(unquote(sources.textBody));
    if (block) candidates.push({ location: 'text-body', xml: block });
  }
  if (sources.htmlBody) {
    const block = extractAdfBlock(sources.htmlBody) ?? extractAdfBlock(htmlToText(sources.htmlBody));
    if (block) candidates.push({ location: 'html-body', xml: block });
  }
  if (candidates.length === 0) return { ok: false, reason: 'NO_ADF_FOUND', detail: 'No <adf> document in attachments or body.' };

  // The same inquiry commonly appears in several parts; the first that parses wins.
  let firstFailure: AdfParseResult | null = null;
  for (const candidate of candidates) {
    const result = parseAdfDocument(candidate.xml);
    if (result.ok) return { ok: true, location: candidate.location, documentsFound: candidates.length, prospects: result.prospects };
    firstFailure ??= result;
  }
  return firstFailure!;
}

/** Returns the `<?xml?>`/`<adf>…</adf>` span, or null. Scans at most the body scan limit. */
export function extractAdfBlock(text: string): string | null {
  const scanned = text.length > INBOUND_LIMITS.maxBodyScanBytes ? text.slice(0, INBOUND_LIMITS.maxBodyScanBytes) : text;
  const lower = scanned.toLowerCase();
  const open = lower.search(/<adf[\s>]/);
  if (open < 0) return null;
  const close = lower.indexOf('</adf>', open);
  if (close < 0) return null;
  // Keep a preceding XML declaration and any DOCTYPE so the safety checks below see them.
  const prolog = lower.lastIndexOf('<?xml', open);
  const doctype = lower.lastIndexOf('<!doctype', open);
  const start = Math.min(...[open, prolog, doctype].filter(i => i >= 0 && open - i < 4096));
  return scanned.slice(start, close + '</adf>'.length);
}

/** Forwarded plain-text mail quotes the original with "> "; ADF inside a quote must be unquoted. */
function unquote(text: string): string {
  const lines = text.split(/\r?\n/);
  const quoted = lines.filter(l => /^\s*>/.test(l)).length;
  if (quoted === 0 || !/^\s*>.*<adf[\s>]/im.test(text)) return text;
  return lines.map(l => l.replace(/^\s*(>\s?)+/, '')).join('\n');
}

/** Escaped ADF in HTML mail (`&lt;adf&gt;`): drop markup, then decode the entities used to escape XML. */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|pre)>/gi, '\n')
    .replace(/<[^>]{0,2000}>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

// ── Parsing ─────────────────────────────────────────────────────────────────

type Node = Record<string, unknown>;

export function parseAdfDocument(xml: string): { ok: true; prospects: AdfProspect[] } | { ok: false; reason: AdfFailure; detail: string } {
  if (Buffer.byteLength(xml, 'utf8') > INBOUND_LIMITS.maxAdfBytes) {
    return { ok: false, reason: 'LIMIT_EXCEEDED', detail: `ADF document exceeds ${INBOUND_LIMITS.maxAdfBytes} bytes.` };
  }
  if (/<!\s*(doctype|entity|element|attlist)/i.test(xml)) {
    return { ok: false, reason: 'FORBIDDEN_XML', detail: 'DOCTYPE and entity declarations are not accepted.' };
  }
  if (/&(?!(amp|lt|gt|quot|apos|#\d{1,7}|#x[0-9a-f]{1,6});)/i.test(xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, ''))) {
    return { ok: false, reason: 'MALFORMED_XML', detail: 'Undeclared entity reference.' };
  }
  const depth = maxDepth(xml);
  if (depth > INBOUND_LIMITS.maxXmlDepth) {
    return { ok: false, reason: 'LIMIT_EXCEEDED', detail: `ADF nesting depth ${depth} exceeds ${INBOUND_LIMITS.maxXmlDepth}.` };
  }

  let doc: Node;
  try {
    doc = parser.parse(xml, true) as Node;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unparseable';
    return { ok: false, reason: 'MALFORMED_XML', detail: message.slice(0, 200) };
  }

  const adf = doc['adf'];
  const prospectNodes = adf && typeof adf === 'object' ? list((adf as Node)['prospect']) : [];
  if (prospectNodes.length === 0) return { ok: false, reason: 'NO_PROSPECT', detail: 'ADF document has no <prospect>.' };
  if (prospectNodes.length > INBOUND_LIMITS.maxProspects) {
    return { ok: false, reason: 'LIMIT_EXCEEDED', detail: `More than ${INBOUND_LIMITS.maxProspects} prospects.` };
  }
  for (const p of prospectNodes) {
    if (list(p['vehicle']).length > INBOUND_LIMITS.maxVehiclesPerProspect) {
      return { ok: false, reason: 'LIMIT_EXCEEDED', detail: `More than ${INBOUND_LIMITS.maxVehiclesPerProspect} vehicles in a prospect.` };
    }
  }
  return { ok: true, prospects: prospectNodes.map(toProspect) };
}

/** Linear tag scan so a deeply nested document is rejected before the parser recurses into it. */
function maxDepth(xml: string): number {
  let depth = 0, max = 0;
  const tag = /<(\/?)([a-zA-Z_][\w.:-]*)[^>]*?(\/?)>/g;
  for (let m = tag.exec(xml); m; m = tag.exec(xml)) {
    if (m[1]) depth = Math.max(0, depth - 1);
    else if (!m[3]) max = Math.max(max, ++depth);
  }
  return max;
}

function list(value: unknown): Node[] {
  const arr = Array.isArray(value) ? value : value == null ? [] : [value];
  return arr.map(v => (v && typeof v === 'object' ? v as Node : { '#text': v }));
}

/** Text of an element that may be a string, an object with #text, or an array of either. */
function text(value: unknown, max: number): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  const raw = first && typeof first === 'object' ? (first as Node)['#text'] : first;
  if (raw == null) return null;
  return clean(String(raw), max);
}

function attr(node: Node | undefined, name: string): string | null {
  const v = node?.[`@_${name}`];
  return typeof v === 'string' ? clean(v, 40)?.toLowerCase() ?? null : null;
}

export function clean(value: string, max: number): string | null {
  // eslint-disable-next-line no-control-regex
  const stripped = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '');
  const collapsed = stripped.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  return collapsed ? collapsed.slice(0, max) : null;
}

function toVehicle(v: Node): AdfVehicle {
  const prices = list(v['price']);
  const quote = prices.find(p => attr(p, 'type') === 'quote' || attr(p, 'type') === 'asking') ?? prices[0];
  return {
    interest: attr(v, 'interest'),
    status: attr(v, 'status'),
    year: text(v['year'], 4),
    make: text(v['make'], 80),
    model: text(v['model'], 80),
    trim: text(v['trim'], 120),
    vin: text(v['vin'], 32)?.toUpperCase().replace(/[\s-]/g, '') ?? null,
    stock: text(v['stock'], 80),
    price: quote ? text(quote, 20) : null,
    comments: text(v['comments'], 2000),
  };
}

function contactName(contact: Node | undefined): string | null {
  const names = list(contact?.['name']);
  const full = names.find(n => attr(n, 'part') === 'full');
  if (full) return text(full, 160);
  const ordered = ['first', 'middle', 'last', 'suffix']
    .map(part => names.find(n => attr(n, 'part') === part))
    .filter((n): n is Node => !!n)
    .map(n => text(n, 80));
  const joined = ordered.filter(Boolean).join(' ');
  return joined ? joined.slice(0, 160) : names[0] ? text(names[0], 160) : null;
}

const EMAIL_RE = /^[^\s@<>()",;]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

function toParty(node: unknown): AdfParty | null {
  const n = list(node)[0];
  if (!n) return null;
  const id = list(n['id'])[0];
  const email = text(n['email'], 255);
  return {
    id: id ? text(id, 120) : null,
    idSource: attr(id, 'source'),
    name: text(n['vendorname'], 160) ?? contactName(n) ?? text(n['name'], 160),
    url: text(n['url'], 255),
    email: email && EMAIL_RE.test(email) ? email.toLowerCase() : null,
    service: text(n['service'], 120),
  };
}

function toProspect(p: Node): AdfProspect {
  const warnings: string[] = [];
  const customer = list(p['customer'])[0];
  const contacts = list(customer?.['contact']);
  const contact = contacts.find(c => attr(c, 'primarycontact') === '1') ?? contacts[0];
  const emails = list(contact?.['email']);
  const phones = list(contact?.['phone']);
  const rawEmail = emails.map(e => text(e, 255)).find(Boolean) ?? null;
  const email = rawEmail && EMAIL_RE.test(rawEmail) ? rawEmail.toLowerCase() : null;
  if (rawEmail && !email) warnings.push('INVALID_EMAIL');
  const phoneNode = phones.find(ph => attr(ph, 'type') !== 'fax') ?? phones[0];
  const rawPhone = phoneNode ? text(phoneNode, 40) : null;
  const phone = rawPhone && rawPhone.replace(/\D/g, '').length >= 7 ? rawPhone.replace(/[^\d+()\-. x]/gi, '').slice(0, 40) : null;
  if (rawPhone && !phone) warnings.push('INVALID_PHONE');
  if (!email && !phone) warnings.push('NO_CONTACT');
  const preferred = emails.some(e => attr(e, 'preferredcontact') === '1') ? 'email'
    : phones.some(ph => attr(ph, 'preferredcontact') === '1') ? 'phone' : null;
  const address = list(contact?.['address'])[0];

  const vehicles = list(p['vehicle']).map(toVehicle);
  if (vehicles.length === 0) warnings.push('NO_VEHICLE');

  const comments = [text(customer?.['comments'], 4000), text(p['comments'], 4000)].filter(Boolean).join('\n\n');
  return {
    status: attr(p, 'status'),
    ids: list(p['id']).slice(0, 10).flatMap(id => {
      const value = text(id, 120);
      return value ? [{ value, source: attr(id, 'source'), sequence: attr(id, 'sequence') }] : [];
    }),
    requestDate: text(p['requestdate'], 40),
    vehicles,
    contact: { name: contactName(contact), email, phone, preferredContact: preferred, postalCode: text(address?.['postalcode'], 20) },
    comments: comments ? comments.slice(0, 4000) : null,
    vendor: toParty(p['vendor']),
    provider: toParty(p['provider']),
    warnings,
  };
}

/** Vehicles the buyer is asking about. A trade-in is the buyer's own car and never matches inventory. */
export function inquiryVehicles(prospect: AdfProspect): AdfVehicle[] {
  return prospect.vehicles.filter(v => v.interest !== 'trade-in' && v.interest !== 'sell');
}
