import type { CategoryInventorySchema, MediaGuide } from '../types.js';

export const SONGS_MEDIA_GUIDE: MediaGuide = {
  categoryId: 'SONGS',
  minimumPublishSet: [],
  recommendedSet: ['artwork'],
  slots: [
    {
      key: 'artwork',
      label: 'Artwork / Cover',
      group: 'Cover',
      requiredLevel: 'RECOMMENDED',
      sortOrder: 0,
      aliases: ['artwork', 'cover', 'cover art', 'album art', 'album artwork', 'thumbnail'],
      helpText: 'Cover image used for streaming platform listings and storefronts.',
    },
    {
      key: 'artwork-back',
      label: 'Back Cover',
      group: 'Cover',
      requiredLevel: 'OPTIONAL',
      sortOrder: 1,
      aliases: ['back cover', 'back', 'rear cover'],
    },
    {
      key: 'promo',
      label: 'Promo Image',
      group: 'Promotional',
      requiredLevel: 'OPTIONAL',
      sortOrder: 2,
      aliases: ['promo', 'promotional', 'press photo', 'band photo', 'artist photo'],
      helpText: 'Artist or band photo for press kit and promotional use.',
    },
  ],
};

export const songsInventorySchema: CategoryInventorySchema = {
  categoryId: 'SONGS',
  schemaVersion: '1.0.0',
  validConditionValues: ['DIGITAL'],

  primaryIdentifier: {
    fieldKey: 'sku',
    label: 'SKU / Release ID',
  },

  externalIdentifiers: [
    {
      fieldKey: 'isrc',
      label: 'ISRC',
      helpText: 'International Standard Recording Code. Assigned by your national ISRC agency or a distributor. Required by most streaming platforms. Enter without separators (e.g. USRC17607839).',
    },
  ],

  displayFields: {
    browseRow: ['sku', 'title', 'artist', 'format', 'priceCents'],
    detailHeader: ['sku', 'isrc', 'title', 'artist', 'format', 'genre', 'trackCount', 'releaseYear', 'label', 'priceCents'],
  },

  importFields: [
    {
      fieldKey: 'sku', label: 'SKU / Release ID', kind: 'identifier',
      requiredLevel: 'REQUIRED', displayPriority: 100,
      importAliases: ['sku', 'release id', 'release_id', 'internal id', 'internal_id', 'ref', 'stock', 'stock #', 'stock number'],
      validation: { maxLength: 80 },
    },
    {
      fieldKey: 'title', label: 'Title', kind: 'text',
      requiredLevel: 'REQUIRED', displayPriority: 95,
      importAliases: ['title', 'release title', 'album title', 'track title', 'name', 'song title'],
      validation: { maxLength: 500 },
    },
    {
      fieldKey: 'artist', label: 'Artist', kind: 'text',
      requiredLevel: 'REQUIRED', displayPriority: 90,
      importAliases: ['artist', 'artist name', 'band', 'performer', 'primary artist'],
      validation: { maxLength: 200 },
    },
    {
      fieldKey: 'priceCents', label: 'Price', kind: 'currency',
      requiredLevel: 'REQUIRED', displayPriority: 85,
      importAliases: ['price', 'list price', 'sale price', 'retail price'],
      validation: { min: 0, max: 100000000 },
    },
    {
      fieldKey: 'format', label: 'Format', kind: 'enum',
      requiredLevel: 'RECOMMENDED', displayPriority: 80,
      importAliases: ['format', 'release format', 'type'],
    },
    {
      fieldKey: 'genre', label: 'Genre', kind: 'text',
      requiredLevel: 'RECOMMENDED', displayPriority: 75,
      importAliases: ['genre', 'music genre', 'style'],
      validation: { maxLength: 100 },
    },
    {
      fieldKey: 'isrc', label: 'ISRC', kind: 'identifier',
      requiredLevel: 'RECOMMENDED', displayPriority: 70,
      importAliases: ['isrc', 'isrc code'],
      validation: { maxLength: 12 },
    },
    {
      fieldKey: 'label', label: 'Record Label', kind: 'text',
      requiredLevel: 'RECOMMENDED', displayPriority: 65,
      importAliases: ['label', 'record label', 'imprint', 'publisher'],
      validation: { maxLength: 160 },
    },
    {
      fieldKey: 'trackCount', label: 'Track Count', kind: 'number',
      requiredLevel: 'OPTIONAL', displayPriority: 60,
      importAliases: ['tracks', 'track count', 'track number', 'num tracks', 'total tracks'],
      validation: { min: 1, max: 9999 },
    },
    {
      fieldKey: 'releaseYear', label: 'Release Year', kind: 'number',
      requiredLevel: 'OPTIONAL', displayPriority: 55,
      importAliases: ['year', 'release year', 'release date year'],
      validation: { min: 1900, max: 2100 },
    },
  ],

  attributeGroups: [
    {
      key: 'identifiers',
      label: 'Identifiers',
      fieldKeys: ['sku', 'isrc'],
    },
    {
      key: 'content',
      label: 'Content',
      fieldKeys: ['title', 'artist', 'label', 'genre', 'releaseYear'],
    },
    {
      key: 'format',
      label: 'Format & Pricing',
      fieldKeys: ['format', 'trackCount', 'priceCents'],
    },
  ],

  readinessRules: [
    { fieldKey: 'title',      severity: 'BLOCKER', message: 'Title is required' },
    { fieldKey: 'artist',     severity: 'BLOCKER', message: 'Artist name is required' },
    { fieldKey: 'priceCents', severity: 'BLOCKER', message: 'Price is required' },
    { fieldKey: 'isrc',       severity: 'WARNING', message: 'ISRC recommended for streaming platform distribution' },
    { fieldKey: 'label',      severity: 'WARNING', message: 'Record label recommended for platform listings' },
  ],

  mediaGuide: SONGS_MEDIA_GUIDE,
};
