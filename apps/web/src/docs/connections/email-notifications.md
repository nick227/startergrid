---
title: Email Lead Alerts
summary: How email notifications work and what contact address they go to.
keywords: email, notification, lead, alert, smtp, primary contact
updated: 2026-06-13
---

Email alerts send to the primary contact email on your dealer profile. No email-specific setup is required on your end — enable or disable the toggle in the Notification channels panel.

## Which address receives alerts

Alerts go to the **email** field inside your dealership's primary contact record. This is the same address used for account-level correspondence.

To change it, update your primary contact email through your account profile. The change takes effect on the next lead.

## What the message contains

| Field | Example |
| --- | --- |
| Subject | *New lead — Stock #DM-2024-042 (consumer-marketplace)* |
| Platform | consumer-marketplace |
| Vehicle | Stock #DM-2024-042 |
| Name | Alex Johnson |
| Email | alex@example.com |
| Phone | +15551234567 |
| Message | "Is this still available?" |
| Lead ID | clxxx... |

Fields the buyer left blank are omitted from the message body.

## Enabling and disabling

The email channel is enabled by default. To silence it without removing your contact email, uncheck **Enabled** in the Email section of the Notification channels panel and save.

## If emails are not arriving

- Check the primary contact email is correct on your profile.
- Check your spam folder — first alerts from a new sender address often land there.
- Mark the sender address as safe to prevent future filtering.

If no emails have ever arrived and spam filtering is not the cause, contact support to confirm the outbound mail service is active for your account.

See [Lead notification channels](doc:connections/lead-notifications) for a full channel comparison.
