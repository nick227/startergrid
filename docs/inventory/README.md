# Inventory Ingestion + Category-Aware Inventory Management Backlog

This zip contains 12 ordered CSV backlog files. They are split from four parent epics:

1. Shared Inventory Foundation
2. Automotive VIN-First Onboarding
3. Structured Media / Shot Guide
4. Inventory Operations + Publishing Impact

Guiding goals:
- Auto first, no exceptions for MVP priority.
- One shared system for admin and dealer/operator contexts.
- Category-aware vertical integration by design.
- Reuse existing systems: Vehicle, VehicleMedia, InventorySource, IngressRun, PublishQueueItem, SyncPolicy, SyncEvent, PlatformAccount, PlatformOAuthToken, PlatformCatalogSync, MarketplaceListing, SocialPost, ChannelEvent, performance caches, category-schemas.
- Avoid redundant code and duplicated admin/dealer UI.
- Improve code structure while working: backend DTOs, shared helpers, tests, manifest/schema-driven UI, fewer React recomputations.

Each CSV contains short sprint lines in optimal order, including research/design/implementation/test/review/documentation work.
