# V5 backend contract — dealership record, onboarding, access, leads

Published for Antigravity (UI) and Codex (Autopilot). Schema owner: backend/onboarding.

No plaintext passwords are stored or returned except a one-time `temporaryPassword` on create/reset. Invite tokens are stored as SHA-256 digests only.

## Roles (after migration)

| Stored role | Meaning | Legacy alias still accepted |
|---|---|---|
| `SUPER_ADMIN` | Site administrator | — |
| `INTERNAL_SUPPORT` | Internal staff, scoped to assigned rooftops | `OPERATOR` |
| `DEALER_OWNER` | Dealership owner | `DEALER_OPERATOR` |
| `DEALER_STAFF` | Dealership staff | — |

`OperatorDealerAccess.accessRole` is the per-rooftop capability: `DEALER_OWNER` | `DEALER_STAFF` | `INTERNAL_SUPPORT`.

## Dealership record

```
GET    /api/admin/dealerships
POST   /api/admin/dealerships
GET    /api/admin/dealerships/:dealershipId
PATCH  /api/admin/dealerships/:dealershipId
```

Auth: operator session. Requires site admin or internal support. List/search: `q` matches legal name, DBA, contact email, login email. Filters: `lifecycle`, `needsAttention`.

`POST` body is `CreateDealershipRequest` plus optional `internalOwnerId`, `inviteOwnerEmail`. Creates profile + onboarding steps in one transaction. Existing `POST /api/admin/dealers` and signup keep working and use the same service.

Record shape:

```
{
  id, legalName, dbaName, logoUrl, businessCategory, lifecycleStatus,
  primaryContactEmail, internalOwner, nextStep, people, inventory,
  channels, autopilotPreference, waitingForStock, launchCompletedAt,
  handoffCompletedAt, createdAt
}
```

`lifecycleStatus`: `DRAFT` | `SETTING_UP` | `READY_TO_LAUNCH` | `ACTIVE` | `PAUSED` | `ARCHIVED`

## Onboarding

```
GET    /api/admin/dealerships/:dealershipId/onboarding
PATCH  /api/admin/dealerships/:dealershipId/onboarding
POST   /api/admin/dealerships/:dealershipId/handoff
```

Steps: `CREATE` | `ACCESS` | `VEHICLES` | `CHANNELS` | `HANDOFF`  
Step status: `NOT_STARTED` | `IN_PROGRESS` | `COMPLETE` | `BLOCKED` | `NEEDS_RECHECK`  
Owner: `YOU` | `OUR_TEAM` | `SYSTEM` | `PARTNER` | `DEALER`

`PATCH` body: `{ stepKey, status?, waitingForStock?, autopilotPreference?, evidence? }`  
Completion is evidence-backed. Handoff requires owner first login plus verified vehicle or explicit waiting-for-stock, and Autopilot preference recorded.

## People and access

```
GET    /api/dealers/:dealershipId/people
POST   /api/dealers/:dealershipId/people/invites
POST   /api/dealers/:dealershipId/people/invites/:inviteId/resend
POST   /api/dealers/:dealershipId/people/invites/:inviteId/revoke
POST   /api/dealers/:dealershipId/people/temporary-login
PATCH  /api/dealers/:dealershipId/people/:accountId
```

Invite body: `{ email, accessRole, name? }` → `{ invite, setupUrl }` (raw token only in `setupUrl`, never logged).  
Temp login body: `{ email, accessRole, name? }` → `{ person, temporaryPassword }` once.  
Patch body: `{ accessRole?, isActive?, resetPassword? }`.

Public:

```
GET    /api/auth/invites/:token
POST   /api/auth/invites/:token/accept   { password, name? }
POST   /api/auth/change-password         { currentPassword, newPassword }
```

Unaccepted invites and `mustChangePassword` accounts cannot use ordinary dealer APIs.

## Leads

```
PATCH  /api/dealers/:dealershipId/leads/:leadId
{ workflowStatus?, assigneeOperatorId?, notes?, version? }
```

Statuses: `NEW` | `CONTACTED` | `APPOINTMENT` | `SOLD` | `LOST`. Server-persisted. `version` is an optimistic lock.

## Autopilot (policy only)

`DealershipProfile.autopilotPreference`: `OFF` | `ON` | `PAUSED`.  
This records intent. Codex owns execution, verification, and incidents.

## GET /api/dealers

Returns assigned dealerships only. `SUPER_ADMIN` still receives all.
