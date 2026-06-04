# Auto Dealer Onboarding POC v2.5.1 Patch

Copy-safe patch update for v2.5.

## Fix

The v2.5 `STALE_PROFILE` scenario only forced stale metadata onto some platform profiles. A few profiles could still remain fresh and pass GREEN.

v2.5.1 changes `stalePlatformProfiles.fixture.ts` so every platform profile is mutated through the same helper:

- `lastVerifiedAt` is forced to `2024-01-01T00:00:00.000Z`
- `needsReview` is forced to `true`
- `profileConfidence` is downgraded
- `sourceNote` is tagged with stale-fixture context

## Expected result

```bash
npm run poc:risk
```

Expected summary:

```txt
40/40 scenario expectations passed
```

The `STALE_PROFILE` block should no longer produce GREEN rows.
