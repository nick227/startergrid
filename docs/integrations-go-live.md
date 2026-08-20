# Platform Integrations Go-Live Guide

This is the playbook for turning on real (non-mock) platform integrations. It did not exist before — this repo has 31 platform profiles seeded in the DB (`src/data/platformProfiles.ts`), but no single document explained which of them are actually wired to real code, what credentials each needs, or how to verify one before flipping it on for a real dealer. This doc is that reference.

**Status as of this writing: nothing is live in production.** All credential env vars are unset. Going live with any platform is an explicit, per-platform decision — see the checklist near the bottom.

---

## The mental model: two credential layers

Every OAuth-class platform has two separate layers of credentials, and go-live requires both:

1. **App-level OAuth credentials** — one client ID/secret per platform, registered once with that provider's developer console, set as env vars on the Railway service. These identify *this application* to the platform.
2. **Per-dealer connection** — each dealer clicks "Connect" on that platform in the operator UI (Platform Detail Drawer), completes the OAuth consent flow, and their access/refresh tokens are stored in the DB via `CredentialStore`. This authorizes *that dealer's account* for that platform.

Setting the env vars in step 1 does not connect any dealer. Each dealer must individually connect (or be reconnected if a token expires/is revoked).

---

## Tier 1 — Catalog Sync: 10 platforms, real code, ready to configure

These are wired end-to-end today (`src/server/routes/catalogSync.ts` → `BRIDGE_REGISTRY` → real catalog client + OAuth client per platform). No dev-only stub sits between credentials and a live API call — once app credentials are set and a dealer connects, catalog sync writes to the real platform API.

| Platform | Slug | Env vars | Verify |
|---|---|---|---|
| Google Vehicle Ads | `google-vehicle-ads` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `npm run smoke:google-oauth`, `npm run smoke:google-catalog` |
| Meta Automotive Ads | `meta-automotive-ads` | `META_APP_ID`, `META_APP_SECRET` | `npm run smoke:meta-oauth`, `npm run smoke:meta-catalog` |
| TikTok Automotive Ads | `tiktok-automotive-ads` | `TIKTOK_CLIENT_ID`, `TIKTOK_CLIENT_SECRET` | `npm run smoke:tiktok-catalog` |
| TikTok Shop | `tiktok-shop` | `TIKTOK_SHOP_APP_KEY`, `TIKTOK_SHOP_APP_SECRET` ⚠️ see gap below | `npm run smoke:tiktok-shop` |
| Microsoft Advertising (Automotive) | `microsoft-automotive-ads` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | `npm run smoke:microsoft-catalog` |
| Pinterest Shopping Ads | `pinterest-shopping-ads` | `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET` | `npm run smoke:pinterest-catalog` |
| Snapchat Dynamic Product Ads | `snapchat-dynamic-product-ads` | `SNAPCHAT_CLIENT_ID`, `SNAPCHAT_CLIENT_SECRET` | `npm run smoke:snapchat-catalog` |
| Reddit Dynamic Product Ads | `reddit-dynamic-product-ads` | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | `npm run smoke:reddit-catalog` |
| X Dynamic Product Ads | `x-dynamic-product-ads` | `X_CLIENT_ID`, `X_CLIENT_SECRET` | `npm run smoke:x-catalog` |
| Nextdoor Ads | `nextdoor-ads` | `NEXTDOOR_CLIENT_ID`, `NEXTDOOR_CLIENT_SECRET` | `npm run smoke:nextdoor-catalog` |

**⚠️ Known gap:** `TikTokShopOAuthClient` reads `TIKTOK_SHOP_APP_KEY`/`TIKTOK_SHOP_APP_SECRET` — separate credentials from regular TikTok, from a separate TikTok Shop Partner Center app. `.env.example` doesn't list these yet. Add them before attempting TikTok Shop go-live.

---

## Tier 2 — eBay Motors: real, but its own subsystem

Not part of Catalog Sync — eBay uses the Sell Inventory API directly (listing lifecycle, not a catalog feed).

| Env var | Where it comes from |
|---|---|
| `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` | eBay Developer Portal app |
| `EBAY_RUNAME` | eBay Developer Portal — used as the OAuth `redirect_uri` |
| `EBAY_ENVIRONMENT` | `sandbox` while testing, blank/unset for production |
| `EBAY_FULFILLMENT_POLICY_ID` / `EBAY_PAYMENT_POLICY_ID` / `EBAY_RETURN_POLICY_ID` | eBay seller account → Business Policies |
| `EBAY_MERCHANT_LOCATION_KEY` | Sell Account API or Seller Hub (optional on some accounts) |

Verify: `npm run smoke:ebay-oauth` then `npm run smoke:ebay-listing`. Note `EBAY_ENVIRONMENT` gates sandbox vs. production independently of everything else in this doc — leave it `sandbox` until the listing smoke test has been run clean against sandbox.

---

## Tier 3 — Social page connections

Real API clients (`FacebookGraphClient`, `GoogleBusinessProfileClient`), separate from both Catalog Sync and eBay.

| Platform | Slug | Env vars | Verify |
|---|---|---|---|
| Facebook Business Page | `facebook-business-page` | `META_APP_ID` / `META_APP_SECRET` (shared with Meta Catalog) | `npm run smoke:meta-oauth` — despite the name, its own header says it specifically tests the `facebook-business-page` provider (page posting scopes), not the catalog/ads provider |
| Facebook Marketplace (General Listings) | `facebook-marketplace-general` | `META_APP_ID` / `META_APP_SECRET` | No dedicated smoke script yet |
| Google Business Profile | `google-business-profile` | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (shared with Google Vehicle Ads) | No dedicated smoke script yet |
| LinkedIn Lead Gen Forms | `linkedin-lead-gen-forms` | `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` (same Azure AD app — grant both Bing Ads and LinkedIn API permissions on it) | No dedicated smoke script yet |

---

## Tier 4 — Apple Business Connect: manual, JWT-based

Not OAuth — Apple uses a JWT signed with an ES256 private key.

| Env var | Where it comes from |
|---|---|
| `APPLE_CLIENT_ID` | Apple Developer account |
| `APPLE_PRIVATE_KEY` | Downloaded `.p8` file from Apple Developer, stored as a single-line PEM |
| `APPLE_KEY_ID` | Apple Developer → the key's ID |
| `APPLE_TEAM_ID` | Apple Developer → team ID |

No smoke script exists for this one yet.

---

## Tier 5 — Partner-feed platforms (12): not an engineering task first

These are `ASSISTED` or `PARTNER_DEPENDENT` in `platformProfiles.ts` — CarGurus, Autotrader/Cox, Cars.com, TrueCar, CARFAX, RV Trader, Cycle Trader, ATV Trader, Trailer Trader, Boat Trader, YachtWorld, Boats.com. None of them have an OAuth client in this codebase; their `connectionType` is `PARTNER_FEED`. Going live with one of these means:

1. **Business development first** — the dealer (or you, on their behalf) signs an agreement directly with that network. This is a sales/legal step, not a code change.
2. Once the dealer has a partner account, the integration is a feed file (XML/CSV) generated by this app and either pulled by the partner or pushed to wherever they specify — not a credential you configure here.

Don't scope engineering work for these until a partner agreement exists to build against.

---

## Owned channels: nothing required

`dealer-storefront` and `consumer-marketplace` are first-party — no external account, no credentials, no go-live gate. `adf-xml-lead-routing` (`connectionType: NONE`) is a lead-export format, not a platform account either.

---

## The Dispatch/Scheduler pipeline is a separate, still-stubbed gate

`DISPATCH_ENVIRONMENT` (`MOCK` / `SANDBOX` / `PRODUCTION`) controls a **different, narrower** code path — `src/services/publishing/dispatchAdapter.ts`, used by the sync scheduler. As of this writing, `SANDBOX` and `PRODUCTION` both throw `DispatchNotImplementedError` unconditionally — setting `DISPATCH_ENVIRONMENT=PRODUCTION` does not unlock anything, because there's no implementation behind it yet, regardless of what platform credentials are configured. Don't confuse this with the tiers above: Catalog Sync and eBay already make real API calls once configured, independent of this variable. Only the generic scheduler-driven dispatch path is gated by it, and that path currently goes nowhere for any environment except `MOCK`.

If a future task implements real `SANDBOX`/`PRODUCTION` dispatch, update this section.

---

## Going live with one OAuth-class platform: the checklist

1. **Register a developer app** with the provider (Meta for Developers, Google Cloud Console, eBay Developer Portal, etc.). Request the scopes the relevant client actually uses — check `src/services/platform/clients/providers/<Provider>OAuthClient.ts` for the exact scope list.
2. **Set `OAUTH_REDIRECT_BASE_URL`** to this deployment's real public URL (e.g. `https://auto-dealer-operator-ui-production.up.railway.app`), and register `{OAUTH_REDIRECT_BASE_URL}/api/oauth/callback` as the redirect URI in the provider's console. Mismatches here are the most common OAuth failure.
3. **Set the platform's env vars** (table above) on the Railway service.
4. **Run the matching smoke script locally first**, against a real dev server, with real credentials, before touching production. Each smoke script's file header (`src/scripts/dev/*Smoke.ts`) documents its exact prerequisites — read it before running.
5. **If the provider app is in development/test mode** (Meta and Google both default to this), add your own account as a tester — production scopes usually require an app review process with the provider, which can take days.
6. **Connect a real dealer** through the operator UI's Platform Detail Drawer and confirm the CatalogSyncPanel shows a synced status, not an error.
7. **Only after that succeeds**, repeat for additional dealers.

Do this one platform at a time. There's no bulk "go live" switch, by design — each platform is a distinct blast radius.

---

## Also gating real usage, not platform-specific

Two things from `docs/deployment.md` block real-world use regardless of which platforms you turn on:

- **`STORAGE_DRIVER=local`** (the default) loses uploaded files on every redeploy — Railway's container disk is ephemeral. Switch to `STORAGE_DRIVER=s3` before any dealer uploads real vehicle photos.
- **`SMTP_ENABLED=false`** (the default) means lead notification emails silently no-op. Set it `true` with real SMTP credentials before depending on email alerts.

---

## What this doc doesn't cover

- How each platform's catalog schema maps to this app's vehicle data model — that's in `src/services/catalog/bridges/`.
- Rotating or revoking a dealer's platform connection — that's operator-UI, not env config.
- Rate limits or quota behavior per provider once live at volume.
