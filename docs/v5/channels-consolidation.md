# Channels consolidation: implementation spec (2026-10-27)

Owner: Claude, backend and frontend. Replaces the drawer and full-page split with one overview and one page per channel.

## 1. Purposes
Each channel has exactly one backend-assigned `primaryPurpose`. Overview totals count every channel once, under that purpose. Other abilities stay as `capabilities` chips and never add to counts.

| Purpose | Meaning | Examples |
|---|---|---|
| MARKETPLACE | Buyers browse and contact you there | Auto Marketplace, CarGurus, Cars.com, Autotrader, eBay Motors, Facebook Marketplace, Traders, Etsy… |
| SOCIAL_ADVERTISING | Ads, social catalogs and business profiles | Google Vehicle Ads, Meta, TikTok, Pinterest, LinkedIn Lead Gen, Facebook Page, Google/Apple Business Profile |
| INVENTORY_FEED | A feed into a site or system you run | Dealer storefront feed, Shopify catalog |
| LEAD_DELIVERY | Sends your inquiries somewhere | CRM lead delivery (ADF/XML) |

Capabilities: LISTINGS, SOCIAL_POSTS, CATALOG, PARTNER_FEED, LEADS, taken from the existing profile flags. Source: `src/services/channels/channelPurpose.ts`. A test assigns every profile exactly one purpose.

## 2. One primary status, separate facts
`GET /api/dealers/:id/channels/overview[?channel=slug]` returns, per channel:

- `displayStatus`: one of the values below. It is evidence-based, and its `displayReason` gives the reason in one sentence.
  - NOT_SET_UP: nothing started.
  - SETTING_UP: started, setup plan not READY; `waitingOn` names the step owner.
  - NEEDS_ATTENTION: started, and something is wrong (sign-in expired, connection check failed, account on hold, setup blocked on StarterGrid, failed or unconfirmed distribution, or an open incident).
  - CONNECTED: setup plan READY, or a StarterGrid-owned channel that is on.
- Kept separately:
  - `setup`: plan status, progress, current step owner.
  - `connection`: VERIFIED only after a passed connection check, or a live sign-in token; otherwise NOT_CHECKED or FAILED.
  - `distribution`: counts from Autopilot distribution targets: `verifiedLive` (VERIFIED_LIVE with evidence), `inProgress`, `problems`.

CONNECTED never means listings are live. Distribution numbers come only from recorded evidence. Local queue rows and "mark done" confirmations never count as an external success.

## 3. Channels overview (`#/:dealer/channels`, Channels nav item)
- **Four purpose cards.** Each shows its label, one line of description and counts (connected, setting up, needs attention). Clicking a card filters the page to that purpose.
- **"Your channels" list,** in three groups: Needs attention, Setting up ("waiting on CarGurus"), Connected. Each row shows the status reason and distribution facts, and opens the channel page.
- **"Add a channel":** channels not set up yet, grouped by purpose. Clicking one opens that channel's setup.
- **Kept as they are:** the Autopilot card, the sold-vehicle take-down card, and the connect-result banners.
- **The admin dealership record** uses the same overview, and opens channels in support mode (`dealerViewHash`).

## 4. One page per channel (`#/:dealer/channels/:slug[/view]`)
The drawer (`PlatformDetailDrawer`) is removed. Cards and old deep links open this page.

Views (the `channelView` route field):

| View | Content |
|---|---|
| `overview` (default) | When not CONNECTED, the setup wizard (`ChannelSetupGuide`, the only setup implementation): resumable, one current action, owners, a waiting state with a way out. When CONNECTED: connection and distribution facts, the next action, queue summary, and capability sections that link to focused views. |
| `setup` | Deep link to the wizard, e.g. for "Reconnect". |
| `activity` | Results, activity, queue summary, and links to the existing `/queue` and `/history` pages (unchanged). |
| `settings` | "Send vehicles here", the full connection form, notes, the internal account record, how it works, and help links. |
| `social`, `catalog`, `listings`, `leads` | Focused views that reuse the existing panels. Shown only for channels with that capability. |

Activity and Settings are reachable during setup. Permissions are unchanged: `viewerCanAct` and the existing capability checks still apply.

## 5. Removed
- `PlatformDetailDrawer`
- `SimplifiedChannelsView`
- `ChannelDestinationGrid` and `ChannelDestinationCard` (replaced by the overview)
- Unmounted: `PlatformChannelList`, `PriorityConnectionsPanel`, `NextBestActionPanel`, `AutopilotPreviewModal`. Each removed only after confirming no references remain.

## 6. Verification
Real-API browser tests:
- initial setup;
- waiting on a provider (overview shows Setting up);
- failed connection (Needs attention);
- completed setup (Connected, no live claim);
- Activity and Settings during setup;
- old deep links;
- mobile navigation from the overview to a channel and its views.
