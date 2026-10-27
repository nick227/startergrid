---
visibility: public
id: industry-syndication-lag
feature: listing-delivery
type: reference
audience: user, staff
tags: listing delivery, channels
synonyms: lag, delay, feed, ingest, sent
aliases: industry/syndication-lag
related: troubleshooting-sold-listing-still-live
title: Why a site updates later than DealerGrid
summary: A finished send means we delivered the update. Each destination still refreshes on its own clock.
keywords: lag, delay, feed, ingest, sent
updated: 2026-10-26
advanced: true
---

Sent is not the same moment a buyer sees the change.

## Typical timing

| Stage | How long |
| --- | --- |
| DealerGrid sends | Seconds to minutes |
| They pick up the file or request | 15 minutes to several hours |
| Their search index refreshes | Extra delay on some sites |

Direct destinations can appear in minutes when they are not rate-limited. File-based destinations often wait for a 15–60 minute pickup. Some manufacturer programs run overnight.

Updating in DealerGrid ends when our work finishes. Connected or Sent does not mean every field is already public.

See [A sold vehicle is still on a site](doc:troubleshooting/sold-listing-still-live).
