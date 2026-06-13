import type { CategoryInventorySchema, MediaGuide } from '../types.js';

// ── Ebook Media Guide ─────────────────────────────────────────────────────────
// Cover is recommended but not a hard publish gate — some platforms (e.g. KDP
// early draft upload) accept a listing without one. Platform-specific cover
// requirements are enforced by PlatformRequirementRegistry.

export const EBOOK_MEDIA_GUIDE: MediaGuide = {
  categoryId: 'EBOOKS',
  minimumPublishSet: [],
  recommendedSet: ['cover'],
  slots: [
    {
      key: 'cover',
      label: 'Cover Image',
      group: 'Cover',
      requiredLevel: 'RECOMMENDED',
      sortOrder: 0,
      aliases: ['cover', 'cover art', 'cover image', 'book cover', 'thumbnail'],
      helpText: 'Front cover image used for listings and previews.',
    },
    {
      key: 'back-cover',
      label: 'Back Cover',
      group: 'Cover',
      requiredLevel: 'OPTIONAL',
      sortOrder: 1,
      aliases: ['back cover', 'back', 'rear cover'],
    },
    {
      key: 'preview',
      label: 'Preview / Sample Pages',
      group: 'Content',
      requiredLevel: 'OPTIONAL',
      sortOrder: 2,
      aliases: ['preview', 'sample', 'excerpt', 'look inside'],
      helpText: 'A spread or table of contents for buyer previews.',
    },
  ],
};

// ── Ebooks / Scripts CategoryInventorySchema ──────────────────────────────────
//
// primaryIdentifier is the internal SKU / Work ID — always dealer-assigned,
// no external authority required. This lets self-published scripts, drafts,
// and ebook-only titles exist without any ISBN.
//
// External identifiers (isbn, asin) live in data JSON and are surfaced by UI
// and platform adapters when relevant. ISBN is NOT a global readiness gate:
//   - ebook-only: ISBN optional (KDP can assign its own identifier)
//   - POD paperback: ISBN usually required for broad distribution (IngramSpark)
//   - hardcover or new edition: separate ISBN per Bowker/IngramSpark rules
//
// Platform-specific ISBN requirements are enforced by PlatformRequirementRegistry,
// not by global readiness rules.
//
// condition is always DIGITAL — single-entry validConditionValues means the UI
// auto-fills it and hides the field.

export const ebooksInventorySchema: CategoryInventorySchema = {
  categoryId: 'EBOOKS',
  schemaVersion: '1.1.0',
  validConditionValues: ['DIGITAL'],

  primaryIdentifier: {
    fieldKey: 'sku',
    label: 'SKU / Work ID',
  },

  externalIdentifiers: [
    {
      fieldKey: 'isbn',
      label: 'ISBN',
      pattern: '^97[89][0-9]{10}$',
      helpText: 'Required for print distribution (IngramSpark, Bowker). Optional for ebook-only. Each format/edition needs its own ISBN.',
    },
    {
      fieldKey: 'asin',
      label: 'ASIN',
      helpText: 'Assigned by Amazon after a KDP listing is created. Not needed before upload.',
    },
  ],

  displayFields: {
    browseRow: ['sku', 'title', 'author', 'format', 'priceCents'],
    detailHeader: ['sku', 'isbn', 'asin', 'title', 'author', 'publisher', 'format', 'language', 'pageCount', 'priceCents'],
  },

  importFields: [
    {
      fieldKey: 'sku', label: 'SKU / Work ID', kind: 'identifier',
      requiredLevel: 'REQUIRED', displayPriority: 100,
      importAliases: ['sku', 'work id', 'work_id', 'internal id', 'internal_id', 'ref', 'stock', 'stock #', 'stock number'],
      validation: { maxLength: 80 },
    },
    {
      fieldKey: 'title', label: 'Title', kind: 'text',
      requiredLevel: 'REQUIRED', displayPriority: 95,
      importAliases: ['title', 'book title', 'name', 'product name', 'script title', 'work title'],
      validation: { maxLength: 500 },
    },
    {
      fieldKey: 'author', label: 'Author', kind: 'text',
      requiredLevel: 'REQUIRED', displayPriority: 88,
      importAliases: ['author', 'author name', 'by', 'writer', 'creator', 'playwright', 'screenwriter'],
      validation: { maxLength: 200 },
    },
    {
      fieldKey: 'priceCents', label: 'Price', kind: 'currency',
      requiredLevel: 'REQUIRED', displayPriority: 85,
      importAliases: ['price', 'list price', 'ebook price', 'sale price', 'retail price'],
      validation: { min: 0, max: 100000000 },
    },
    {
      fieldKey: 'format', label: 'Format', kind: 'enum',
      requiredLevel: 'RECOMMENDED', displayPriority: 80,
      importAliases: ['format', 'ebook format', 'file type', 'file format', 'type', 'edition type'],
    },
    {
      fieldKey: 'publisher', label: 'Publisher', kind: 'text',
      requiredLevel: 'RECOMMENDED', displayPriority: 75,
      importAliases: ['publisher', 'publisher name', 'imprint', 'label'],
      validation: { maxLength: 160 },
    },
    {
      fieldKey: 'photoUrls', label: 'Cover Image URL', kind: 'text',
      requiredLevel: 'RECOMMENDED', displayPriority: 70,
      importAliases: [
        'cover', 'cover url', 'cover image', 'cover image url',
        'image', 'image url', 'photo url', 'thumbnail', 'thumbnail url',
      ],
    },
    {
      fieldKey: 'isbn', label: 'ISBN', kind: 'identifier',
      requiredLevel: 'OPTIONAL', displayPriority: 65,
      importAliases: ['isbn', 'isbn-13', 'isbn13', 'isbn 13'],
      validation: { pattern: '^97[89][0-9]{10}$', maxLength: 13 },
    },
    {
      fieldKey: 'asin', label: 'ASIN', kind: 'identifier',
      requiredLevel: 'OPTIONAL', displayPriority: 62,
      importAliases: ['asin', 'amazon id', 'amazon asin'],
      validation: { maxLength: 20 },
    },
    {
      fieldKey: 'language', label: 'Language', kind: 'text',
      requiredLevel: 'OPTIONAL', displayPriority: 60,
      importAliases: ['language', 'lang', 'language code'],
      validation: { maxLength: 40 },
    },
    {
      fieldKey: 'pageCount', label: 'Page Count', kind: 'number',
      requiredLevel: 'OPTIONAL', displayPriority: 55,
      importAliases: ['pages', 'page count', 'page number', 'length', 'num pages'],
      validation: { min: 1, max: 99999 },
    },
  ],

  attributeGroups: [
    {
      key: 'identifiers',
      label: 'Identifiers',
      fieldKeys: ['sku', 'isbn', 'asin'],
    },
    {
      key: 'content',
      label: 'Content',
      fieldKeys: ['title', 'author', 'publisher', 'language'],
    },
    {
      key: 'format',
      label: 'Format & Pricing',
      fieldKeys: ['format', 'pageCount', 'priceCents'],
    },
  ],

  // Global readiness is format-agnostic: title + price = publishable to the
  // dealer's own storefront. ISBN/ASIN requirements are platform-specific and
  // enforced by PlatformRequirementRegistry, not here.
  readinessRules: [
    { fieldKey: 'title',      severity: 'BLOCKER', message: 'Title is required' },
    { fieldKey: 'priceCents', severity: 'BLOCKER', message: 'Price is required' },
    { fieldKey: 'publisher',  severity: 'WARNING', message: 'Publisher is recommended for platform listings' },
  ],

  mediaGuide: EBOOK_MEDIA_GUIDE,
};
