---
visibility: public
id: crm-delivery
feature: crm-delivery
type: troubleshooting
audience: user, staff
title: Why did my lead not reach my CRM?
summary: Check the delivery attempt, destination, and manual handoff options before sending again.
tags: crm, leads, delivery
synonyms: inquiry, lead, crm, not received, missing, didnt reach, send, failed, email, adf, xml
keywords: inquiry, lead, crm, not received, missing, didnt reach, send, failed, email, adf, xml
related: app-lead-status, connections-lead-notifications
implementation: apps/web/src/components/leads/LeadCrmHandoffModal.tsx, apps/web/src/lib/api/leadsApi.ts, src/server/routes/dealerLeads.ts
updated: 2026-10-27
---

## Open the delivery details

On **Leads**, use the inquiry's CRM action to inspect its delivery details. A CRM (customer relationship management system) is separate from DealerGrid's shared inbox and the team's lead status.

## Choose the next step

| Recorded outcome | Next step |
| --- | --- |
| Not sent | Check the destination and use **Send to CRM** when available. |
| Sending | Wait for the attempt to finish before submitting another. |
| Accepted by mail server | Check the receiving CRM's inbox or activity. Acceptance does not prove that the CRM imported the inquiry. |
| Failed or did not finish | Read the attempt's error and correct the cause. Use **Retry send** only when available and appropriate. |
| Sending unavailable | Read the blocker. Review CRM lead routing in Channels or use the manual handoff options. |

## Manual handoff

Use **Copy Lead Summary** for a salesperson to enter the inquiry manually. Raw XML and file download are for systems or staff that accept that format. Check which route the receiver needs; copying or downloading does not transmit the lead.

## Confirm receipt

Confirm the inquiry in the receiving CRM. If the mail server accepted the lead but the CRM has no record, provide the receiving administrator with the destination address, attempt time, and lead identifier. Check for an existing record before choosing **Send again** to avoid duplicates.
