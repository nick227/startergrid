import type { CategoryInventorySchema, MediaGuide } from '../types.js';

export const VIDEO_MEDIA_GUIDE: MediaGuide = {
  categoryId: 'VIDEO_DISTRIBUTION',
  minimumPublishSet: [],
  recommendedSet: ['thumbnail'],
  slots: [
    {
      key: 'thumbnail',
      label: 'Thumbnail',
      group: 'Cover',
      requiredLevel: 'RECOMMENDED',
      sortOrder: 0,
      aliases: ['thumbnail', 'thumb', 'cover', 'preview image', 'poster'],
      helpText: 'Thumbnail shown in browse grids and platform listings.',
    },
    {
      key: 'preview',
      label: 'Preview Clip',
      group: 'Content',
      requiredLevel: 'OPTIONAL',
      sortOrder: 1,
      aliases: ['preview', 'sample', 'clip', 'trailer', 'teaser'],
      helpText: 'Short preview or trailer clip for buyer previews.',
    },
    {
      key: 'banner',
      label: 'Banner / Hero',
      group: 'Promotional',
      requiredLevel: 'OPTIONAL',
      sortOrder: 2,
      aliases: ['banner', 'hero', 'header image', 'channel art'],
    },
  ],
};

export const videoDistributionInventorySchema: CategoryInventorySchema = {
  categoryId: 'VIDEO_DISTRIBUTION',
  schemaVersion: '1.0.0',
  validConditionValues: ['DIGITAL'],

  primaryIdentifier: {
    fieldKey: 'sku',
    label: 'SKU / Video ID',
  },

  displayFields: {
    browseRow: ['sku', 'title', 'creator', 'priceCents'],
    detailHeader: ['sku', 'title', 'creator', 'genre', 'durationSec', 'resolution', 'publishYear', 'priceCents'],
  },

  importFields: [
    {
      fieldKey: 'sku', label: 'SKU / Video ID', kind: 'identifier',
      requiredLevel: 'REQUIRED', displayPriority: 100,
      importAliases: ['sku', 'video id', 'video_id', 'internal id', 'internal_id', 'ref', 'stock', 'stock #', 'stock number'],
      validation: { maxLength: 80 },
    },
    {
      fieldKey: 'title', label: 'Title', kind: 'text',
      requiredLevel: 'REQUIRED', displayPriority: 95,
      importAliases: ['title', 'video title', 'name', 'episode title', 'series title'],
      validation: { maxLength: 500 },
    },
    {
      fieldKey: 'creator', label: 'Creator', kind: 'text',
      requiredLevel: 'REQUIRED', displayPriority: 90,
      importAliases: ['creator', 'creator name', 'channel', 'author', 'director', 'producer'],
      validation: { maxLength: 200 },
    },
    {
      fieldKey: 'priceCents', label: 'Price', kind: 'currency',
      requiredLevel: 'REQUIRED', displayPriority: 85,
      importAliases: ['price', 'list price', 'sale price', 'rental price'],
      validation: { min: 0, max: 100000000 },
    },
    {
      fieldKey: 'genre', label: 'Genre', kind: 'text',
      requiredLevel: 'RECOMMENDED', displayPriority: 80,
      importAliases: ['genre', 'category', 'type', 'content type'],
      validation: { maxLength: 100 },
    },
    {
      fieldKey: 'resolution', label: 'Resolution', kind: 'text',
      requiredLevel: 'RECOMMENDED', displayPriority: 75,
      importAliases: ['resolution', 'video quality', 'quality', 'format'],
      validation: { maxLength: 20 },
    },
    {
      fieldKey: 'durationSec', label: 'Duration (seconds)', kind: 'number',
      requiredLevel: 'OPTIONAL', displayPriority: 70,
      importAliases: ['duration', 'duration seconds', 'length', 'runtime seconds'],
      validation: { min: 1, max: 86400 },
    },
    {
      fieldKey: 'publishYear', label: 'Publish Year', kind: 'number',
      requiredLevel: 'OPTIONAL', displayPriority: 65,
      importAliases: ['year', 'publish year', 'release year'],
      validation: { min: 1900, max: 2100 },
    },
  ],

  attributeGroups: [
    {
      key: 'identifiers',
      label: 'Identifiers',
      fieldKeys: ['sku'],
    },
    {
      key: 'content',
      label: 'Content',
      fieldKeys: ['title', 'creator', 'genre', 'publishYear'],
    },
    {
      key: 'technical',
      label: 'Technical & Pricing',
      fieldKeys: ['resolution', 'durationSec', 'priceCents'],
    },
  ],

  readinessRules: [
    { fieldKey: 'title',      severity: 'BLOCKER', message: 'Title is required' },
    { fieldKey: 'creator',    severity: 'BLOCKER', message: 'Creator name is required' },
    { fieldKey: 'priceCents', severity: 'BLOCKER', message: 'Price is required' },
    { fieldKey: 'resolution', severity: 'WARNING', message: 'Resolution recommended for platform listings' },
  ],

  mediaGuide: VIDEO_MEDIA_GUIDE,
};
