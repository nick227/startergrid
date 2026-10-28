# Inbound ADF/XML marketplace lead ingestion — design

Date: 2026-10-28. Owner: Claude. Status: design approved in direction, not implemented.
Depends on: Activity/Team foundation being committed first (step 1 below). Until then this work touches none of the uncommitted Activity/Team files (`ActivityPage`, `TeamPage`, `businessActivityService`, `workspaces.*`, the `dealership_team` migration).

## Goal

Marketplaces such as Cars.com, Autotrader and CarGurus send buyer inquiries as ADF/XML **email**. Dealers forward those emails to a DealerGrid address. DealerGrid identifies the dealership, keeps the source, links the vehicle only when the match is certain, and creates a normal `Lead` in the existing Leads workflow. Activity, channel results and attribution then read that lead.

Non-goals: outbound ADF delivery (already exists as `adf-xml-lead-routing`), CRM sync, and any change to attribution rules (`saleAttribution.ts` is unchanged; inbound leads are inputs to it).

## Delivery path

```
Marketplace ──email──▶ leads+<routeToken>@in.dealergrid.<domain>   (MX → inbound provider)
                         │
                Inbound provider (Postmark) parses MIME, POSTs JSON
                         │
      POST /api/inbound/email/:provider   ── adapter verifies the delivery service only
                         │
      InboundEmailMessage row (always persisted first, raw retained)
                         │
      process: route → parse ADF → provenance → dedupe → vehicle match → Lead
```

Marketplaces send to an email address, not a URL. The inbound provider receives the mail and calls our webhook.

## Provider-neutral adapter

```ts
interface InboundEmailAdapter {
  provider: 'postmark';                          // future: 'sendgrid' | 'mailgun' | 'ses'
  verifyDelivery(req): boolean;                  // proves the request came from the provider, nothing more
  normalize(body): NormalizedInboundEmail;
}

type NormalizedInboundEmail = {
  provider: string;
  providerMessageId: string;                     // provider's id, idempotency key for webhook retries
  rfcMessageId: string | null;                   // Message-ID header
  envelopeRecipient: string;                     // OriginalRecipient
  routeToken: string | null;                     // plus-address hash
  from: { email: string; name: string | null };
  replyTo: string | null;
  subject: string | null;
  receivedAt: Date;
  headers: Array<{ name: string; value: string }>;
  authResults: { spf: AuthVerdict; dkim: AuthVerdict; dkimDomain: string | null; dmarc: AuthVerdict; raw: string | null };
  textBody: string | null;
  htmlBody: string | null;
  attachments: Array<{ name: string; contentType: string; size: number; content: Buffer }>;
  rawMime: string | null;
};
type AuthVerdict = 'pass' | 'fail' | 'none' | 'unknown';
```

Domain code depends only on `NormalizedInboundEmail`. Postmark specifics stay in `src/services/inbound/adapters/postmarkAdapter.ts`.

### Postmark specifics (checked 2026-10-28)

- **Plan:** inbound processing is listed only on the **Pro ($16.50/mo)** and **Platform ($18/mo)** tiers, not on Basic or Free. The pricing page does not say whether inbound messages count toward the monthly volume. **Confirm with Postmark sales before committing.**
- **Payload:** `From`/`FromFull`, `OriginalRecipient`, `MailboxHash` (the plus-address part), `MessageID`, `Headers[]`, `TextBody`, `HtmlBody` and `Attachments[]` (base64). `RawEmail` is included only when "Include raw email content in JSON payload" is enabled on the server. Enable it, because original headers and DKIM need it.
- **Authenticating the delivery service:** Postmark has no request signature. Use HTTPS plus Basic Auth credentials embedded in the webhook URL (stored in a Railway secret, rotatable). Optionally also allowlist Postmark's published IP ranges.
- **SPF/DKIM:** Postmark has no structured auth-results field. SpamAssassin results appear in `X-Spam-Tests` (`SPF_PASS`, `DKIM_VALID_AU`, …), and the original `Authentication-Results`/`Received-SPF` headers can be read from the raw MIME. The adapter records what it finds and uses `unknown` otherwise.
- **Retries:** if we don't return a 200, Postmark retries 10 times over about 10 hours. A 403 stops retries. Return 200 once the message is persisted, even if processing later fails. Return 401/403 only when verification fails.
- **Domain:** use a dedicated inbound subdomain with its MX record pointed at Postmark. Don't use the main sending domain.

## Trust model

A webhook that passes verification proves only that Postmark delivered the message. It does not prove the lead is genuine or which marketplace sent it.

Every inbound message records a separate **provenance** verdict:

| Field | Source |
|---|---|
| `envelopeFrom`, `headerFrom`, `replyTo` | email |
| `rfcMessageId`, `providerMessageId` | email / provider |
| `authResults` (SPF, DKIM + signing domain, DMARC) | headers / raw MIME |
| `adfProviderName`, `adfProviderUrl`, `adfVendorName` | ADF `<provider>` / `<vendor>` |
| `claimedPlatformSlug` | mapped from ADF provider name |
| `providerTrust` | `VERIFIED` \| `CLAIMED` \| `CONFLICTING` \| `UNKNOWN` |

`providerTrust` rules:

- **VERIFIED:** the ADF provider maps to a known platform, **and** DKIM passes for a domain on that platform's allowlist (a `knownSenderDomains` registry such as `cars.com` → `cars-com`, kept in code and reviewed). Only verified leads get `Lead.platformSlug = <marketplace>`.
- **CLAIMED:** the ADF names a known provider, but sender authentication is missing or comes from an unlisted domain. This is common when the dealer forwards through their own mailbox. The lead is created with `platformSlug = 'adf-email-unverified'`, and the claimed provider is stored for display ("says Cars.com, not verified"). Channel results do not count it as that marketplace.
- **CONFLICTING:** the ADF provider and the DKIM domain point to different known platforms, or several provider blocks disagree. The lead is created as unverified and flagged for review.
- **UNKNOWN:** no recognizable provider. The lead is created as unverified.

Dealer-forwarded mail breaks DKIM alignment, so most leads will start as CLAIMED. To cover that, a dealer can later confirm "this sender is my Cars.com lead feed" for a specific `(routeToken, sender address, DKIM domain)` combination. Even then the lead never becomes VERIFIED; it is marked as dealer-confirmed (`MANUAL_IMPORTED` under the existing `SourceConfidence` vocabulary), so the evidence stays honest. This is optional and comes after v1.

## ADF parsing (secure)

Replace the regex stub `captureAdfLead` with a real parser in `src/services/inbound/adfParser.ts`:

- **Finding the ADF:** check, in order, an `.xml`/`application/xml` attachment, then a `<?adf` / `<adf>` block in the text body, then the same in the HTML body (entity-decoded).
- **XML hardening:** use `fast-xml-parser` with entity processing and DOCTYPE disabled (rejecting any DOCTYPE outright) and no external resolution. This guards against XXE and entity-expansion ("billion laughs") attacks. Limits are 256 KB of XML, depth 32 and 50 `<vehicle>` nodes. Strip control characters, and cap field lengths at the `Lead` column sizes.
- **Mapping:** `<prospect>` → `<requestdate>`, `<vehicle interest="buy">` (VIN, stock, year, make, model, trim, price), `<customer><contact>` (name parts joined, email, phone; keep the preferred contact method), `<comments>`, `<provider>`, `<vendor>`. Treat a multi-vehicle prospect as one lead with all vehicles kept in `vehicleInterest.vehicles[]`, and use the first `interest="buy"` vehicle as the match candidate.
- **Output:** `{ ok: true, lead }` or `{ ok: false, reason }`, with reasons `NO_ADF_FOUND`, `MALFORMED_XML`, `LIMIT_EXCEEDED`, `NO_CONTACT`. The parser never throws on bad input.

## Routing (dealership identification)

- Each dealership gets an opaque `routeToken`, 16+ random characters, not derived from the dealership id: `leads+<routeToken>@in.dealergrid…`. Tokens can be rotated, and the old token keeps working for a grace period with a flag.
- An unknown or missing token, or a token belonging to a disabled dealership, gives status `UNROUTED`. The message is retained and never dropped.
- The dealership is identified **only** from the token. Dealer names or addresses inside the ADF are stored but never used for routing.

## Vehicle matching

Matching is scoped to the routed dealership:

1. **Stock number:** `Vehicle @@unique([dealershipId, stockNumber])` gives a confident match on a normalized exact match (trimmed, case-folded).
2. **VIN:** a 17-character VIN that passes the check digit gives a confident match only when **exactly one** vehicle in the dealership has that VIN. VIN is not unique in the schema, so several matches are treated as ambiguous.
3. **Stock and VIN disagree** (each points to a different vehicle): do not link either one. Record both as suggestions.
4. **Year, make, model and trim:** never linked automatically. Record up to 5 candidates in `InboundLeadVehicleSuggestion` for a person to review in Leads ("Possible vehicle: …, confirm?").

`Lead.vehicleId` is set only by rules 1–2, or later by a person confirming a suggestion.

## Deduplication

- **Transport retry:** a unique key on `(provider, providerMessageId)` returns 200 without reprocessing.
- **Same inquiry delivered twice** (dealer forwarding plus a direct copy, or a marketplace resend): match on `rfcMessageId` within the dealership. If there is no Message-ID, fall back to a hash of normalized `(dealershipId, contact email/phone, ADF requestdate, vehicle VIN/stock, provider)` within 72 h. A duplicate is linked to the existing lead (`duplicateOfLeadId`) and does not create a new lead.
- Repeat inquiries from the same buyer about a different vehicle or on a different day are **separate** leads. That is a real signal.

## Data model (new migration, separate from `dealership_team`)

```prisma
model InboundEmailRoute {
  id            String   @id @default(cuid())
  dealershipId  String
  routeToken    String   @unique @db.VarChar(40)
  status        InboundRouteStatus @default(ACTIVE)   // ACTIVE | ROTATED | DISABLED
  createdAt     DateTime @default(now())
  rotatedAt     DateTime?
  dealership    DealershipProfile @relation(fields: [dealershipId], references: [id], onDelete: Cascade)
  @@index([dealershipId])
}

model InboundEmailMessage {
  id                 String   @id @default(cuid())
  provider           String   @db.VarChar(20)
  providerMessageId  String   @db.VarChar(120)
  rfcMessageId       String?  @db.VarChar(255)
  dealershipId       String?                         // null when UNROUTED
  routeToken         String?  @db.VarChar(40)
  envelopeRecipient  String   @db.VarChar(255)
  fromEmail          String   @db.VarChar(255)
  subject            String?  @db.VarChar(255)
  receivedAt         DateTime
  provenance         Json                            // auth results, ADF provider/vendor, claimed slug
  providerTrust      InboundProviderTrust            // VERIFIED | CLAIMED | CONFLICTING | UNKNOWN
  status             InboundMessageStatus            // RECEIVED | LEAD_CREATED | DUPLICATE | UNROUTED | PARSE_FAILED | NEEDS_REVIEW | DISMISSED
  failureReason      String?  @db.VarChar(60)
  rawStorageKey      String?  @db.VarChar(255)       // raw MIME / payload in object storage, not in MySQL
  leadId             String?
  duplicateOfLeadId  String?
  reviewedBy         String?  @db.VarChar(30)
  reviewedAt         DateTime?
  createdAt          DateTime @default(now())
  @@unique([provider, providerMessageId])
  @@index([dealershipId, status])
  @@index([dealershipId, rfcMessageId])
}

model InboundLeadVehicleSuggestion {
  id         String  @id @default(cuid())
  leadId     String
  vehicleId  String
  basis      String  @db.VarChar(20)    // YMM | STOCK_VIN_CONFLICT | VIN_AMBIGUOUS
  resolution String? @db.VarChar(12)    // CONFIRMED | REJECTED
  @@unique([leadId, vehicleId])
}
```

`Lead` gets `inboundMessageId String? @unique` so every lead traces back to its message. Its `adfPayload` keeps the parsed ADF (`{ xml, parsedVersion }`). No other `Lead` columns change.

**Raw retention:** raw payloads go to a Railway bucket with a 90-day lifecycle (configurable). They contain buyer PII, so the bucket is private and access-logged, and raw content is never returned by any dealer-facing API.

## Preserving failures

Nothing a buyer sent is silently discarded:

- Every verified delivery is written to `InboundEmailMessage` **before** processing, and the 200 response is sent after that write.
- `UNROUTED` messages (no dealership) go to the **staff/admin** review queue only, never to any dealer's view, because the recipient is unknown. Staff can assign one to a dealership, which reprocesses it.
- `PARSE_FAILED` messages appear in the dealership's delivery status list with the reason. Staff can view a redacted extract and reprocess after a parser fix.
- `NEEDS_REVIEW` (conflicting provider, or contact details missing but a body present): the lead is still created so the buyer gets a response, and the message is flagged.
- Processing exceptions leave the message in `RECEIVED`. A sweeper retries it with backoff, and anything stuck for more than 1 h raises an operational alert.
- Dismissing a message requires a reason and records who dismissed it and when.

## Joining the existing workflow

Leads are created through the existing `persistLead` (`lifecyclePersistenceService.ts`) with `source: 'ADF_XML'`. After that, the existing `notifyLeadCaptured` (`dealerNotificationService.ts`) runs, as `captureMarketplaceLead` does now. Assignment, status (`LeadWorkflowStatus`), CRM handoff and outbound delivery need no changes. Activity reads `Lead` and needs no special path.

## API surface

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/inbound/email/postmark` | adapter verification (Basic Auth over HTTPS) | webhook; classified as a machine ingress route in `routeContract` |
| `GET /api/dealers/:id/inbound-email` | `requireDealerAccess` | address, last received, counts by status for the last 30 days |
| `GET /api/dealers/:id/inbound-email/messages?status=` | `requireDealerAccess` | delivery list (metadata only, no raw content) |
| `POST /api/dealers/:id/inbound-email/rotate` | dealer admin | rotate token |
| `POST /api/dealers/:id/leads/:leadId/vehicle-suggestions/:sid` | `requireDealerAccess` | confirm or reject a suggestion |
| `GET/POST /api/admin/inbound-email/unrouted…` | staff | review, assign, reprocess, dismiss |

All of these go into `openapi/openapi.yaml` and `routeContract.test.ts`.

## Execution order

1. **Activity/Team foundation committed** (another owner). Blocking for steps 3+ only.
2. **Inbound routing and secure parsing:** adapter interface, Postmark adapter, webhook route, `InboundEmailRoute` and `InboundEmailMessage` migration, raw storage, hardened ADF parser with a fixture corpus (Cars.com, Autotrader, CarGurus samples, and hostile XML). Can start now, because none of it touches Activity/Team files.
3. **Workflow connection:** routing, vehicle matching and suggestions, `persistLead` and `notifyLeadCaptured`.
4. **Attribution, dedupe and ops:** provenance and `providerTrust`, the known-sender registry, the dedupe rules, the sweeper, alerts, and the admin unrouted queue.
5. **Settings surface:** inbound address with a copy button, forwarding instructions for each marketplace, and delivery status. Placement follows the navigation redesign (not owned here).

## Tests

- **Parser:** a fixture corpus covering valid ADF, ADF in the body versus an attachment, HTML-entity ADF, multiple vehicles, missing contact, DOCTYPE/XXE, entity expansion, oversized and deeply nested input.
- **Adapter:** Postmark sample payloads, Basic Auth rejected or accepted, and retry idempotency.
- **Trust:** each `providerTrust` branch, and confirming an unverified lead is never counted as a marketplace in `channelRoiService`.
- **Matching:** stock hit, unique VIN, duplicate VIN, stock/VIN conflict, and YMM producing suggestions only.
- **Database tests (isolated MySQL, like `salesIntegrityDatabase.test.ts`):** end to end from webhook to `Lead` to notification. Unrouted, parse-failed and duplicate messages are all preserved, and nothing can be read across dealerships.

## Open decisions

1. Postmark plan (Pro vs Platform) and whether inbound counts toward volume (confirm with Postmark).
2. Inbound domain name (`in.dealergrid…`?), plus DNS ownership on Railway or the registrar.
3. Raw retention period (90 days proposed) and whether the bucket already exists.
4. Whether `adf-email-unverified` should appear in channel comparisons as its own line ("Email leads, source unverified") or stay hidden. Recommendation: show it, labelled honestly.
