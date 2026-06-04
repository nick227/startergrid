# MVP Scope And Milestones

## MVP Thesis

Sell the first product as:

```txt
Dealer Storefront + Readiness Report + Platform Activation Proof Folder
```

Do not sell it as a full DMS, full CRM, agency, lender system, or guaranteed marketplace approval service.

## Must Ship

- DB-backed dealer profile
- DB-backed inventory and media
- Dealer Storefront owned channel
- pristine fixture import path
- readiness run tied to dealership and inventory snapshot
- generated artifacts for owned, feedable, assisted, and lead channels
- submission attempt records
- dealer-facing status labels
- lead capture for owned storefront
- proof folder export

## Not MVP

- finance applications
- lender routing
- accounting
- service department workflows
- automated paid ad optimization
- guaranteed marketplace activation
- live API credentials for every partner
- full DMS import marketplace

## Milestone 1: DB-Backed Pristine Dealer

Acceptance:

- `pristineApiDealership` persists
- all pristine vehicles persist with media
- no JSON-only shortcut for fields that are now stable
- `npm run validate:pristine` still passes

## Milestone 2: Readiness Runs Become Dealer-Specific

Acceptance:

- readiness run stores `dealershipId`
- run references inventory snapshot/artifact version
- baseline and strict results are stored separately
- issue list includes path, severity, message, and next action

## Milestone 3: Storefront Active

Acceptance:

- dealer storefront artifact generated from DB data
- at least one public-style vehicle listing URL generated
- lead capture creates a `Lead`
- owned channel status can become `ACTIVE`

## Milestone 4: Proof Folder

Acceptance:

- dealer profile summary
- inventory readiness report
- storefront artifact
- platform output artifacts
- authorization packet
- submission/receipt records
- open blockers

## Milestone 5: Assisted Channel Workflow

Acceptance:

- CarGurus/Cars.com/Autotrader/TrueCar packet generated
- manual/rep handoff status tracked
- partner attribution record planned or stubbed
- dealer sees exact next action

