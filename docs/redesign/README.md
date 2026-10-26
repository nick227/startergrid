# Simple dealership operations redesign

Proposed product and implementation plans · October 25, 2026

The product should let a dealership keep vehicles current and handle inquiries while the system distributes eligible inventory. Internal staff should be able to create, activate and support a dealership from one record, with a named owner and a clear next step throughout.

This proposal follows the [current functionality review](../product-functionality-review-2026-10-25.md). It describes future behavior, not functionality already shipped or verified with external partners.

## Read in this order

1. [Site admin: dealership management and guided onboarding](site-admin-plan.md). Defines the dealership record, access handoff, staff responsibilities and activation evidence.
2. [Dealership: simple daily work](dealership-plan.md). Defines Home, Vehicles, Channels and Leads, with settings and specialist tools kept accessible.
3. [Autopilot and phased delivery](autopilot-and-delivery-plan.md). Defines automation boundaries, verification, exception handling, reliability repairs, migration and acceptance gates.

## Product decisions proposed

| Decision | Proposed default |
|---|---|
| Primary dealership promise | Keep vehicle information accurate; we keep supported listings up to date; inquiries arrive in one shared inbox |
| Primary internal promise | One dealership record contains setup, people/access, inventory, channels, work and history |
| Daily navigation | Dealer: Home, Vehicles, Channels, Leads. Internal: Work, Dealerships, Integrations. Administration is secondary |
| Ownership | Dealers own business facts, inventory accuracy and buyer follow-up. Internal staff own onboarding, supported channel setup and escalated distribution issues. Automation owns routine eligible changes and recovery |
| Autopilot | Explicitly activated per dealership for selected, qualified channels; not a synonym for every catalog integration |
| Initial access | Login email + sign-in link + tracked invitation/setup status; resend/reset in the dealer record; optional one-time temporary credential handoff |
| Existing capabilities | Preserve working capabilities under contextual or advanced tools. Repair incomplete features before presenting them as available |
| Initial design scope | Automotive dealer vocabulary. Preserve existing category routing and data; non-automotive workspaces use category-appropriate labels and retain their current capabilities |
| Delivery order | Foundation and reliability → internal experience → dealership experience → expanded Autopilot |

Autopilot is a highest-priority product outcome. Its policy, status and evidence contracts are designed during foundation work, and onboarding is built around them. External automation expands only after the underlying workflows and verification pass. A toggle may remain unavailable with a specific reason until its channels qualify.

## Definition of simple

- Each page has one primary job, one obvious next action, and a clear dealership context.
- Ordinary users see outcomes and actions. Technical details remain one contextual disclosure away.
- Every open task names its owner: **You**, **Our team**, **System**, or **Partner**.
- Every action has an observable result; success messages follow persisted or verified outcomes.
- Healthy automation stays quiet. Users receive actionable exceptions and an optional summary, not routine queue events.
- Existing working capabilities have a documented destination before their old entry points are retired.

## Shared presentation direction

Use the existing design-token package as the implementation base, with these proposed semantic targets subject to a contrast audit: Harbor navy `#203C52` for structure, Canvas `#F5F7F9` for the workspace, Paper `#FFFFFF` for content, Ink `#182B38` for text, Sea green `#167568` for confirmed health, and Attention amber `#A85B12` for required action. Error/focus colors retain semantic tokens and must pass contrast checks. Do not encode state with color alone.

Use Barlow Semi Condensed sparingly for page/dealership titles and Source Sans 3 for body text, forms and data, with system fallbacks. Proposed sizes: 28px page title, 20px section, 16px body, 14px utility. Financial/chart density is not the organizing visual style.

The signature element is an **ownership line**: “Next: confirm inventory · Maya, our team · due today.” It gives every setup step and exception a human-readable action, owner and due state. It is functional, not decorative.

Choose one application navigation column, a dealership breadcrumb when scoped, and a calm main workspace. Use a single horizontal section selector only inside the dealership record. Avoid embedding another complete application shell. Forms have clear section save boundaries and leave-page protection. Use buttons for actions, links for destinations, visible focus, keyboard-operable dialogs, accessible labels and error summaries. At narrow widths, lists stack without hiding task owners or primary actions; motion is limited to useful state feedback and respects reduced-motion settings.

Two layouts considered: a dashboard of many cards and an ordered work list with a compact dealership summary. Choose the ordered list: it answers “what next?” without asking new staff to interpret metrics. Critique of the proposal: fewer tabs alone would conceal functionality. The capability maps and exception ownership in the linked plans are therefore release requirements, not optional polish.

## Boundaries for discussion

These plans make concrete defaults so implementation can proceed after review. Before enabling live external Autopilot, product and operations must select the first external providers, confirm what their accounts support, and set channel-specific completion/verification targets. Those decisions do not block foundation or dealership-record work.

No application code, account, credentials or publishing settings are changed by this planning package.
