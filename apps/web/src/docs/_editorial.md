---
title: Editorial guide (developers)
---

Internal reference for writing operator docs. Not shown in the reader.

## Voice

- Write for dealership and syndication staff. Assume retail automotive experience.
- State facts. No marketing, filler, humor, or reassurance language.
- Use industry terms (DMS, rooftop, syndication, feed, stock number). Do not invent product jargon.
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
