import type { BusinessCategoryId } from '../../../packages/category-schemas/src/index.js';

// Fixture inputs, not a category registry. Capabilities remain in category-schemas.
export const FIXTURE_DATE = new Date('2026-10-01T12:00:00Z');
export const FIXTURE_PASSWORD = 'local-multi-entity-only';
export const MULTI_ENTITY_BUSINESSES = [
  { key: 'books', category: 'EBOOKS', name: 'Harbor Books', items: [
    { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', format: 'Paperback', priceCents: 1200 },
    { title: 'Frankenstein', author: 'Mary Shelley', isbn: '9780141439471', format: 'Paperback', priceCents: 1400 },
  ] },
  { key: 'records', category: 'SONGS', name: 'Harbor Records', items: [
    { title: 'Harbor Sessions', artist: 'Demo Quartet', format: 'Vinyl LP', catalogNumber: 'DG-LP-001', priceCents: 2400 },
    { title: 'Night Ferry', artist: 'Demo Trio', format: 'CD', catalogNumber: 'DG-CD-002', priceCents: 1000 },
  ] },
  { key: 'vintage', category: 'APPAREL', name: 'Harbor Vintage', items: [
    { title: 'Denim jacket', brand: 'Demo Vintage', size: 'M', year: 1990, priceCents: 6500 },
    { title: 'Wool coat', brand: 'Demo Vintage', size: 'L', year: 1985, priceCents: 9500 },
  ] },
  { key: 'marine', category: 'BOATS', name: 'Harbor Marine', items: [
    { title: 'Coastal 210', make: 'Demo Marine', hin: 'DGM00001A424', year: 2024, hours: 80, priceCents: 4250000 },
    { title: 'Bay 180', make: 'Demo Marine', hin: 'DGM00002B323', year: 2023, hours: 150, priceCents: 2850000 },
  ] },
] satisfies { key: string; category: BusinessCategoryId; name: string; items: Record<string, string | number>[] }[];

export function assertLocalFixtureEnvironment(env: NodeJS.ProcessEnv): void {
  if (env.NODE_ENV !== 'development' || env.DEALERGRID_MULTI_ENTITY_SEED !== '1') {
    throw new Error('Requires NODE_ENV=development and DEALERGRID_MULTI_ENTITY_SEED=1');
  }
  const url = new URL(env.DATABASE_URL ?? '');
  if (!['mysql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Multi-entity fixtures require a local MySQL database');
  }
}
