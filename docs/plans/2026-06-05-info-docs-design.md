# Info docs reader — design

## Goal

Keep operator pages minimal. Deep explanations live in markdown files, opened via a declarative **info icon** next to industry terms (Auto-Sync, Platform readiness, CSV import).

## Architecture

- **Content**: `apps/web/src/docs/<subject>/<topic>.md` with optional YAML frontmatter (`title`, `updated`).
- **Registry**: `import.meta.glob` auto-discovers files; `docId` = path without `.md` (e.g. `processes/auto-sync`).
- **UI**: `InfoButton` / `InfoLabel` → `DocReaderProvider` → bottom **slide-up sheet** (~75vh), Kindle-like reader.
- **Links**: `[term](doc:processes/auto-sync)` opens another doc in the same sheet.

## Developer API

```tsx
<InfoButton docId="processes/auto-sync" />
<InfoLabel term="Auto-Sync" docId="processes/auto-sync" />
```

Add a doc: create `src/docs/<folder>/<name>.md`. No registry edit.

## First integrations

Sync (auto-sync, platform readiness, sync status), Inventory (CSV import, readiness), Platforms (platform, account states), Dealership context.
