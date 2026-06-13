import type { CategoryInventorySchema, MediaGuide } from '../types.js';

export const DIGITAL_ART_MEDIA_GUIDE: MediaGuide = {
  categoryId: 'DIGITAL_ART',
  minimumPublishSet: ['primary'],
  recommendedSet: ['primary', 'full-size'],
  slots: [
    {
      key: 'primary',
      label: 'Primary Image',
      group: 'Artwork',
      requiredLevel: 'REQUIRED',
      sortOrder: 0,
      aliases: ['primary', 'cover', 'thumbnail', 'preview', 'main image', 'listing image'],
      helpText: 'Compressed preview image shown in listings and browse grids. Required before publishing.',
    },
    {
      key: 'full-size',
      label: 'Full-Size Master',
      group: 'Artwork',
      requiredLevel: 'RECOMMENDED',
      sortOrder: 1,
      aliases: ['full size', 'full-size', 'master', 'original', 'hi-res', 'high resolution'],
      helpText: 'High-resolution original used for delivery to buyers. Strongly recommended.',
    },
    {
      key: 'detail',
      label: 'Detail / Crop',
      group: 'Artwork',
      requiredLevel: 'OPTIONAL',
      sortOrder: 2,
      aliases: ['detail', 'crop', 'closeup', 'close-up', 'zoom'],
      helpText: 'Cropped detail shot highlighting texture or fine detail.',
    },
    {
      key: 'certificate',
      label: 'Certificate of Authenticity',
      group: 'Documentation',
      requiredLevel: 'OPTIONAL',
      sortOrder: 3,
      aliases: ['coa', 'certificate', 'authenticity', 'certificate of authenticity'],
    },
  ],
};

export const digitalArtInventorySchema: CategoryInventorySchema = {
  categoryId: 'DIGITAL_ART',
  schemaVersion: '1.0.0',
  validConditionValues: ['DIGITAL'],

  primaryIdentifier: {
    fieldKey: 'sku',
    label: 'SKU / Asset ID',
  },

  externalIdentifiers: [
    {
      fieldKey: 'editionId',
      label: 'Edition #',
      helpText: 'Edition number within the print run (e.g. "42" for piece 42 of 100). Required for limited editions.',
    },
  ],

  displayFields: {
    browseRow: ['sku', 'title', 'artist', 'priceCents'],
    detailHeader: ['sku', 'editionId', 'title', 'artist', 'series', 'medium', 'editionSize', 'createdYear', 'priceCents'],
  },

  importFields: [
    {
      fieldKey: 'sku', label: 'SKU / Asset ID', kind: 'identifier',
      requiredLevel: 'REQUIRED', displayPriority: 100,
      importAliases: ['sku', 'asset id', 'asset_id', 'internal id', 'internal_id', 'ref', 'stock', 'stock #', 'stock number'],
      validation: { maxLength: 80 },
    },
    {
      fieldKey: 'title', label: 'Title', kind: 'text',
      requiredLevel: 'REQUIRED', displayPriority: 95,
      importAliases: ['title', 'artwork title', 'piece title', 'name', 'work title'],
      validation: { maxLength: 500 },
    },
    {
      fieldKey: 'artist', label: 'Artist', kind: 'text',
      requiredLevel: 'REQUIRED', displayPriority: 90,
      importAliases: ['artist', 'artist name', 'creator', 'author'],
      validation: { maxLength: 200 },
    },
    {
      fieldKey: 'priceCents', label: 'Price', kind: 'currency',
      requiredLevel: 'REQUIRED', displayPriority: 85,
      importAliases: ['price', 'list price', 'sale price', 'retail price'],
      validation: { min: 0, max: 1000000000 },
    },
    {
      fieldKey: 'editionId', label: 'Edition #', kind: 'identifier',
      requiredLevel: 'RECOMMENDED', displayPriority: 80,
      importAliases: ['edition', 'edition #', 'edition number', 'edition_number', 'print number'],
      validation: { maxLength: 40 },
    },
    {
      fieldKey: 'editionSize', label: 'Edition Size', kind: 'number',
      requiredLevel: 'RECOMMENDED', displayPriority: 75,
      importAliases: ['edition size', 'total editions', 'print run', 'run size'],
      validation: { min: 1, max: 999999 },
    },
    {
      fieldKey: 'medium', label: 'Medium', kind: 'text',
      requiredLevel: 'RECOMMENDED', displayPriority: 70,
      importAliases: ['medium', 'media', 'technique', 'type', 'art type'],
      validation: { maxLength: 160 },
    },
    {
      fieldKey: 'series', label: 'Series', kind: 'text',
      requiredLevel: 'OPTIONAL', displayPriority: 65,
      importAliases: ['series', 'collection', 'collection name'],
      validation: { maxLength: 200 },
    },
    {
      fieldKey: 'createdYear', label: 'Year Created', kind: 'number',
      requiredLevel: 'OPTIONAL', displayPriority: 60,
      importAliases: ['year', 'created year', 'year created', 'creation year'],
      validation: { min: 1900, max: 2100 },
    },
  ],

  attributeGroups: [
    {
      key: 'identifiers',
      label: 'Identifiers',
      fieldKeys: ['sku', 'editionId'],
    },
    {
      key: 'content',
      label: 'Artwork',
      fieldKeys: ['title', 'artist', 'series', 'medium', 'createdYear'],
    },
    {
      key: 'edition',
      label: 'Edition & Pricing',
      fieldKeys: ['editionSize', 'priceCents'],
    },
  ],

  readinessRules: [
    { fieldKey: 'title',      severity: 'BLOCKER', message: 'Title is required' },
    { fieldKey: 'artist',     severity: 'BLOCKER', message: 'Artist name is required' },
    { fieldKey: 'priceCents', severity: 'BLOCKER', message: 'Price is required' },
    { fieldKey: 'medium',     severity: 'WARNING', message: 'Medium/technique recommended for listings' },
    { fieldKey: 'editionSize', severity: 'WARNING', message: 'Edition size recommended for limited prints' },
  ],

  mediaGuide: DIGITAL_ART_MEDIA_GUIDE,
};
