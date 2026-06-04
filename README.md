# Auto Dealer Onboarding POC v2 Patch

Copy this patch over the v1 POC root. It is a changed/new-files-only update, not a full replacement project.

v2 laser-focuses on proving that platform profiles can drive fake onboarding, fake posting/submission, email simulation, mock receipts, and green/yellow/red readiness validation.

## Apply

From the parent folder that contains `auto-dealer-onboarding-poc-v1`:

```bash
cp -R auto-dealer-onboarding-poc-v2-patch/* auto-dealer-onboarding-poc-v1/
cd auto-dealer-onboarding-poc-v1
```

On Windows PowerShell:

```powershell
Copy-Item -Recurse -Force .\auto-dealer-onboarding-poc-v2-patch\* .\auto-dealer-onboarding-poc-v1\
cd .\auto-dealer-onboarding-poc-v1
```

## Fastest v2 proof

No database required:

```bash
npm install
npm run poc:green
```

Expected result:

```txt
8/8 platform profiles GREEN
```

Generated artifacts:

```txt
mock-outbox/*.json
mock-platform-receipts/*.json
```

## DB-backed proof

```bash
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run onboard:fake
npm run submit:fake
npm run report
```

## v2 slice

```txt
Dealership Profile
→ Platform Profile Match
→ Readiness Validation
→ Authorization Packet
→ Mock Submission Email
→ Mock Platform Receipt
→ Progress Tracking
```

## Major platform profiles included

- Google Vehicle Ads
- Meta Automotive Inventory Ads
- TikTok Automotive Ads Inventory Catalog
- CarGurus Dealer Marketplace
- Autotrader / Cox Automotive Dealer Solutions
- Cars.com / Cars Commerce
- TrueCar Dealer Network
- ADF/XML Lead Routing

## Important boundary

This POC does not claim live platform approval. `GREEN` means our internal schema, packet, validation, and mock submission flow are coherent enough to keep iterating toward real platform onboarding.
