# v2 Platform Profile Validation Patch

This is a copy-safe patch on top of v1. It keeps the POC focused on the hardest slice:

```txt
Dealership Profile + Vehicles
→ Platform Profile Requirements
→ Authorization Packet
→ Fake Email/Submission
→ Mock Platform Receipt
→ GREEN/YELLOW/RED Readiness
```

## What changed

- Platform profiles now carry freshness/quality metadata:
  - `profileConfidence`
  - `needsReview`
  - `sourceNote`
  - `mockEndpoint`
- A new `npm run poc:green` command validates every seeded platform without a database.
- Controlled-bubble submissions write:
  - mock email JSON files to `./mock-outbox`
  - mock platform receipt JSON files to `./mock-platform-receipts`
- DB-backed fake submissions now store mock receipt data and accepted/rejected flags.

## Green flag meaning

A platform is `GREEN` when:

- Dealership required fields pass.
- Vehicle required fields pass.
- Media rules pass.
- Platform profile is not stale or marked `needsReview`.
- A mock authorization/submission packet can be generated.
- A mock receipt can be generated.

This does **not** mean the real platform approved us. It means our internal platform profile is currently coherent enough to support fake onboarding and fake posting in our controlled test bubble.

## Commands

Fast no-DB check:

```bash
npm run poc:green
```

DB-backed flow:

```bash
npm run db:push
npm run db:seed
npm run onboard:fake
npm run submit:fake
npm run report
```

## Intentionally not included yet

- Live marketplace API calls
- Real OAuth
- Real email delivery
- Real SFTP
- Browser automation
- Full STAR implementation
- Full frontend dashboard
