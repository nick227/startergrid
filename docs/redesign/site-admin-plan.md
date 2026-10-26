# Site admin redesign: one place to onboard and support a dealership

Proposed experience · October 25, 2026 · [Plan index](README.md)

## Outcome

A new internal hire can create a dealership, establish its owner's login, bring in inventory, connect supported channels and complete a verified handoff without moving between unrelated consoles. A returning staff member can immediately see what is working, what needs attention, who owns it, and what happened last.

The central object is a **dealership record**. Onboarding is a guided state of that record; support continues in the same record after launch. No separate onboarding database or duplicate customer record.

## Navigation and entry points

| Primary destination | Purpose | Default content |
|---|---|---|
| Work | What the internal team needs to do next | My work first; team work filter; onboarding tasks and incidents together, ordered by urgency and due time |
| Dealerships | Find, onboard and manage a dealership | Search name/contact/email; saved filters for Setting up, Active, Needs attention, Paused; Add dealership |
| Integrations | Maintain supported delivery destinations | Health, affected dealers, capabilities and qualification; credential and diagnostic details on demand |

Secondary Administration contains internal users, permission administration, system diagnostics and global audit. Valid reports live under dealership reporting or internal Reports; mock Finances is removed from operational navigation until replaced by real measures. A global search finds dealerships and contacts and links into their record. It does not index secret values.

Work is the everyday landing page, not infrastructure health. System outages appear as one grouped incident with affected dealers, not hundreds of duplicate tasks. Urgent listing-removal failures are above ordinary onboarding work.

## The dealership record

Persistent header: dealership name, onboarding/operating state, internal owner, primary dealer contact and **Open dealer view**. Contact actions and **Continue setup** or **Next task** appear in context. Owner identity and scope remain visible after navigation.

Six record sections: **Overview · Setup · People & access · Vehicles · Channels · Activity**. Business profile, contact/location editing, notifications and reports open from Overview; they are not hidden behind technical menus. Once setup completes, its section remains available as a checklist/history but is visually secondary.

| Section | Contents | Primary action |
|---|---|---|
| Overview | Profile summary, assigned staff, next task, access handoff status, inventory freshness, distribution summary, outstanding work | Continue the next incomplete task |
| Setup | Saved progress through the onboarding steps; blockers and ownership; launch evidence | Resume next step |
| People & access | Dealer users, roles, login emails, invitation/setup status, first/last successful login; assigned support staff | Invite person or resolve access issue |
| Vehicles | Same inventory data and task components as dealer workspace; imports and source history | Add/import vehicles or resolve source issue |
| Channels | Agreed destinations, setup status, Autopilot coverage, per-channel result evidence | Complete next connection or inspect exception |
| Activity | Unified chronological record of profile/access/policy changes, imports, publishing, incidents and staff notes | Filter to relevant event; open evidence |

Overview wireframe; example values illustrate layout only:

```text
Dealerships / Lakeview Motors                         Open dealer view
Setting up · Internal owner: Maya · Dealer contact: Jordan

Next: review imported vehicles · Maya, our team · due today
[Continue setup]

Access                 Inventory                    Distribution
Jordan invited         42 imported, 3 need fixes     1 channel ready to test
View access            Review vehicles              View channels

Overview | Setup | People & access | Vehicles | Channels | Activity

Needs attention                 Business details
3 vehicles need a price         Address, contact, category, source
Owner: Jordan                   [Edit business details]

Recent activity                 Notifications · Reports · Internal notes
Import completed, 10:14am
```

Summary blocks link to the exact affected records, not generic destination pages. Internal notes are distinct from dealer-visible instructions.

## Guided onboarding

Five steps, saved on the server and resumable by another authorized staff member. Each shows required fields only, an explanation of completion, the owner of missing information, and **Save and continue**. Optional fields use an explicit expansion. Back/forward never silently discards work.

| Step | Staff does | Complete when | Exceptions |
|---|---|---|---|
| 1. Create dealership | Search for an existing business; enter legal/display name, category, contact and location; assign internal owner | Record is durably saved, required identity fields pass, duplicate candidates resolved | Open matching record or explain distinct rooftop; no accidental duplicate |
| 2. Give access | Select existing authorized person or invite dealer owner; verify login email; choose role; prepare handoff | Invitation/setup request persisted and delivery status known; existing linked users retain credentials | Delivery failure, wrong address, existing account, expired invite each have a clear action |
| 3. Add vehicles | Choose CSV, connected source or manual entry; map fields; preview; commit; review issues | At least one representative eligible item or an explicit “waiting for stock” task; source and import outcome recorded | Partial failures preserved per row; duplicates reconciled; no overwrite surprises |
| 4. Set up channels | Choose agreed supported destinations; connect/validate; choose Autopilot or manual; record approvals | Each launch channel is qualified, connected and policy-ready; pending channels have owners | Partner/manual channels remain “Our team is setting this up”; unrelated optional channels do not block launch |
| 5. Verify and hand over | Preview changes; authorize a limited live publish; verify destination; check lead routing; deliver access/quick-start summary | Launch evidence recorded, mandatory checks pass and handoff status is explicit | Tests fail into assigned work; never mark success merely from a queue send |

The stepper is guidance, not a requirement to wait for an external partner before adding inventory. Steps can proceed in parallel when dependencies permit. Returning to a step preserves its data and evidence. Changes that invalidate a completed check mark that check “Needs recheck” and name the reason.

**Launch** and **handoff complete** are separate milestones. An authorized owner/internal staff member may launch selected qualified channels while an optional partner channel is pending. Handoff is complete only when the owner has successfully accessed the account and the configured contact/lead route has been verified. A dealership awaiting inventory remains Setting up; it is not falsely declared live.

Dealership lifecycle: Draft → Setting up → Ready to launch → Active → Paused → Archived. “Needs attention” is a separate health indicator, so an active dealer with a failed channel is not relabeled as a new onboarding case. Paused means promotions are paused, not that the account is suspended. Account suspension and contractual deactivation have separate explicit actions and consequences.

## Initial logins and ongoing access

People & access is the authoritative answer to “how does this dealer log in?”

| Always visible to permitted support staff | Contextual action |
|---|---|
| Person, role, login email, linked dealership(s) | Copy login email and sign-in URL |
| Not invited / Invited / Accepted / Expired / Delivery failed / Suspended | Send invitation, resend, correct address or reinstate as permitted |
| Invite sent time, expiry, acceptance and first/last successful login | Diagnose incomplete handoff |
| Latest delivery result and handoff owner | Retry delivery or copy a newly generated setup link |
| Existing account versus newly created account | Link approved existing account without resetting its password |

Default: send a single-use, expiring setup invitation so the dealer chooses their password. Store only a token digest; do not put usable setup tokens into audit logs or ordinary notes. Resending invalidates the previous invitation. Copyable setup links are generated for deliberate handoff and shown only in that action; the permanent login page URL remains visible.

If operations needs a temporary-password handoff, provide it as an alternate action: show the generated password once with copy support, require change at first login and expire unused credentials. After the one-time reveal, show **Generate new temporary login** rather than a reusable “view password” control. Existing password hashes cannot be recovered as plaintext. Current create/reset endpoints already return a generated password once, but invitation lifecycle, expiry and forced-change enforcement are new work.

Access activation must be server-enforced: an unaccepted invite or temporary credential in forced-change state cannot use ordinary operator APIs. Reset revokes existing sessions; suspension also revokes access. Link acceptance verifies the intended account; knowledge of an existing email is not enough to claim it. Linking multiple dealerships uses explicit assignments rather than duplicate accounts.

Provide a **Prepare welcome message** action with dealership name, login email, sign-in/setup link and assigned contact. Sending is a separate explicit action with delivery feedback and audit. The plan does not automatically send anything now. Staff sees “Delivery failed—check address” rather than “Invited” when no message was accepted for delivery.

## Responsibilities and permissions

Proposed business roles; these require a capability migration, not just renaming existing enum values:

| Capability | Dealer owner | Dealer staff | Internal support | Site admin |
|---|---|---|---|---|
| View/edit inventory and manage leads | Own dealership | Assigned dealership | Assigned support scope | All |
| Manage dealer users | Own dealership | No | Assigned scope, dealer roles only | All |
| Connect channels; activate/change Autopilot | Own dealership | No by default | Assigned scope with recorded authorization | All, with audit |
| View access handoff status; send invite/reset | Own team, within role limits | Self-service reset | Assigned dealer users | All |
| Create dealership and own onboarding | Self-service entry | No | Yes | Yes |
| Edit site integration settings or internal roles | No | No | No | Yes |

Dealer staff edits to an eligible vehicle may distribute automatically under the owner's agreed policy; the interface must say so at save time. No silent privilege promotion during migration. Existing permissions are inventoried before mapping, with explicit review for ambiguous `OPERATOR` and `DEALER_OPERATOR` assignments.

Responsibility is not the same as permission. Every task has one accountable owner, a due state and an escalation path. Internal support can request missing photos from a dealer without making the dealer responsible for an expired application credential.

## Support without switching identities

**Open dealer view** uses the same page components and outcome states the dealer sees, inside one clear support-context frame. It keeps a return link to the dealership record and indicates the staff member is acting as themselves. It is not a dealer login or silent impersonation.

Technical details are available through **View diagnostics** on the affected task/channel: reason codes, credentials metadata, provider response, queue attempts, feed payload and correlated events. Their location stays predictable; they do not dominate Overview.

Internal work items contain dealership/channel/item scope, problem in plain language, impact, owner, next action, due time, attempts and verification. Supported actions: retry eligible failure, open real reconnect flow, request missing information, record partner follow-up, pause promotions, inspect evidence. **Resolved** requires a passing condition or a clearly labeled administrative closure with reason; clicking a toast is never resolution.

## Preserve current functionality

| Current location | New location |
|---|---|
| System Status | Administration → System health; consequential incidents also appear in Work |
| Operations + Blockers | Work, backed by one issue model and shared filters |
| Dealerships + embedded Home/profile | Dealership record → Overview / Setup |
| Global Platforms + credentials | Integrations → destination → connection/diagnostics |
| Users | Dealer users in People & access; internal users in Administration |
| Global Audit + per-dealer publishing history | Administration → Audit and dealership Activity, with event source/type retained |
| Finances / reports | Real measures under Reports; mock financial content excluded from live operations |
| Dealer tools | Shared Vehicles, Channels and dealer view; no duplicated business logic |
| Specialist import/feed/export tools | Vehicles → Import/source management or Channels → Advanced |

## Build slices and acceptance

1. Create the central record shell, search/list, ownership and persisted setup checklist. Reuse profile and inventory services. Done when two staff members can resume the same draft without losing state.
2. Add People & access and account/invitation lifecycle. Make dealership/account/access/default-policy creation transactional or resumably idempotent. Done when duplicate submissions and partial failures cannot produce orphaned accounts or inaccessible dealerships.
3. Mount guided imports, channel setup and verification. Done when a staff member can take a dealership to a verified first listing without leaving its record.
4. Consolidate work and activity, then add dealer-view support. Done when every old working admin capability has a reachable new destination and the actor remains identifiable.

Proposed usability gate: three internal participants unfamiliar with the implementation each onboard a prepared test dealership without coaching, identify its initial login/access state within 30 seconds, and identify the next task plus owner within 10 seconds. Target 15 minutes of active staff work for a prepared first-party launch; external approval wait is measured separately. Record failures and revise the workflow before wider release.

Functional gate: test existing-email linking, invite expiry/resend, failed delivery, first login, forced password change, suspended users, multiple rooftops, interrupted setup, stale/concurrent edits, partial import and failed channel verification. No setup completion may be inferred solely from a button click or queued job.

Dependencies and release order: [Autopilot and delivery plan](autopilot-and-delivery-plan.md).
