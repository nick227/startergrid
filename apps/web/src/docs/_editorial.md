---
title: Editorial guide (developers)
---

Internal reference for writing operator docs. Not shown in the reader.

## Voice

- Write for dealership and syndication staff. Include new team members who may not know our product or industry terminology.
- State facts. No marketing, filler, humor, or reassurance language.
- Prefer dealership, automatic updates, and destination to rooftop, syndication, and channel where the meaning stays accurate. Explain necessary abbreviations on first use. Match visible control labels exactly.
- Prefer short sections with a title, one or two sentences of prose, then a table or list when structure helps.

## Frontmatter (catalog)

Every published doc needs:

```yaml
---
title: Display title
summary: One sentence for the knowledge base table.
keywords: comma, separated, search, terms
updated: YYYY-MM-DD
---
```

`summary` and `keywords` power the knowledge base search. Write summaries as factual scope statements, not teasers.

## Structure

- Open with what the topic is and when it matters.
- Follow with mechanics, then exceptions or edge cases.
- Add a concrete example when the concept is abstract.
- Link related docs with `[label](doc:path/to/doc)`.

## Avoid

- Superlatives, promises, and calls to action that state the obvious.
- Explaining basics the reader already knows (what a VIN is, what Facebook Marketplace is).
- Tables-only pages. Break up dense grids with paragraph text.

## What belongs where

- Keep the immediate next step, validation error, and consequence of an action beside the control. Help must not be required to use a basic form.
- Put multi-step instructions, troubleshooting, status definitions, and exceptions in linked help articles.
- Keep implementation details and provider reference material in Advanced articles.
- Provide Help in each main header and a relevant article link beside complex workflows. Opening help should preserve the page and unsaved input.
- Distinguish saved settings, connected accounts, submitted updates, and confirmed live listings. Never promise publication, email delivery, or removal without corresponding evidence.
