---
title: SMS Lead Alerts
summary: How SMS notifications work and what is required to activate them.
keywords: sms, text, twilio, phone, notification, lead, alert, E.164
updated: 2026-06-13
---

SMS delivers a short text message to any mobile number when a lead arrives. Sending is handled by Twilio and requires server-level configuration by an administrator before the channel is active.

## What the message says

```
New lead from Alex Johnson for Stock #DM-2024-042. Log in to respond.
```

The message uses the buyer's name if provided, otherwise falls back to email or phone.

## Phone number format

Enter the number in **E.164 format**: country code, area code, and number with no spaces or dashes, prefixed with `+`.

| Correct | Incorrect |
| --- | --- |
| +15551234567 | 555-123-4567 |
| +447911123456 | 07911 123456 |
| +33612345678 | 06 12 34 56 78 |

## Activation requirement

SMS requires Twilio credentials to be configured at the server level by an administrator. Until that is done, numbers entered here are saved but SMS messages are not sent.

If you have entered a phone number and are not receiving texts, contact your administrator to confirm Twilio is active.

## Multiple recipients

The SMS channel sends to one number per dealership. To notify multiple people, use a group SMS forwarding service (e.g. a shared number that fans out to a team) and enter that number here.

## Removing SMS alerts

Clear the phone number field and save.

See [Lead notification channels](doc:connections/lead-notifications) for a full channel comparison.
