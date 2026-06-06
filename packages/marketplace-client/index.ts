/**
 * Marketplace SDK — run `npm run client:generate:marketplace` from repo root after OpenAPI changes.
 * OpenAPI.BASE is empty for same-origin / Vite proxy.
 */
import { OpenAPI } from './generated/core/OpenAPI.js';

OpenAPI.BASE = '';

export { OpenAPI };
export * from './generated/index.js';
