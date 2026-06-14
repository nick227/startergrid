---
title: Auto-Response to Buyers
summary: How to enable automatic acknowledgment messages sent to buyers immediately after they submit an inquiry.
keywords: auto-response, buyer, email, sms, acknowledgment, opt-in, template
updated: 2026-06-13
---

When a buyer clicks **Request Info** on the marketplace, they are waiting to hear back. Auto-Response closes that gap by sending a personalised acknowledgment within seconds — without requiring any manual action from your team.

## How it works

1. Buyer submits an inquiry on the marketplace.
2. The lead is saved to your account immediately.
3. If Auto-Response is enabled, a message is sent to the buyer's email and/or phone within seconds.
4. All sent messages appear in your **Communications** history.

## Opt-in — disabled by default

Auto-Response is **off by default**. You must explicitly enable it in the Notification Channels panel. This ensures no messages go out until you have reviewed and approved the message content.

## Channels

| Channel | Requires |
| --- | --- |
| Email | Buyer provided an email address |
| SMS | Buyer provided a phone number AND you have Twilio configured |

You can enable either or both independently.

## Message templates

If you leave the template blank, a default message is used:

**Email default:**
> Hi [Name],
>
> Thanks for reaching out about the [vehicle]. We received your message and someone from our team will be in touch with you shortly.
>
> [Dealer Name]

**SMS default:**
> Hi [Name], thanks for inquiring about the [vehicle]. We'll be in touch shortly. — [Dealer Name]

### Custom templates

Use placeholder variables in your custom message:

| Placeholder | Replaced with |
| --- | --- |
| `{name}` | Buyer's first name (or blank if not provided) |
| `{vehicle}` | Year, make, and model of the vehicle |
| `{dealer}` | Your display name (or dealership name if blank) |

Keep SMS messages under 160 characters to avoid carrier splitting.

## Communications history

Every message sent is logged in your **Communications** tab with status, recipient, and message preview. Failed messages are also recorded with the error reason.

## Important notes

- Buyers opted out of marketing may still receive transactional acknowledgments, but always consult legal counsel for your jurisdiction.
- Auto-Response does not reply to follow-up messages — it only triggers on the initial inquiry submission.
- SMS requires Twilio credentials configured by your platform operator.
